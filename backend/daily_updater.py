"""
GÖREV 1 — Arka Planda Günlük Otomatik TEFAS Veri Güncelleme Motoru
Dosya: backend/daily_updater.py

Kurallar (PROJECT_RULES.md):
- Kural 1: Asla sahte (mock) veri üretmez; yalnızca gerçek TEFAS API verilerini çeker.
- Takip edilen tüm fonlar için veritabanındaki en son fiyat tarihini (MAX(date)) kontrol eder.
- Eksik işlem günü varsa yalnızca eksik tarih aralığını TEFAS'tan çekip INSERT OR REPLACE ile kaydeder.
- Hafta sonu veya resmi tatil günlerinde TEFAS'ta yeni fiyat oluşmadığını tespit edip sync_logs tablosuna kaydeder.
"""

from datetime import datetime, timedelta
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

from database import (
    get_connection,
    insert_sync_log,
    get_recent_sync_logs,
    get_total_price_records,
    bulk_upsert_fund_prices,
    upsert_fund,
)
from tefas_fetcher import (
    TEFAS_PAGE_URL,
    TEFAS_NEW_API_URL,
    TefasFetchError,
    _post_with_retry,
    _extract_row_fields,
    _parse_tefas_timestamp,
    _to_float,
    _to_int,
    _split_date_range,
)
import requests
import time


def _get_latest_trading_target_date(now_dt: Optional[datetime] = None) -> str:
    """
    Bugünün tarihini ve hafta sonu (Cumartesi/Pazar) ise en son Cuma iş gününü hesaplar.
    """
    dt = now_dt or datetime.now()
    if dt.weekday() == 5:  # Cumartesi -> Cuma
        dt = dt - timedelta(days=1)
    elif dt.weekday() == 6:  # Pazar -> Cuma
        dt = dt - timedelta(days=2)
    return dt.strftime("%Y-%m-%d")


def run_daily_tefas_sync(
    sync_type: str = "SCHEDULED_CRON",
    force_check: bool = False,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Veritabanındaki tüm takip edilen fonları (funds tablosu) tarar, her fonun en son
    kayıtlı fiyat tarihini (MAX(date)) kontrol eder ve eksik günleri TEFAS'tan çeker.
    Sonucu sync_logs tablosuna kaydeder.
    """
    now_dt = datetime.now()
    today_str = now_dt.strftime("%Y-%m-%d")
    is_weekend = now_dt.weekday() in (5, 6)
    latest_business_day_str = _get_latest_trading_target_date(now_dt)

    with get_connection(db_path) as conn:
        fund_rows = conn.execute(
            """
            SELECT
                f.fund_code,
                f.fund_title,
                f.fund_type,
                MAX(p.date) as max_date,
                COUNT(p.id) as total_days
            FROM funds f
            LEFT JOIN fund_prices p ON f.fund_code = p.fund_code
            GROUP BY f.fund_code
            ORDER BY f.fund_code ASC;
            """
        ).fetchall()

    if not fund_rows:
        msg = "Veritabanında takip edilen fon bulunamadı."
        log_id = insert_sync_log(sync_type=sync_type, status="EMPTY", details=msg, db_path=db_path)
        return {"log_id": log_id, "status": "EMPTY", "details": msg}

    # Eksik günü olan fonları belirle
    funds_needing_check: Dict[str, Dict[str, Any]] = {}
    earliest_start_dt: Optional[datetime] = None

    for r in fund_rows:
        code = r["fund_code"]
        max_d = r["max_date"]
        if not max_d:
            f_start = now_dt - timedelta(days=365)
        else:
            max_dt = datetime.strptime(max_d, "%Y-%m-%d")
            # Eğer fonun son tarihi en son iş gününden eskiyse veya force_check açıksa
            if max_d < latest_business_day_str or force_check:
                f_start = max_dt + timedelta(days=1) if max_d < today_str else max_dt
            else:
                continue

        funds_needing_check[code] = {
            "fund_title": r["fund_title"],
            "fund_type": r["fund_type"],
            "previous_max_date": max_d,
            "query_start_date": f_start.strftime("%Y-%m-%d"),
        }
        if earliest_start_dt is None or f_start < earliest_start_dt:
            earliest_start_dt = f_start

    # Tüm fonlar zaten en son iş gününe kadar güncelse ve force_check değilse
    if not funds_needing_check or earliest_start_dt is None or earliest_start_dt > now_dt:
        weekend_note = (
            f"Bugün ({today_str}) hafta sonu/tatil olduğu için TEFAS'ta yeni işlem günü fiyatı oluşmamıştır. "
            if is_weekend
            else ""
        )
        details_obj = {
            "checked_at": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "tracked_funds_count": len(fund_rows),
            "latest_business_day": latest_business_day_str,
            "is_weekend": is_weekend,
            "newly_inserted_records": 0,
            "updated_funds": {},
            "message": (
                f"{weekend_note}Tüm {len(fund_rows)} fon en güncel TEFAS işlem günü ({latest_business_day_str}) verisine sahiptir."
            ),
        }
        details_str = json.dumps(details_obj, ensure_ascii=False)
        status_code = "UP_TO_DATE_WEEKEND" if is_weekend else "UP_TO_DATE"
        log_id = insert_sync_log(sync_type=sync_type, status=status_code, details=details_str, db_path=db_path)
        return {
            "log_id": log_id,
            "sync_type": sync_type,
            "status": status_code,
            **details_obj,
        }

    # Eksik tarih aralığını TEFAS'tan sorgula
    target_codes = set(funds_needing_check.keys())
    date_chunks = _split_date_range(earliest_start_dt, now_dt, max_days=27)

    try:
        session = requests.Session()
        get_headers = {
            "User-Agent": "python-requests/tefas-client",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "close",
        }
        init_resp = session.get(TEFAS_PAGE_URL, headers=get_headers, timeout=25)
        if init_resp.status_code != 200:
            raise TefasFetchError(f"TEFAS oturum başlatma hatası: HTTP {init_resp.status_code}")

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

        new_records: List[Dict[str, Any]] = []
        updated_dates_by_fund: Dict[str, List[str]] = {}

        for idx, (c_start, c_end) in enumerate(date_chunks):
            if idx > 0:
                time.sleep(0.8)

            payload = {
                "dil": "TR",
                "fonTipi": "YAT",
                "fonKod": None,
                "fonGrup": None,
                "basTarih": c_start.strftime("%Y%m%d"),
                "bitTarih": c_end.strftime("%Y%m%d"),
                "fonTurKod": None,
                "fonUnvanTip": None,
                "kurucuKod": None,
                "fonTurAciklama": None,
                "sfonTurKod": None,
            }
            resp = _post_with_retry(
                session=session,
                url=TEFAS_NEW_API_URL,
                headers=new_headers,
                json_payload=payload,
                timeout=30,
            )
            if resp.status_code != 200:
                raise TefasFetchError(f"TEFAS HTTP {resp.status_code} hatası döndürdü.")

            rows = (resp.json() or {}).get("resultList") or []
            for row in rows:
                code = str(row.get("FONKODU") or row.get("fonKodu") or row.get("fonKod") or "").strip().upper()
                if code not in target_codes:
                    continue

                raw_tarih, raw_fiyat, raw_kisi, raw_portfoy, raw_unvan = _extract_row_fields(row)
                parsed_date = _parse_tefas_timestamp(raw_tarih)
                parsed_price = _to_float(raw_fiyat)
                if parsed_price is None or parsed_price <= 0:
                    continue

                prev_max = funds_needing_check[code]["previous_max_date"]
                if prev_max and parsed_date <= prev_max and not force_check:
                    continue

                new_records.append(
                    {
                        "fund_code": code,
                        "date": parsed_date,
                        "price": parsed_price,
                        "investor_count": _to_int(raw_kisi),
                        "total_value": _to_float(raw_portfoy),
                        "source": "TEFAS_API",
                    }
                )
                if prev_max is None or parsed_date > prev_max:
                    updated_dates_by_fund.setdefault(code, []).append(parsed_date)

                if raw_unvan:
                    upsert_fund(
                        fund_code=code,
                        fund_title=str(raw_unvan).strip(),
                        fund_type=funds_needing_check[code]["fund_type"],
                        db_path=db_path,
                    )

        saved_cnt = bulk_upsert_fund_prices(new_records, db_path=db_path)
        newly_added_days_cnt = sum(len(v) for v in updated_dates_by_fund.values())

        if newly_added_days_cnt > 0:
            status_code = "UPDATED"
            msg = (
                f"TEFAS senkronizasyonu tamamlandı: {len(updated_dates_by_fund)} fonda "
                f"toplam {newly_added_days_cnt} yeni işlem günü verisi eklendi."
            )
        else:
            status_code = "UP_TO_DATE_WEEKEND" if is_weekend else "UP_TO_DATE"
            msg = (
                f"TEFAS sorgulandı ({earliest_start_dt.strftime('%Y-%m-%d')} -> {today_str}): "
                f"{'Hafta sonu/tatil günü nedeniyle ' if is_weekend else ''}"
                f"henüz yeni işlem günü fiyatı yayımlanmadı; mevcut {len(fund_rows)} fon günceldir."
            )

        details_obj = {
            "checked_at": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "tracked_funds_count": len(fund_rows),
            "queried_range": f"{earliest_start_dt.strftime('%Y-%m-%d')} -> {today_str}",
            "is_weekend": is_weekend,
            "newly_inserted_records": newly_added_days_cnt,
            "total_upserted_rows": saved_cnt,
            "updated_funds": updated_dates_by_fund,
            "message": msg,
        }
        log_id = insert_sync_log(
            sync_type=sync_type,
            status=status_code,
            details=json.dumps(details_obj, ensure_ascii=False),
            db_path=db_path,
        )
        return {
            "log_id": log_id,
            "sync_type": sync_type,
            "status": status_code,
            **details_obj,
        }

    except Exception as exc:
        err_obj = {
            "checked_at": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "error": str(exc),
            "message": f"TEFAS senkronizasyon hatası: {exc}",
        }
        log_id = insert_sync_log(
            sync_type=sync_type,
            status="ERROR",
            details=json.dumps(err_obj, ensure_ascii=False),
            db_path=db_path,
        )
        return {
            "log_id": log_id,
            "sync_type": sync_type,
            "status": "ERROR",
            **err_obj,
        }


def get_sync_status_summary(
    scheduler_running: bool = False,
    next_run_time: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    GET /api/public/sync-status uç noktası için en son senkronizasyon kaydını,
    zamanlayıcı (APScheduler) durumunu ve veritabanı özetini döndürür.
    """
    with get_connection(db_path) as conn:
        funds_cnt = conn.execute("SELECT COUNT(*) as c FROM funds;").fetchone()["c"]
        min_max = conn.execute(
            "SELECT MIN(date) as min_d, MAX(date) as max_d FROM fund_prices;"
        ).fetchone()
        last_success = conn.execute(
            """
            SELECT id, sync_type, status, details, created_at
            FROM sync_logs
            WHERE status IN ('UPDATED', 'UP_TO_DATE', 'UP_TO_DATE_WEEKEND')
            ORDER BY id DESC
            LIMIT 1;
            """
        ).fetchone()

    recent_logs = get_recent_sync_logs(limit=15, db_path=db_path)
    for item in recent_logs:
        try:
            item["details_parsed"] = json.loads(item["details"])
        except Exception:
            item["details_parsed"] = {"message": item["details"]}

    last_success_dict = None
    if last_success:
        last_success_dict = dict(last_success)
        try:
            last_success_dict["details_parsed"] = json.loads(last_success_dict["details"])
        except Exception:
            last_success_dict["details_parsed"] = {"message": last_success_dict["details"]}

    return {
        "scheduler": {
            "active": scheduler_running,
            "cron_schedule": "Pazartesi - Cuma her akşam saat 21:00 (Europe/Istanbul)",
            "next_scheduled_run": next_run_time,
        },
        "database_state": {
            "tracked_funds_count": int(funds_cnt),
            "total_price_records": get_total_price_records(db_path),
            "oldest_price_date": min_max["min_d"] if min_max else None,
            "latest_price_date": min_max["max_d"] if min_max else None,
        },
        "last_successful_sync": last_success_dict,
        "recent_sync_logs": recent_logs,
    }
