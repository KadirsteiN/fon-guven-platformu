"""
Modül C — Fon Analizi, Tatil/İşlem Günü Çözümleme ve 100 Bazlı Normalizasyon Motoru
Dosya: backend/analytics_engine.py

Kurallar (PROJECT_RULES.md):
- Tüm finansal hesaplamalar (getiri, 100 bazlı normalizasyon, risk metrikleri,
  tatil günü fiyat eşleştirmesi) yapay zekâ tahminiyle değil, doğrulanabilir
  Python fonksiyonlarıyla SQLite'daki gerçek TEFAS verileri üzerinden yapılır.
- Kullanılan gerçek işlem günü tarihleri ve tatil günü uyarıları açıkça raporlanır.
"""

import math
from pathlib import Path
from typing import Dict, Any, List, Optional

from database import get_connection

TRADING_DAYS_PER_YEAR = 252


def resolve_trading_dates(
    fund_code: str,
    requested_start_date: str,
    requested_end_date: str,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Tatil ve İşlem Günü Çözümleyici:
    1. requested_start_date tarihinde veri yoksa, o tarihten SONRAKİ ilk işlem gününü
       (actual_start_date) bulur.
    2. requested_end_date tarihinde veri yoksa, o tarihten ÖNCEKİ son işlem gününü
       (actual_end_date) bulur.
    3. İstenen tarih ile gerçekleşen işlem günü farklıysa açık bir date_warning metni üretir.
    """
    fund_code = fund_code.strip().upper()
    req_start = requested_start_date.strip()
    req_end = requested_end_date.strip()

    if req_start > req_end:
        raise ValueError(
            f"Başlangıç tarihi ({req_start}) bitiş tarihinden ({req_end}) sonra olamaz."
        )

    with get_connection(db_path) as conn:
        start_row = conn.execute(
            """
            SELECT date, price, source
            FROM fund_prices
            WHERE fund_code = ? AND date >= ? AND date <= ?
            ORDER BY date ASC
            LIMIT 1
            """,
            (fund_code, req_start, req_end),
        ).fetchone()

        end_row = conn.execute(
            """
            SELECT date, price, source
            FROM fund_prices
            WHERE fund_code = ? AND date >= ? AND date <= ?
            ORDER BY date DESC
            LIMIT 1
            """,
            (fund_code, req_start, req_end),
        ).fetchone()

    if not start_row or not end_row:
        raise ValueError(
            f"[{fund_code}] Seçilen tarih aralığında ({req_start} -> {req_end}) "
            f"veritabanında gerçek işlem günü kaydı bulunamadı."
        )

    actual_start = start_row["date"]
    actual_end = end_row["date"]
    warnings: List[str] = []

    if actual_start != req_start:
        warnings.append(
            f"Başlangıç tarihi ({req_start}) hafta sonu/tatil olduğu için takip eden "
            f"ilk işlem günü ({actual_start}) fiyatı kullanılmıştır."
        )

    if actual_end != req_end:
        warnings.append(
            f"Bitiş tarihi ({req_end}) hafta sonu/tatil veya henüz fiyat oluşmamış bir gün "
            f"olduğu için önceki son işlem günü ({actual_end}) fiyatı kullanılmıştır."
        )

    return {
        "fund_code": fund_code,
        "requested_start_date": req_start,
        "requested_end_date": req_end,
        "actual_start_date": actual_start,
        "actual_end_date": actual_end,
        "start_price": float(start_row["price"]),
        "end_price": float(end_row["price"]),
        "is_start_adjusted": actual_start != req_start,
        "is_end_adjusted": actual_end != req_end,
        "date_warnings": warnings,
        "date_warning": " ".join(warnings) if warnings else None,
    }


def compute_risk_metrics_from_prices(prices: List[float]) -> Dict[str, float]:
    """
    Fiyat serisinden Maksimum Düşüş (Max Drawdown %) ve Yıllıklandırılmış Volatilite
    (Standart Sapma %) değerlerini doğrulanabilir matematiksel formüllerle hesaplar.
    """
    if len(prices) < 2:
        return {
            "max_drawdown_pct": 0.0,
            "annualized_volatility_pct": 0.0,
            "daily_volatility_pct": 0.0,
        }

    # 1. Maksimum Düşüş (Max Drawdown % - Zirveden Dibe En Büyük Kayıp)
    peak = prices[0]
    max_drawdown = 0.0
    for p in prices:
        if p > peak:
            peak = p
        if peak > 0:
            drawdown = ((p - peak) / peak) * 100.0  # Negatif veya 0.0
            if drawdown < max_drawdown:
                max_drawdown = drawdown

    # 2. Günlük Getiriler ve Yıllıklandırılmış Volatilite (Örneklem Standart Sapması * sqrt(252))
    daily_returns: List[float] = []
    for i in range(1, len(prices)):
        prev_p = prices[i - 1]
        curr_p = prices[i]
        if prev_p > 0:
            daily_returns.append((curr_p / prev_p) - 1.0)

    if len(daily_returns) >= 2:
        mean_ret = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean_ret) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        daily_std = math.sqrt(variance)
        annualized_vol_pct = daily_std * math.sqrt(TRADING_DAYS_PER_YEAR) * 100.0
        daily_vol_pct = daily_std * 100.0
    else:
        annualized_vol_pct = 0.0
        daily_vol_pct = 0.0

    return {
        "max_drawdown_pct": round(abs(max_drawdown), 4),
        "max_drawdown_signed_pct": round(max_drawdown, 4),
        "annualized_volatility_pct": round(annualized_vol_pct, 4),
        "daily_volatility_pct": round(daily_vol_pct, 4),
    }


def analyze_fund_performance(
    fund_code: str,
    requested_start_date: str,
    requested_end_date: str,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Tekil Fon Performans ve Risk Analizi:
    - Formül: Getiri (%) = ((Bitiş Fiyatı / Başlangıç Fiyatı) - 1) * 100
    - Risk Göstergeleri: Maksimum Düşüş (Max Drawdown %) ve Yıllıklandırılmış Volatilite (%)
    - Veri kaynağı, işlem günü sayısı ve tatil günü uyarılarını içerir.
    """
    fund_code = fund_code.strip().upper()
    date_resolution = resolve_trading_dates(
        fund_code=fund_code,
        requested_start_date=requested_start_date,
        requested_end_date=requested_end_date,
        db_path=db_path,
    )

    actual_start = date_resolution["actual_start_date"]
    actual_end = date_resolution["actual_end_date"]

    with get_connection(db_path) as conn:
        fund_meta = conn.execute(
            "SELECT fund_title, fund_type FROM funds WHERE fund_code = ?",
            (fund_code,),
        ).fetchone()

        rows = conn.execute(
            """
            SELECT date, price, investor_count, total_value, source
            FROM fund_prices
            WHERE fund_code = ? AND date >= ? AND date <= ?
            ORDER BY date ASC
            """,
            (fund_code, actual_start, actual_end),
        ).fetchall()

    if not rows:
        raise ValueError(f"[{fund_code}] {actual_start} -> {actual_end} aralığında fiyat verisi yok.")

    prices = [float(r["price"]) for r in rows]
    sources = sorted({str(r["source"]) for r in rows})
    start_price = prices[0]
    end_price = prices[-1]

    if start_price <= 0:
        raise ValueError(f"[{fund_code}] Başlangıç fiyatı geçersiz: {start_price}")

    return_pct = ((end_price / start_price) - 1.0) * 100.0
    normalized_end_value = (end_price / start_price) * 100.0
    risk_metrics = compute_risk_metrics_from_prices(prices)

    return {
        "fund_code": fund_code,
        "fund_title": fund_meta["fund_title"] if fund_meta else f"{fund_code} Yatırım Fonu",
        "fund_type": fund_meta["fund_type"] if fund_meta else None,
        "data_classification": "GERCEK_PIYASA_VERISI",
        "source": "TEFAS (" + ", ".join(sources) + ")",
        "requested_start_date": date_resolution["requested_start_date"],
        "requested_end_date": date_resolution["requested_end_date"],
        "actual_start_date": actual_start,
        "actual_end_date": actual_end,
        "trading_days_count": len(rows),
        "start_price": round(start_price, 6),
        "end_price": round(end_price, 6),
        "return_pct": round(return_pct, 4),
        "normalized_base_100_end": round(normalized_end_value, 4),
        "max_drawdown_pct": risk_metrics["max_drawdown_pct"],
        "max_drawdown_signed_pct": risk_metrics["max_drawdown_signed_pct"],
        "annualized_volatility_pct": risk_metrics["annualized_volatility_pct"],
        "daily_volatility_pct": risk_metrics["daily_volatility_pct"],
        "date_warnings": date_resolution["date_warnings"],
        "date_warning": date_resolution["date_warning"],
    }


def compare_funds_normalized(
    fund_codes: List[str],
    requested_start_date: str,
    requested_end_date: str,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Çoklu Fon Karşılaştırma ve 100 Bazlı Normalizasyon:
    - Birden fazla fon kodunu ve tarih aralığını alır.
    - Ortak işlem günleri üzerinden her fonun başlangıç fiyatını 100.0 kabul ederek
      (Normalized_t = (Price_t / Price_0) * 100) günlük zaman serisini oluşturur.
    - Her fonun performans/risk özetini ve tatil günü uyarılarını döndürür.
    """
    cleaned_codes = [c.strip().upper() for c in fund_codes if c and c.strip()]
    if not cleaned_codes:
        raise ValueError("Karşılaştırma için en az bir fon kodu belirtilmelidir.")

    req_start = requested_start_date.strip()
    req_end = requested_end_date.strip()

    fund_price_maps: Dict[str, Dict[str, float]] = {}
    fund_Individual_summaries: List[Dict[str, Any]] = []
    all_warnings: List[str] = []

    with get_connection(db_path) as conn:
        for code in cleaned_codes:
            rows = conn.execute(
                """
                SELECT date, price
                FROM fund_prices
                WHERE fund_code = ? AND date >= ? AND date <= ?
                ORDER BY date ASC
                """,
                (code, req_start, req_end),
            ).fetchall()

            if not rows:
                raise ValueError(
                    f"[{code}] Seçilen tarih aralığında ({req_start} -> {req_end}) fiyat verisi bulunamadı."
                )

            fund_price_maps[code] = {r["date"]: float(r["price"]) for r in rows}

    # Tüm fonların ortak işlem günlerini bul
    common_dates_set = set(fund_price_maps[cleaned_codes[0]].keys())
    for code in cleaned_codes[1:]:
        common_dates_set &= set(fund_price_maps[code].keys())

    common_dates = sorted(common_dates_set)
    if not common_dates:
        raise ValueError(
            f"Fonlar ({cleaned_codes}) için {req_start} -> {req_end} aralığında ortak işlem günü bulunamadı."
        )

    common_start = common_dates[0]
    common_end = common_dates[-1]

    if common_start != req_start:
        all_warnings.append(
            f"Başlangıç tarihi ({req_start}) hafta sonu/tatil olduğu için takip eden "
            f"ilk ortak işlem günü ({common_start}) fiyatı kullanılmıştır."
        )
    if common_end != req_end:
        all_warnings.append(
            f"Bitiş tarihi ({req_end}) hafta sonu/tatil olduğu için önceki "
            f"son ortak işlem günü ({common_end}) fiyatı kullanılmıştır."
        )

    # Her fon için ortak işlem günleri bazında performans & risk özeti
    for code in cleaned_codes:
        perf = analyze_fund_performance(
            fund_code=code,
            requested_start_date=common_start,
            requested_end_date=common_end,
            db_path=db_path,
        )
        # Kullanıcının ilk istediği tarihleri ve uyarıları koru
        perf["requested_start_date"] = req_start
        perf["requested_end_date"] = req_end
        perf["date_warnings"] = all_warnings
        perf["date_warning"] = " ".join(all_warnings) if all_warnings else None
        fund_Individual_summaries.append(perf)

    # 100 bazlı normalize günlük zaman serisi oluştur
    base_prices = {code: fund_price_maps[code][common_start] for code in cleaned_codes}
    daily_series: List[Dict[str, Any]] = []

    for d in common_dates:
        point: Dict[str, Any] = {"date": d, "normalized": {}, "raw_prices": {}}
        for code in cleaned_codes:
            p_t = fund_price_maps[code][d]
            p_0 = base_prices[code]
            norm_val = (p_t / p_0) * 100.0 if p_0 > 0 else 100.0
            point["normalized"][code] = round(norm_val, 4)
            point["raw_prices"][code] = round(p_t, 6)
        daily_series.append(point)

    return {
        "data_classification": "GERCEK_PIYASA_VERISI",
        "source": "TEFAS",
        "fund_codes": cleaned_codes,
        "requested_start_date": req_start,
        "requested_end_date": req_end,
        "actual_start_date": common_start,
        "actual_end_date": common_end,
        "common_trading_days_count": len(common_dates),
        "date_warnings": all_warnings,
        "date_warning": " ".join(all_warnings) if all_warnings else None,
        "funds_summary": fund_Individual_summaries,
        "daily_series": daily_series,
    }
