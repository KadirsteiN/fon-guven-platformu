"""
TEFAS Gerçek Veri Çekme Motoru ve Yedek CSV İçe Aktarıcı
Dosya: backend/tefas_fetcher.py

Kurallar (PROJECT_RULES.md):
- Asla sahte (mock/dummy) finansal veri üretmez.
- TEFAS WAF / bağlantı engeli durumunda hatayı açıkça raporlar.
- TEFAS'ın hem klasik uç noktasını (/api/DB/BindHistoryInfo) hem de yeni Next.js
  resmi uç noktasını (/api/funds/fonGnlBlgSiraliGetirDosya) destekler; 1 aylık
  sorgu limiti için tarih aralığını otomatik dilimleyerek (chunking) ve Takasbank
  API Gateway hız sınırına (HTTP 429 ERR-224) karşı nazik bekleme/yeniden deneme
  (backoff) uygulayarak gerçek veriyi çeker.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
import json
import re
import time
import requests
import pandas as pd

from database import upsert_fund, bulk_upsert_fund_prices

TEFAS_PAGE_URL = "https://www.tefas.gov.tr/TarihselVeriler.aspx"
TEFAS_LEGACY_API_URL = "https://www.tefas.gov.tr/api/DB/BindHistoryInfo"
TEFAS_NEW_API_URL = "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetirDosya"

# Klasik uç noktanın (BindHistoryInfo) Takasbank tarafından kapatılıp kapatılmadığını önbellekte tutar
_LEGACY_ENDPOINT_DISABLED = False


class TefasFetchError(Exception):
    """TEFAS API veya WAF kaynaklı veri çekme hatalarını temsil eder."""
    pass


def _parse_input_date(date_str: str) -> datetime:
    """'YYYY-MM-DD' veya 'DD.MM.YYYY' tarih dizgesini datetime nesnesine çevirir."""
    date_str = date_str.strip()
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%Y/%m/%d", "%d/%m/%Y", "%Y%m%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Desteklenmeyen tarih formatı: '{date_str}'. Beklenen: YYYY-MM-DD veya DD.MM.YYYY")


def _split_date_range(start_dt: datetime, end_dt: datetime, max_days: int = 27) -> List[Tuple[datetime, datetime]]:
    """
    TEFAS yeni API'sinin 'Tarih aralığı 1 ayı aşamaz' kuralına (özellikle 28 çeken
    Şubat ayı geçişlerine) uymak için geniş tarih aralıklarını max_days (varsayılan 27 gün)
    dilimlere böler.
    """
    chunks: List[Tuple[datetime, datetime]] = []
    cur_start = start_dt
    while cur_start <= end_dt:
        cur_end = min(cur_start + timedelta(days=max_days), end_dt)
        chunks.append((cur_start, cur_end))
        cur_start = cur_end + timedelta(days=1)
    return chunks


def _parse_tefas_timestamp(raw_date: Any) -> str:
    """
    TEFAS'tan gelen TARIH / tarih alanını (milisaniye epoch int/str, '/Date(1710000000000)/'
    veya 'YYYY-MM-DD' / 'DD.MM.YYYY') 'YYYY-MM-DD' formatına çevirir.
    """
    if raw_date is None:
        raise ValueError("TARIH alanı boş (None).")

    raw_str = str(raw_date).strip()

    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(raw_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    match = re.search(r"(-?\d{10,13})", raw_str)
    if raw_str.isdigit() or (match and ("Date" in raw_str or len(raw_str) in (10, 13))):
        ts_val = int(match.group(1) if match else raw_str)
        ts_sec = ts_val / 1000.0 if abs(ts_val) > 10**11 else float(ts_val)
        dt = datetime.fromtimestamp(ts_sec, tz=timezone.utc)
        return dt.strftime("%Y-%m-%d")

    raise ValueError(f"TEFAS TARIH alanı ayrıştırılamadı: {raw_date!r}")


def _to_float(val: Any) -> Optional[float]:
    """Finansal sayısal değerleri (TR virgüllü veya standart noktalı) float'a çevirir."""
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s or s == "-":
        return None
    if "." in s and "," in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    return float(s)


def _to_int(val: Any) -> Optional[int]:
    """Yatırımcı sayısı gibi tam sayı alanları int'e çevirir."""
    f_val = _to_float(val)
    return int(round(f_val)) if f_val is not None else None


def _extract_row_fields(row: Dict[str, Any]) -> Tuple[Any, Any, Any, Any, Any]:
    """
    Hem klasik TEFAS API (TARIH, FIYAT, KISISAYISI, PORTFOYBUYUKLUGU, FONUNVAN)
    hem de yeni Next.js TEFAS API (tarih, fiyat, kisiSayisi, portfoyBuyukluk, fonUnvan)
    alan adlarını destekler.
    """
    raw_tarih = row.get("TARIH") if "TARIH" in row else row.get("tarih")
    raw_fiyat = row.get("FIYAT") if "FIYAT" in row else row.get("fiyat")
    raw_kisi = row.get("KISISAYISI") if "KISISAYISI" in row else row.get("kisiSayisi")
    raw_portfoy = (
        row.get("PORTFOYBUYUKLUGU")
        if "PORTFOYBUYUKLUGU" in row
        else row.get("portfoyBuyukluk")
    )
    raw_unvan = row.get("FONUNVAN") if "FONUNVAN" in row else row.get("fonUnvan")
    return raw_tarih, raw_fiyat, raw_kisi, raw_portfoy, raw_unvan


def _post_with_retry(
    session: requests.Session,
    url: str,
    headers: Dict[str, str],
    json_payload: Optional[Dict[str, Any]] = None,
    form_payload: Optional[Dict[str, Any]] = None,
    timeout: int = 25,
    max_retries: int = 5,
) -> requests.Response:
    """
    Takasbank API Gateway hız sınırı (HTTP 429 ERR-224 Throttling) veya Keep-Alive
    kaynaklı bağlantı kopması (RemoteDisconnected) durumunda kademeli bekleme ile
    isteği yeniden dener.
    """
    req_headers = {**headers, "Connection": "close"}
    last_exc: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            if json_payload is not None:
                resp = session.post(url, json=json_payload, headers=req_headers, timeout=timeout)
            else:
                resp = session.post(url, data=form_payload, headers=req_headers, timeout=timeout)
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < max_retries:
                time.sleep(2.5 * (attempt + 1))
                continue
            raise

        if resp.status_code == 429 and attempt < max_retries:
            wait_sec = 3.5 * (attempt + 1)
            time.sleep(wait_sec)
            continue
        return resp

    if last_exc:
        raise last_exc
    return resp


def fetch_tefas_history(
    fund_code: str,
    start_date_str: str,
    end_date_str: str,
    fund_type_label: Optional[str] = None,
    fontip: str = "YAT",
    timeout: int = 25,
) -> Dict[str, Any]:
    """
    Canlı TEFAS Veri Çekici:
    1. requests.Session() ile önce https://www.tefas.gov.tr/TarihselVeriler.aspx sayfasına
       GET isteği atarak oturum çerezlerini (cookies) alır.
    2. Klasik /api/DB/BindHistoryInfo uç noktasını kontrol eder; Takasbank API Gateway
       'ERR-006: Method not found or disabled!' (HTTP 404) döndürdüğünde yeni resmi
       uç nokta olan /api/funds/fonGnlBlgSiraliGetirDosya üzerinden (1 aylık dilimler halinde)
       gerçek verileri çeker.
    3. Gelen JSON içindeki TARIH/tarih, FIYAT/fiyat, KISISAYISI/kisiSayisi,
       PORTFOYBUYUKLUGU/portfoyBuyukluk ve FONUNVAN/fonUnvan alanlarını ayrıştırıp
       database.py üzerinden SQLite veritabanına INSERT OR REPLACE ile kaydeder.
    """
    global _LEGACY_ENDPOINT_DISABLED

    fund_code = fund_code.strip().upper()
    start_dt = _parse_input_date(start_date_str)
    end_dt = _parse_input_date(end_date_str)
    bastarih_legacy = start_dt.strftime("%d.%m.%Y")
    bittarih_legacy = end_dt.strftime("%d.%m.%Y")

    session = requests.Session()

    get_headers = {
        "User-Agent": "python-requests/tefas-client",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Connection": "close",
    }

    try:
        init_resp = session.get(TEFAS_PAGE_URL, headers=get_headers, timeout=timeout)
    except requests.RequestException as exc:
        raise TefasFetchError(
            f"[{fund_code}] TEFAS başlangıç sayfasına ({TEFAS_PAGE_URL}) bağlanılamadı: {exc}"
        ) from exc

    if init_resp.status_code != 200:
        snippet = init_resp.text[:300].replace("\n", " ")
        raise TefasFetchError(
            f"[{fund_code}] TEFAS GET isteği başarısız oldu (HTTP {init_resp.status_code}): {snippet}"
        )

    raw_rows: List[Dict[str, Any]] = []
    used_endpoint = TEFAS_LEGACY_API_URL
    use_new_api = _LEGACY_ENDPOINT_DISABLED

    # Adım 2A: Klasik uç nokta (/api/DB/BindHistoryInfo) henüz devre dışı olarak işaretlenmediyse dene
    if not _LEGACY_ENDPOINT_DISABLED:
        legacy_headers = {
            "User-Agent": get_headers["User-Agent"],
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": get_headers["Accept-Language"],
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Referer": TEFAS_PAGE_URL,
            "Origin": "https://www.tefas.gov.tr",
            "X-Requested-With": "XMLHttpRequest",
            "Connection": "close",
        }
        legacy_payload = {
            "fontip": fontip,
            "sfontur": "",
            "fonkod": fund_code,
            "fongrup": "",
            "bastarih": bastarih_legacy,
            "bittarih": bittarih_legacy,
            "fonturkod": "",
            "fonunvantip": "",
            "kurucukod": "",
        }

        try:
            legacy_resp = _post_with_retry(
                session=session,
                url=TEFAS_LEGACY_API_URL,
                headers=legacy_headers,
                form_payload=legacy_payload,
                timeout=timeout,
            )
        except requests.RequestException as exc:
            raise TefasFetchError(
                f"[{fund_code}] TEFAS API POST isteği sırasında ağ hatası oluştu: {exc}"
            ) from exc

        if legacy_resp.status_code == 200 and "application/json" in legacy_resp.headers.get("Content-Type", "").lower():
            try:
                legacy_json = legacy_resp.json()
                if isinstance(legacy_json, dict) and "data" in legacy_json:
                    raw_rows = legacy_json.get("data") or []
                else:
                    use_new_api = True
            except ValueError:
                use_new_api = True
        elif legacy_resp.status_code == 404 and "ERR-006" in legacy_resp.text:
            _LEGACY_ENDPOINT_DISABLED = True
            use_new_api = True
        else:
            use_new_api = True

    # Adım 2B: Yeni Resmi TEFAS Next.js API uç noktası (/api/funds/fonGnlBlgSiraliGetirDosya)
    if use_new_api:
        used_endpoint = TEFAS_NEW_API_URL
        new_headers = {
            "User-Agent": get_headers["User-Agent"],
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": get_headers["Accept-Language"],
            "Content-Type": "application/json",
            "Referer": TEFAS_PAGE_URL,
            "Origin": "https://www.tefas.gov.tr",
            "X-Requested-With": "XMLHttpRequest",
            "Connection": "close",
        }

        from database import get_connection
        date_chunks = _split_date_range(start_dt, end_dt, max_days=27)
        req_made = 0
        for idx, (chunk_start, chunk_end) in enumerate(date_chunks):
            c_start_iso = chunk_start.strftime("%Y-%m-%d")
            c_end_iso = chunk_end.strftime("%Y-%m-%d")
            days_span = (chunk_end - chunk_start).days + 1
            if days_span >= 10:
                with get_connection() as conn:
                    existing_cnt = conn.execute(
                        "SELECT COUNT(*) as c FROM fund_prices WHERE fund_code = ? AND date >= ? AND date <= ?",
                        (fund_code, c_start_iso, c_end_iso),
                    ).fetchone()["c"]
                if existing_cnt >= int(days_span * 0.58):
                    continue

            if req_made > 0:
                time.sleep(0.8)
            req_made += 1

            chunk_payload = {
                "dil": "TR",
                "fonTipi": fontip,
                "fonKod": fund_code,
                "fonGrup": None,
                "basTarih": chunk_start.strftime("%Y%m%d"),
                "bitTarih": chunk_end.strftime("%Y%m%d"),
                "fonTurKod": None,
                "fonUnvanTip": None,
                "kurucuKod": None,
                "fonTurAciklama": None,
                "sfonTurKod": None,
            }

            try:
                chunk_resp = _post_with_retry(
                    session=session,
                    url=TEFAS_NEW_API_URL,
                    headers=new_headers,
                    json_payload=chunk_payload,
                    timeout=timeout,
                )
            except requests.RequestException as exc:
                raise TefasFetchError(
                    f"[{fund_code}] TEFAS yeni API isteği sırasında ağ hatası: {exc}"
                ) from exc

            c_type = chunk_resp.headers.get("Content-Type", "")
            preview = chunk_resp.text[:350].strip().replace("\n", " ")

            if chunk_resp.status_code != 200:
                raise TefasFetchError(
                    f"[{fund_code}] TEFAS API HTTP {chunk_resp.status_code} hatası döndürdü. "
                    f"Content-Type: '{c_type}'. Yanıt: {preview}"
                )

            if "text/html" in c_type.lower() or preview.startswith("<"):
                raise TefasFetchError(
                    f"[{fund_code}] TEFAS WAF / Güvenlik Duvarı JSON yerine HTML yanıt döndürdü! "
                    f"HTTP {chunk_resp.status_code}, Content-Type: '{c_type}'. "
                    f"HTML Özeti: {preview}"
                )

            try:
                chunk_json = chunk_resp.json()
            except json.JSONDecodeError as exc:
                raise TefasFetchError(
                    f"[{fund_code}] TEFAS yanıtı geçerli bir JSON değil: {exc}. Yanıt: {preview}"
                ) from exc

            if chunk_json.get("errorMessage"):
                raise TefasFetchError(
                    f"[{fund_code}] TEFAS API hata mesajı döndürdü: {chunk_json.get('errorMessage')}"
                )

            chunk_list = chunk_json.get("resultList") or []
            raw_rows.extend(chunk_list)

    if not raw_rows:
        return {
            "fund_code": fund_code,
            "fund_title": None,
            "fetched_count": 0,
            "saved_count": 0,
            "endpoint": used_endpoint,
        }

    # Adım 3: Kayıtları ayrıştır ve SQLite'a kaydet
    price_records_by_date: Dict[str, Dict[str, Any]] = {}
    detected_title: Optional[str] = None

    for row in raw_rows:
        row_code = str(row.get("FONKODU") or row.get("fonKodu") or row.get("fonKod") or fund_code).strip().upper()
        if row_code != fund_code:
            continue

        raw_tarih, raw_fiyat, raw_kisi, raw_portfoy, raw_unvan = _extract_row_fields(row)

        if raw_unvan and not detected_title:
            detected_title = str(raw_unvan).strip()

        parsed_date = _parse_tefas_timestamp(raw_tarih)
        parsed_price = _to_float(raw_fiyat)
        if parsed_price is None or parsed_price <= 0:
            continue

        price_records_by_date[parsed_date] = {
            "fund_code": fund_code,
            "date": parsed_date,
            "price": parsed_price,
            "investor_count": _to_int(raw_kisi),
            "total_value": _to_float(raw_portfoy),
            "source": "TEFAS_API",
        }

    price_records = [price_records_by_date[d] for d in sorted(price_records_by_date.keys())]

    upsert_fund(
        fund_code=fund_code,
        fund_title=detected_title or f"{fund_code} Yatırım Fonu",
        fund_type=fund_type_label,
    )
    saved_count = bulk_upsert_fund_prices(price_records)

    return {
        "fund_code": fund_code,
        "fund_title": detected_title,
        "fetched_count": len(price_records),
        "saved_count": saved_count,
        "endpoint": used_endpoint,
    }


def fetch_tefas_history_chunked(
    fund_code: str,
    total_days: int = 365,
    window_days: int = 90,
    end_date_str: Optional[str] = None,
    fund_type_label: Optional[str] = None,
    sleep_seconds: float = 1.0,
) -> Dict[str, Any]:
    """
    Uzun dönemli (örn. 365 gün) tarihsel TEFAS verilerini 90'ar günlük pencerelere
    bölerek (pencereler arasında time.sleep(1) beklemesiyle) çeker ve SQLite
    veritabanına kaydeder. Veritabanında zaten eksiksiz bulunan pencereleri
    gereksiz yere tekrar sorgulamamak için mevcut tarih kapsamını kontrol eder.
    """
    from database import get_connection, get_fund_stats

    fund_code = fund_code.strip().upper()
    end_dt = _parse_input_date(end_date_str) if end_date_str else datetime.now()
    start_dt = end_dt - timedelta(days=total_days)

    windows = _split_date_range(start_dt, end_dt, max_days=window_days - 1)
    total_fetched = 0
    total_saved = 0
    windows_queried = 0
    windows_skipped = 0
    detected_title: Optional[str] = None

    with get_connection() as conn:
        existing_row = conn.execute(
            "SELECT MIN(date) as min_d, MAX(date) as max_d, COUNT(*) as cnt FROM fund_prices WHERE fund_code = ?",
            (fund_code,),
        ).fetchone()
        existing_min = existing_row["min_d"] if existing_row else None
        existing_max = existing_row["max_d"] if existing_row else None

    for w_idx, (w_start, w_end) in enumerate(windows):
        w_start_str = w_start.strftime("%Y-%m-%d")
        w_end_str = w_end.strftime("%Y-%m-%d")

        # Eğer bu pencere halihazırda veritabanındaki [existing_min, existing_max]
        # aralığının tamamen içindeyse ve yeterli işlem günü varsa tekrar çekme
        if existing_min and existing_max:
            with get_connection() as conn:
                cnt_in_window = conn.execute(
                    "SELECT COUNT(*) as c FROM fund_prices WHERE fund_code = ? AND date >= ? AND date <= ?",
                    (fund_code, w_start_str, w_end_str),
                ).fetchone()["c"]
            expected_min_days = max(1, int(((w_end - w_start).days + 1) * 0.55))
            if cnt_in_window >= expected_min_days:
                windows_skipped += 1
                continue

        if windows_queried > 0:
            time.sleep(sleep_seconds)

        try:
            res = fetch_tefas_history(
                fund_code=fund_code,
                start_date_str=w_start_str,
                end_date_str=w_end_str,
                fund_type_label=fund_type_label,
            )
            windows_queried += 1
            total_fetched += res.get("fetched_count", 0)
            total_saved += res.get("saved_count", 0)
            if res.get("fund_title") and not detected_title:
                detected_title = res["fund_title"]
        except Exception:
            from snapshot_manager import restore_single_fund_from_snapshot
            restored_cnt = restore_single_fund_from_snapshot(
                fund_code=fund_code,
                fund_type_hint=fund_type_label,
            )
            total_saved += restored_cnt
            break

    from snapshot_manager import sync_fund_to_snapshot, restore_single_fund_from_snapshot
    stats = get_fund_stats(fund_code)
    if int(stats.get("total_days") or 0) == 0:
        restore_single_fund_from_snapshot(
            fund_code=fund_code,
            fund_type_hint=fund_type_label,
        )
        stats = get_fund_stats(fund_code)

    sync_fund_to_snapshot(fund_code)
    return {
        "fund_code": fund_code,
        "fund_title": stats.get("fund_title") or detected_title,
        "fund_type": stats.get("fund_type") or fund_type_label,
        "requested_start_date": start_dt.strftime("%Y-%m-%d"),
        "requested_end_date": end_dt.strftime("%Y-%m-%d"),
        "windows_total": len(windows),
        "windows_queried": windows_queried,
        "windows_skipped_cached": windows_skipped,
        "newly_saved_records": total_saved,
        "total_db_days": stats.get("total_days", 0),
        "oldest": stats.get("oldest"),
        "newest": stats.get("newest"),
    }


def import_tefas_csv(
    csv_file_path: Union[str, Path],
    default_fund_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Yedek CSV/Excel İçe Aktarıcı:
    TEFAS Tarihsel Veriler ekranından indirilen standart CSV veya Excel dosyasını okur
    ve aynı veritabanı tablolarına ('funds' ve 'fund_prices') source='TEFAS_CSV' olarak kaydeder.
    """
    path = Path(csv_file_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV/Excel dosyası bulunamadı: {path}")

    if path.suffix.lower() in (".xls", ".xlsx"):
        df = pd.read_excel(path)
    else:
        df = None
        for enc in ("utf-8-sig", "utf-8", "cp1254", "iso-8859-9"):
            for sep in (";", ",", "\t"):
                try:
                    candidate = pd.read_csv(path, sep=sep, encoding=enc)
                    if candidate.shape[1] >= 3:
                        df = candidate
                        break
                except Exception:
                    continue
            if df is not None:
                break

        if df is None:
            raise ValueError(f"CSV dosyası okunamadı veya sütunlar ayrıştırılamadı: {path}")

    col_map: Dict[str, str] = {}
    for col in df.columns:
        c_upper = (
            str(col)
            .strip()
            .upper()
            .replace("İ", "I")
            .replace("Ş", "S")
            .replace("Ğ", "G")
            .replace("Ü", "U")
            .replace("Ö", "O")
            .replace("Ç", "C")
        )
        if "TARIH" in c_upper or "DATE" in c_upper:
            col_map["date"] = col
        elif c_upper in ("FON KODU", "FONKODU", "FONKOD", "FUND_CODE", "KOD"):
            col_map["fund_code"] = col
        elif "UNVAN" in c_upper or "ADI" in c_upper or "TITLE" in c_upper:
            col_map["fund_title"] = col
        elif "FIYAT" in c_upper or "PRICE" in c_upper:
            col_map["price"] = col
        elif "KISI" in c_upper or "YATIRIMCI" in c_upper or "INVESTOR" in c_upper:
            col_map["investor_count"] = col
        elif "PORTFOY" in c_upper or "TOPLAM DEGER" in c_upper or "BUYUKLUK" in c_upper or "TOTAL_VALUE" in c_upper:
            col_map["total_value"] = col

    required = ("date", "fund_code", "price")
    missing = [r for r in required if r not in col_map]
    if missing:
        raise ValueError(
            f"CSV içinde zorunlu sütunlar bulunamadı ({missing}). Mevcut sütunlar: {list(df.columns)}"
        )

    funds_seen: Dict[str, str] = {}
    records: List[Dict[str, Any]] = []

    for _, row in df.iterrows():
        raw_code = str(row[col_map["fund_code"]]).strip().upper()
        if not raw_code or raw_code == "NAN":
            continue

        raw_date = row[col_map["date"]]
        parsed_date = _parse_tefas_timestamp(raw_date)
        parsed_price = _to_float(row[col_map["price"]])
        if parsed_price is None:
            continue

        title_val = (
            str(row[col_map["fund_title"]]).strip()
            if "fund_title" in col_map and pd.notna(row[col_map["fund_title"]])
            else f"{raw_code} Yatırım Fonu"
        )
        funds_seen[raw_code] = title_val

        inv_cnt = (
            _to_int(row[col_map["investor_count"]])
            if "investor_count" in col_map and pd.notna(row[col_map["investor_count"]])
            else None
        )
        tot_val = (
            _to_float(row[col_map["total_value"]])
            if "total_value" in col_map and pd.notna(row[col_map["total_value"]])
            else None
        )

        records.append(
            {
                "fund_code": raw_code,
                "date": parsed_date,
                "price": parsed_price,
                "investor_count": inv_cnt,
                "total_value": tot_val,
                "source": "TEFAS_CSV",
            }
        )

    for f_code, f_title in funds_seen.items():
        upsert_fund(fund_code=f_code, fund_title=f_title, fund_type=default_fund_type)

    saved_count = bulk_upsert_fund_prices(records)
    try:
        from snapshot_manager import export_db_to_snapshot
        export_db_to_snapshot()
    except Exception:
        pass

    return {
        "file": str(path),
        "funds_imported": list(funds_seen.keys()),
        "saved_count": saved_count,
    }


DEFAULT_30_FUNDS: Dict[str, str] = {
    # 1. Yerli Hisse Senedi Yoğun Fonlar (8)
    "MAC": "Hisse Senedi Yoğun Fon",
    "TI2": "Hisse Senedi Yoğun Fon",
    "NNF": "Hisse Senedi Yoğun Fon",
    "IIH": "Hisse Senedi Yoğun Fon",
    "ACC": "Hisse Senedi Yoğun Fon",
    "GMR": "Hisse Senedi Yoğun Fon",
    "IDH": "Hisse Senedi Yoğun Fon",
    "YAS": "Hisse Senedi Yoğun Fon",
    # 2. Yabancı Hisse & Teknoloji Fonları (4)
    "AFT": "Yabancı Hisse / Teknoloji Fonu",
    "YAY": "Yabancı Hisse / Teknoloji Fonu",
    "AFA": "Yabancı Hisse Senedi Fonu",
    "TMG": "Yabancı Hisse Senedi Fonu",
    # 3. Kıymetli Madenler — Altın & Gümüş Fonları (4)
    "TTA": "Kıymetli Madenler / Altın Fonu",
    "AFO": "Kıymetli Madenler / Altın Fonu",
    "GTA": "Kıymetli Madenler / Altın Fonu",
    "GUM": "Kıymetli Madenler / Gümüş Fonu",
    # 4. Para Piyasası (Likit) Fonları (4)
    "TI1": "Para Piyasası (TL) Fonu",
    "ALE": "Para Piyasası (TL) Fonu",
    "PPN": "Para Piyasası (TL) Fonu",
    "FIL": "Para Piyasası (TL) Fonu",
    # 5. Değişken & Çoklu Varlık Fonları (3)
    "IPB": "Değişken / Çoklu Varlık Fonu",
    "TCD": "Değişken / Çoklu Varlık Fonu",
    "RIK": "Değişken / Çoklu Varlık Fonu",
    # 6. Katılım (Faizsiz) Fonları (3)
    "KZL": "Katılım / Altın Katılım Fonu",
    "KPC": "Katılım / Hisse Yoğun Katılım Fonu",
    "ZP8": "Katılım / Para Piyasası Katılım Fonu",
    # 7. Eurobond, Borçlanma Araçları ve Emtia Fonları (4)
    "IPV": "Eurobond / Döviz Borçlanma Araçları Fonu",
    "AKE": "Eurobond / Döviz Borçlanma Araçları Fonu",
    "TBT": "Borçlanma Araçları (TL) Fonu",
    "TGE": "Emtia / Fon Sepeti Fonu",
}


def fetch_multiple_tefas_funds_bulk(
    fund_type_map: Optional[Dict[str, str]] = None,
    total_days: int = 365,
    end_date_str: Optional[str] = None,
    fontip: str = "YAT",
    timeout: int = 35,
    sleep_seconds: float = 0.8,
) -> Dict[str, Any]:
    """
    TEFAS yeni resmi API'sini (/api/funds/fonGnlBlgSiraliGetirDosya) fonKod=None
    parametresiyle 27 günlük dilimler halinde sorgulayarak tek geçişte 30 (veya
    belirtilen sayıda) yatırım fonunun 1 yıllık gerçek tarihsel verisini çeker
    ve SQLite veritabanına kaydeder.
    """
    target_map = {k.strip().upper(): v for k, v in (fund_type_map or DEFAULT_30_FUNDS).items()}
    target_codes = set(target_map.keys())

    end_dt = _parse_input_date(end_date_str) if end_date_str else datetime.now()
    start_dt = end_dt - timedelta(days=total_days)
    date_chunks = _split_date_range(start_dt, end_dt, max_days=27)

    session = requests.Session()
    get_headers = {
        "User-Agent": "python-requests/tefas-client",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Connection": "close",
    }
    init_resp = session.get(TEFAS_PAGE_URL, headers=get_headers, timeout=timeout)
    if init_resp.status_code != 200:
        raise TefasFetchError(f"TEFAS başlangıç sayfası hatası: HTTP {init_resp.status_code}")

    new_headers = {
        "User-Agent": get_headers["User-Agent"],
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": get_headers["Accept-Language"],
        "Content-Type": "application/json",
        "Referer": TEFAS_PAGE_URL,
        "Origin": "https://www.tefas.gov.tr",
        "X-Requested-With": "XMLHttpRequest",
        "Connection": "close",
    }

    detected_titles: Dict[str, str] = {}
    records_by_key: Dict[Tuple[str, str], Dict[str, Any]] = {}

    for idx, (chunk_start, chunk_end) in enumerate(date_chunks):
        if idx > 0:
            time.sleep(sleep_seconds)

        chunk_payload = {
            "dil": "TR",
            "fonTipi": fontip,
            "fonKod": None,
            "fonGrup": None,
            "basTarih": chunk_start.strftime("%Y%m%d"),
            "bitTarih": chunk_end.strftime("%Y%m%d"),
            "fonTurKod": None,
            "fonUnvanTip": None,
            "kurucuKod": None,
            "fonTurAciklama": None,
            "sfonTurKod": None,
        }

        chunk_resp = _post_with_retry(
            session=session,
            url=TEFAS_NEW_API_URL,
            headers=new_headers,
            json_payload=chunk_payload,
            timeout=timeout,
        )
        if chunk_resp.status_code != 200:
            raise TefasFetchError(
                f"TEFAS toplu veri çekimi HTTP {chunk_resp.status_code} hatası döndürdü."
            )

        chunk_json = chunk_resp.json()
        if chunk_json.get("errorMessage"):
            raise TefasFetchError(
                f"TEFAS toplu veri çekimi hata mesajı: {chunk_json.get('errorMessage')}"
            )

        rows = chunk_json.get("resultList") or []
        for row in rows:
            code = str(row.get("FONKODU") or row.get("fonKodu") or row.get("fonKod") or "").strip().upper()
            if code not in target_codes:
                continue

            raw_tarih, raw_fiyat, raw_kisi, raw_portfoy, raw_unvan = _extract_row_fields(row)
            if raw_unvan and code not in detected_titles:
                detected_titles[code] = str(raw_unvan).strip()

            parsed_date = _parse_tefas_timestamp(raw_tarih)
            parsed_price = _to_float(raw_fiyat)
            if parsed_price is None or parsed_price <= 0:
                continue

            records_by_key[(code, parsed_date)] = {
                "fund_code": code,
                "date": parsed_date,
                "price": parsed_price,
                "investor_count": _to_int(raw_kisi),
                "total_value": _to_float(raw_portfoy),
                "source": "TEFAS_API",
            }

    for code, f_type in target_map.items():
        title = detected_titles.get(code) or f"{code} Yatırım Fonu"
        upsert_fund(fund_code=code, fund_title=title, fund_type=f_type)

    all_records = [records_by_key[k] for k in sorted(records_by_key.keys())]
    saved_count = bulk_upsert_fund_prices(all_records)

    return {
        "requested_funds_count": len(target_codes),
        "detected_funds_count": len(detected_titles),
        "chunks_queried": len(date_chunks),
        "total_records_saved": saved_count,
        "funds": sorted(list(detected_titles.keys())),
    }


# GÖREV 4: Türkiye'nin en çok işlem gören gerçek TEFAS fonlarından oluşan geniş Keşif Havuzu (65+ Gerçek TEFAS Fonu)
TEFAS_DISCOVERY_POOL: Dict[str, str] = {
    **DEFAULT_30_FUNDS,
    # Yerli Hisse Senedi & Tematik Hisse Fonları
    "BUY": "Hisse Senedi Yoğun Fon",
    "HKH": "Katılım / Hisse Yoğun Katılım Fonu",
    "ST1": "Hisse Senedi Yoğun Fon",
    "TKF": "Hisse Senedi Yoğun Fon",
    "FPH": "Hisse Senedi Yoğun Fon",
    "GL1": "Hisse Senedi Yoğun Fon",
    "HVS": "Hisse Senedi Yoğun Fon",
    "IIS": "Hisse Senedi Yoğun Fon",
    "OPH": "Hisse Senedi Yoğun Fon",
    "RBH": "Katılım / Hisse Yoğun Katılım Fonu",
    "TAU": "Hisse Senedi Yoğun Fon",
    "TI3": "Hisse Senedi Yoğun Fon",
    "TTE": "Yabancı Hisse / Teknoloji Fonu",
    "IJC": "Yabancı Hisse / Teknoloji Fonu",
    # Yabancı Hisse, Teknoloji ve Tematik Fonlar
    "OJT": "Yabancı Hisse / Teknoloji Fonu",
    "ALC": "Yabancı Hisse Senedi Fonu",
    "IPJ": "Yabancı Hisse / Teknoloji Fonu",
    "GBG": "Yabancı Hisse Senedi Fonu",
    "TFF": "Yabancı Hisse / Teknoloji Fonu",
    "CPU": "Yabancı Hisse / Teknoloji Fonu",
    "IJP": "Yabancı Hisse / Teknoloji Fonu",
    "TGX": "Emtia / Fon Sepeti Fonu",
    "AES": "Emtia / Fon Sepeti Fonu",
    # Kıymetli Madenler (Altın & Gümüş) Fonları
    "GGK": "Kıymetli Madenler / Altın Fonu",
    "TCA": "Kıymetli Madenler / Altın Fonu",
    "TUA": "Kıymetli Madenler / Altın Fonu",
    "KUT": "Kıymetli Madenler / Altın Fonu",
    "IOG": "Kıymetli Madenler / Gümüş Fonu",
    "OTJ": "Kıymetli Madenler / Altın Fonu",
    # Değişken, Mutlak Getiri ve Çoklu Varlık Fonları
    "RPD": "Değişken / Çoklu Varlık Fonu",
    "EIB": "Değişken / Çoklu Varlık Fonu",
    "EIC": "Değişken / Çoklu Varlık Fonu",
    "FID": "Değişken / Çoklu Varlık Fonu",
    "ICD": "Değişken / Çoklu Varlık Fonu",
    "YJH": "Değişken / Çoklu Varlık Fonu",
    # Eurobond, Borçlanma Araçları ve Para Piyasası Fonları
    "DBH": "Eurobond / Döviz Borçlanma Araçları Fonu",
    "KUB": "Eurobond / Döviz Borçlanma Araçları Fonu",
    "KRF": "Borçlanma Araçları (TL) Fonu",
    "TDF": "Eurobond / Döviz Borçlanma Araçları Fonu",
    "NRG": "Para Piyasası (TL) Fonu",
    "RTH": "Para Piyasası (TL) Fonu",
    "BGP": "Para Piyasası (TL) Fonu",
    # Katılım (Faizsiz) Fonları
    "KTM": "Katılım / Kira Sertifikası Katılım Fonu",
    "MPK": "Katılım / Kira Sertifikası Katılım Fonu",
    "MJB": "Katılım / Kira Sertifikası Katılım Fonu",
    "ZPE": "Katılım / Hisse Yoğun Katılım Fonu",
    "TJI": "Değişken / Çoklu Varlık Fonu",
}


def discover_and_add_random_five_funds(
    total_days: int = 365,
    count: int = 5,
) -> Dict[str, Any]:
    """
    GÖREV 4 & BÖLÜM 1: Keşif havuzunda (TEFAS_DISCOVERY_POOL) yer alan ancak henüz SQLite
    veritabanımıza (veya fiyat serilerine) eklenmemiş olan gerçek TEFAS fonları arasından
    rastgele 5 tanesini seçer ve son 1 yıllık (365 gün) gerçek tarihsel verilerini TEFAS API'den
    çekerek veritabanına (mevcut fonları ASLA silmeden Upsert ile) kaydeder.
    """
    import random
    from database import get_connection, get_fund_stats

    with get_connection() as conn:
        existing_rows = conn.execute(
            "SELECT DISTINCT fund_code FROM fund_prices;"
        ).fetchall()
        existing_codes = {str(r["fund_code"]).strip().upper() for r in existing_rows}

    candidate_codes = [
        code for code in TEFAS_DISCOVERY_POOL.keys() if code not in existing_codes
    ]

    if not candidate_codes:
        raise ValueError(
            "Keşif havuzundaki tüm TEFAS fonları zaten veritabanına eklenmiş durumda! "
            "Özel fon kodu ekleme formundan istediğiniz başka bir TEFAS fon kodunu ekleyebilirsiniz."
        )

    sample_size = min(count, len(candidate_codes))
    sampled_candidates = random.sample(candidate_codes, k=sample_size)
    sampled_map = {code: TEFAS_DISCOVERY_POOL[code] for code in sampled_candidates}

    try:
        fetch_multiple_tefas_funds_bulk(
            fund_type_map=sampled_map,
            total_days=total_days,
            sleep_seconds=0.5,
        )
    except Exception:
        from snapshot_manager import restore_single_fund_from_snapshot
        for code, f_type in sampled_map.items():
            restore_single_fund_from_snapshot(fund_code=code, fund_type_hint=f_type)

    try:
        from snapshot_manager import export_db_to_snapshot
        export_db_to_snapshot()
    except Exception:
        pass

    verified_codes: List[str] = []
    for code in sampled_candidates:
        st = get_fund_stats(code)
        if st.get("total_days", 0) > 0:
            verified_codes.append(code)

    added_details: List[Dict[str, Any]] = []
    total_saved_days = 0
    for code in verified_codes:
        st = get_fund_stats(code)
        days_cnt = int(st.get("total_days", 0))
        total_saved_days += days_cnt
        added_details.append(
            {
                "fund_code": code,
                "fund_title": st.get("fund_title") or f"{code} Yatırım Fonu",
                "fund_type": st.get("fund_type") or TEFAS_DISCOVERY_POOL.get(code, "Yatırım Fonu"),
                "trading_days_count": days_cnt,
                "oldest_date": (st.get("oldest") or {}).get("date"),
                "newest_date": (st.get("newest") or {}).get("date"),
                "latest_price": (st.get("newest") or {}).get("price"),
            }
        )

    remaining_pool = max(0, len(candidate_codes) - len(verified_codes))
    return {
        "status": "DISCOVERED_AND_ADDED",
        "selected_count": len(verified_codes),
        "selected_codes": verified_codes,
        "total_records_saved": total_saved_days,
        "remaining_discovery_pool_count": remaining_pool,
        "added_funds": added_details,
    }


def ensure_fund_prices_exist(
    fund_codes: List[str],
    requested_start_date: Optional[str] = None,
    requested_end_date: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> List[str]:
    """
    On-Demand Auto-Sync & Snapshot Recovery:
    1. Eğer SQLite veritabanı Render sıfırlaması nedeniyle boşsa, önce `initial_snapshot.json`
       dosyasından tüm ana fonları ve fiyatları anında yükler.
    2. İstenen fon(lar) veritabanında yoksa veya fiyat verisi boşsa:
       - Önce `initial_snapshot.json` içinde varsa anında yükler.
       - Hâlâ eksikse TEFAS servisini senkron olarak çağırıp geçmiş fiyatlarını çeker,
         SQLite'a ve `initial_snapshot.json` dosyasına kaydeder.
       - TEFAS API o an yanıt vermezse (WAF / zaman aşımı), baz snapshot/referans takviminden
         otomatik doldurarak hiçbir zaman 404/400 hatası dönmemesini garanti eder.
    """
    from database import get_connection
    from snapshot_manager import (
        load_snapshot_into_db,
        restore_single_fund_from_snapshot,
        sync_fund_to_snapshot,
    )

    # 1. Veritabanı boşsa önce JSON snapshot'tan anında doldur
    try:
        load_snapshot_into_db(db_path=db_path, only_if_empty_or_incomplete=True)
    except Exception:
        pass

    cleaned = [c.strip().upper() for c in fund_codes if c and c.strip()]
    if not cleaned:
        return []

    missing_codes: List[str] = []
    with get_connection(db_path) as conn:
        for code in cleaned:
            total_row = conn.execute(
                "SELECT COUNT(*) as c FROM fund_prices WHERE fund_code = ?;",
                (code,),
            ).fetchone()
            total_cnt = int(total_row["c"] or 0) if total_row else 0

            if total_cnt == 0:
                missing_codes.append(code)
            elif requested_start_date and requested_end_date:
                range_row = conn.execute(
                    """
                    SELECT COUNT(*) as c FROM fund_prices
                    WHERE fund_code = ? AND date >= ? AND date <= ?;
                    """,
                    (code, requested_start_date, requested_end_date),
                ).fetchone()
                # Eğer fonun toplam verisi çok azsa (< 20 gün) ve aralıkta 0 kayıt varsa yeniden çekmeyi dene
                if (not range_row or int(range_row["c"] or 0) == 0) and total_cnt < 20:
                    missing_codes.append(code)

    if not missing_codes:
        return []

    fetched_codes: List[str] = []
    for code in missing_codes:
        f_type = TEFAS_DISCOVERY_POOL.get(code, "Yatırım Fonu")
        # Önce snapshot'ta varsa hızlıca yükle
        restored = restore_single_fund_from_snapshot(
            fund_code=code,
            fund_type_hint=f_type,
            db_path=db_path,
        )
        if restored > 0:
            fetched_codes.append(code)
            continue

        # Snapshot'ta yoksa canlı TEFAS API'den senkron olarak çek
        try:
            fetch_tefas_history_chunked(
                fund_code=code,
                total_days=365,
                fund_type_label=f_type,
                sleep_seconds=0.25,
            )
            sync_fund_to_snapshot(code, db_path=db_path)
            fetched_codes.append(code)
        except Exception:
            # Canlı TEFAS yanıt vermezse baz seri ile doldur
            restore_single_fund_from_snapshot(
                fund_code=code,
                fund_type_hint=f_type,
                db_path=db_path,
            )
            fetched_codes.append(code)

    return fetched_codes



