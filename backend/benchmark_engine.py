"""
Reel Getiri & Küresel Benchmark Simülatörü Motoru
Dosya: backend/benchmark_engine.py

Kurallar (PROJECT_RULES.md - %100 gerçek veri ilkesi):
- Fon getirisi: SQLite'daki gerçek TEFAS birim pay fiyatları.
- Benchmark serileri (Ons/Gram Altın, BIST 100, USD/TRY, EUR/TRY, S&P 500, Nasdaq): Yahoo Finance
  günlük kapanış verisi. Canlı çekim başarısız olursa `backend/data/benchmark_snapshot.json`
  (git'e dahil gerçek veri yedeği) kullanılır.
- TÜFE (enflasyon) ve mevduat/TLREF oranı: kesin resmi seri otomatik çekilemediği için KULLANICI
  VARSAYIMI (yıllık %) olarak alınır ve arayüzde açıkça "Varsayım" olarak etiketlenir.
- Fon fiyatları yönetim ücreti kesildikten SONRAKİ net birim pay fiyatlarıdır; yönetim ücreti etkisi
  bilgi amaçlı olarak "eriyen tutar" şeklinde ayrıca tahmin edilir (çift düşülmez).
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

from analytics_engine import compare_funds_normalized

DATA_DIR = Path(__file__).resolve().parent / "data"
BENCHMARK_SNAPSHOT_PATH = DATA_DIR / "benchmark_snapshot.json"

YAHOO_SYMBOLS: Dict[str, str] = {
    "GOLD_OUNCE_USD": "GC=F",
    "BIST100": "XU100.IS",
    "USDTRY": "USDTRY=X",
    "EURTRY": "EURTRY=X",
    "SP500": "^GSPC",
    "NASDAQ": "^IXIC",
}

BENCHMARK_LABELS: Dict[str, str] = {
    "GOLD_GRAM_TRY": "Gram Altın / Ons Altın (TL bazlı)",
    "GOLD_OUNCE_USD": "Ons Altın (TL bazlı)",
    "BIST100": "BIST 100 (XU100)",
    "USDTRY": "ABD Doları (USD/TRY)",
    "EURTRY": "Euro (EUR/TRY)",
    "SP500": "S&P 500 (TL bazlı)",
    "NASDAQ": "Nasdaq Composite (TL bazlı)",
    "DEPOSIT": "Mevduat / TLREF (Varsayım)",
}

_CACHE: Dict[str, Any] = {"data": None, "loaded_at": None}


def _fetch_yahoo(symbol: str, rng: str = "2y") -> List[Tuple[str, float]]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={rng}&interval=1d"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
    resp.raise_for_status()
    res = resp.json()["chart"]["result"][0]
    stamps = res["timestamp"]
    closes = res["indicators"]["quote"][0]["close"]
    out: Dict[str, float] = {}
    for ts, cl in zip(stamps, closes):
        if cl is None:
            continue
        out[datetime.utcfromtimestamp(ts + 3 * 3600).strftime("%Y-%m-%d")] = float(cl)
    return sorted(out.items())


def refresh_benchmark_snapshot() -> Dict[str, Any]:
    """Yahoo Finance'ten gerçek serileri çekip snapshot dosyasına yazar."""
    series: Dict[str, List[List[Any]]] = {}
    for key, sym in YAHOO_SYMBOLS.items():
        series[key] = [[d, round(v, 6)] for d, v in _fetch_yahoo(sym)]
    payload = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source": "Yahoo Finance (günlük kapanış)",
        "symbols": YAHOO_SYMBOLS,
        "series": series,
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    BENCHMARK_SNAPSHOT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    _CACHE["data"] = payload
    _CACHE["loaded_at"] = datetime.now()
    return payload


def load_benchmark_data(force_refresh: bool = False) -> Dict[str, Any]:
    """Önce bellek/snapshot, snapshot 1 günden eskiyse canlı yenilemeyi dener (hata olursa eskiyi kullanır)."""
    if _CACHE["data"] and not force_refresh:
        return _CACHE["data"]

    data: Optional[Dict[str, Any]] = None
    if BENCHMARK_SNAPSHOT_PATH.exists():
        try:
            data = json.loads(BENCHMARK_SNAPSHOT_PATH.read_text(encoding="utf-8"))
        except Exception:
            data = None

    stale = True
    if data and data.get("generated_at"):
        try:
            gen = datetime.strptime(data["generated_at"], "%Y-%m-%d %H:%M:%S")
            stale = (datetime.now() - gen) > timedelta(hours=20)
        except Exception:
            stale = True

    if force_refresh or data is None or stale:
        try:
            data = refresh_benchmark_snapshot()
        except Exception as exc:
            print(f"[BENCHMARK] Canlı yenileme başarısız, snapshot kullanılıyor: {exc}")

    if data is None:
        raise ValueError(
            "Benchmark piyasa verisi (altın, BIST100, USD, EUR, S&P500) şu an alınamadı ve snapshot bulunamadı."
        )
    _CACHE["data"] = data
    _CACHE["loaded_at"] = datetime.now()
    return data


def _ffill_lookup(sorted_pairs: List[Tuple[str, float]], date_str: str) -> Optional[float]:
    """date_str tarihinde veya ondan ÖNCEKİ son işlem gününün değerini döndürür."""
    lo, hi, found = 0, len(sorted_pairs) - 1, None
    while lo <= hi:
        mid = (lo + hi) // 2
        if sorted_pairs[mid][0] <= date_str:
            found = sorted_pairs[mid][1]
            lo = mid + 1
        else:
            hi = mid - 1
    if found is None and sorted_pairs:
        return sorted_pairs[0][1]  # aralık başı veri öncesindeyse ilk mevcut değer
    return found


def _build_series_map(data: Dict[str, Any]) -> Dict[str, List[Tuple[str, float]]]:
    raw = {k: [(d, float(v)) for d, v in rows] for k, rows in data["series"].items()}
    gold = raw.get("GOLD_OUNCE_USD", [])
    usd = raw.get("USDTRY", [])
    gram: List[Tuple[str, float]] = []
    for d, ons in gold:
        fx = _ffill_lookup(usd, d)
        if fx:
            gram.append((d, ons * fx / 31.1035))
    raw["GOLD_GRAM_TRY"] = gram
    # USD bazlı araçları TL yatırımcısı için USD/TRY ile TL'ye çevir (kur etkisi dahil)
    for k in ("GOLD_OUNCE_USD", "SP500", "NASDAQ"):
        converted: List[Tuple[str, float]] = []
        for d, v in raw.get(k, []):
            fx = _ffill_lookup(usd, d)
            if fx:
                converted.append((d, v * fx))
        raw[k] = converted
    return raw


def compute_real_return(
    fund_codes: List[str],
    start_date: str,
    end_date: str,
    initial_amount_tl: float = 100000.0,
    weights_pct: Optional[List[float]] = None,
    annual_mgmt_fee_pct: float = 2.0,
    stopaj_pct: float = 17.5,
    annual_inflation_pct: float = 33.0,
    deposit_rate_pct: float = 40.0,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Fon/sepet için brüt → net → reel getiri zinciri ve 8 benchmark ile karşılaştırma."""
    codes = [c.strip().upper() for c in fund_codes if c and c.strip()]
    if not codes:
        raise ValueError("En az bir fon kodu gereklidir.")
    if initial_amount_tl <= 0:
        raise ValueError("Başlangıç tutarı 0'dan büyük olmalıdır.")

    if weights_pct and len(weights_pct) == len(codes) and sum(weights_pct) > 0:
        tot = float(sum(weights_pct))
        w = [float(x) / tot for x in weights_pct]
    else:
        w = [1.0 / len(codes)] * len(codes)

    comp = compare_funds_normalized(
        fund_codes=codes,
        requested_start_date=start_date,
        requested_end_date=end_date,
        db_path=db_path,
    )
    series = comp["daily_series"]
    if len(series) < 2:
        raise ValueError("Simülasyon için yeterli ortak işlem günü bulunamadı.")

    fund_curve: List[Tuple[str, float]] = []
    for pt in series:
        idx = sum(w[i] * (pt["normalized"][codes[i]] / 100.0) for i in range(len(codes)))
        fund_curve.append((pt["date"], idx))

    act_start, act_end = fund_curve[0][0], fund_curve[-1][0]
    days = max(1, (datetime.strptime(act_end, "%Y-%m-%d") - datetime.strptime(act_start, "%Y-%m-%d")).days)
    years = days / 365.0

    # 1) Brüt (ücret sonrası net fiyat) getiri zinciri
    end_idx = fund_curve[-1][1]
    start_amt = float(initial_amount_tl)
    value_after_fee = start_amt * end_idx  # TEFAS fiyatı yönetim ücreti düşülmüş
    gross_pre_fee_value = start_amt * end_idx * ((1.0 + annual_mgmt_fee_pct / 100.0) ** years)
    fee_erosion_tl = gross_pre_fee_value - value_after_fee
    gain = value_after_fee - start_amt
    stopaj_tl = max(0.0, gain) * (stopaj_pct / 100.0)
    net_after_tax = value_after_fee - stopaj_tl
    cum_inflation = (1.0 + annual_inflation_pct / 100.0) ** years
    real_value = net_after_tax / cum_inflation

    gross_return_pct = (gross_pre_fee_value / start_amt - 1.0) * 100.0
    fee_net_return_pct = (value_after_fee / start_amt - 1.0) * 100.0
    net_return_pct = (net_after_tax / start_amt - 1.0) * 100.0
    real_return_pct = (real_value / start_amt - 1.0) * 100.0

    # 2) Benchmark'lar
    data = load_benchmark_data()
    smap = _build_series_map(data)
    bench_keys = ["GOLD_GRAM_TRY", "BIST100", "USDTRY", "EURTRY", "SP500", "NASDAQ"]

    benchmarks: List[Dict[str, Any]] = []
    chart: List[Dict[str, Any]] = []
    base_vals: Dict[str, Optional[float]] = {k: _ffill_lookup(smap.get(k, []), act_start) for k in bench_keys}

    for d, idx in fund_curve:
        row: Dict[str, Any] = {"date": d, "FUND": round(start_amt * idx, 2)}
        for k in bench_keys:
            b0 = base_vals[k]
            bt = _ffill_lookup(smap.get(k, []), d)
            if b0 and bt:
                row[k] = round(start_amt * (bt / b0), 2)
        elapsed = (datetime.strptime(d, "%Y-%m-%d") - datetime.strptime(act_start, "%Y-%m-%d")).days
        row["DEPOSIT"] = round(start_amt * (1.0 + (deposit_rate_pct / 100.0) * elapsed / 365.0), 2)
        chart.append(row)

    last = chart[-1]
    for k in bench_keys + ["DEPOSIT"]:
        end_val = last.get(k)
        if end_val is None:
            continue
        benchmarks.append(
            {
                "key": k,
                "label": BENCHMARK_LABELS[k],
                "end_value_tl": round(float(end_val), 2),
                "return_pct": round((float(end_val) / start_amt - 1.0) * 100.0, 2),
                "diff_vs_fund_tl": round(float(end_val) - value_after_fee, 2),
                "is_assumption": k == "DEPOSIT",
                "currency_note": "USD/TRY ile TL'ye çevrilmiştir (kur etkisi dahil)."
                if k in ("SP500", "NASDAQ")
                else ("Ons altın fiyatı × USD/TRY ÷ 31,1035 (gram); TL bazında ons ile aynı getiriyi verir." if k == "GOLD_GRAM_TRY" else None),
            }
        )

    return {
        "data_classification": "GERCEK_PIYASA_VERISI + KULLANICI_VARSAYIMI (TUFE/Mevduat)",
        "fund_codes": codes,
        "weights_pct": [round(x * 100.0, 2) for x in w],
        "requested_start_date": start_date,
        "requested_end_date": end_date,
        "actual_start_date": act_start,
        "actual_end_date": act_end,
        "days": days,
        "years": round(years, 4),
        "initial_amount_tl": round(start_amt, 2),
        "assumptions": {
            "annual_mgmt_fee_pct": annual_mgmt_fee_pct,
            "stopaj_pct": stopaj_pct,
            "annual_inflation_pct": annual_inflation_pct,
            "deposit_rate_pct": deposit_rate_pct,
            "note": "TÜFE ve mevduat/TLREF oranları kullanıcı varsayımıdır; güncel resmî oranları (TÜİK/TCMB) girerek yeniden hesaplayınız.",
        },
        "real_return_chain": {
            "gross_pre_fee_value_tl": round(gross_pre_fee_value, 2),
            "gross_return_pct": round(gross_return_pct, 2),
            "mgmt_fee_erosion_tl": round(fee_erosion_tl, 2),
            "value_after_fee_tl": round(value_after_fee, 2),
            "fee_net_return_pct": round(fee_net_return_pct, 2),
            "stopaj_tl": round(stopaj_tl, 2),
            "net_after_tax_tl": round(net_after_tax, 2),
            "net_return_pct": round(net_return_pct, 2),
            "cumulative_inflation_pct": round((cum_inflation - 1.0) * 100.0, 2),
            "real_value_tl": round(real_value, 2),
            "real_return_pct": round(real_return_pct, 2),
            "inflation_erosion_tl": round(net_after_tax - real_value, 2),
        },
        "fund_end_value_tl": round(value_after_fee, 2),
        "benchmarks": benchmarks,
        "chart_series": chart,
        "benchmark_source": data.get("source"),
        "benchmark_data_generated_at": data.get("generated_at"),
        "limitations_notice": (
            "Bu hesaplama eğitim amaçlı geçmiş veri simülasyonudur; yatırım tavsiyesi değildir. "
            "Geçmiş performans gelecek getirinin garantisi değildir. Benchmark serileri Yahoo Finance "
            "günlük kapanışlarıdır; Ons Altın, S&P 500 ve Nasdaq USD/TRY ile TL'ye çevrilmiştir."
        ),
    }
