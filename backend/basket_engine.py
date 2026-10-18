"""
Modül D — Sanal Yatırım Sepeti Simülasyon ve Kayıt Motoru
Dosya: backend/basket_engine.py

Kurallar (PROJECT_RULES.md):
- Kural 1 & 2: Simülasyon çıktıları gerçek TEFAS fiyatlarına dayansa da sepet dağılımı
  kullanıcı varsayımı olduğu için açıkça 'SIMULASYON_VERISI' olarak etiketlenir.
- Kural 5: Pay adetleri, günlük sepet değeri, 100 bazlı normalizasyon, katkı payları
  ve Max Drawdown doğrulanabilir Python fonksiyonlarıyla hesaplanır.
- Zorunlu Şeffaflık Uyarıları (limitations_notice): Stopaj, valör, komisyon ve geçmiş
  performans uyarıları her simülasyon çıktısında yapısal olarak yer alır.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional

from database import get_connection
from analytics_engine import compute_risk_metrics_from_prices
from tefas_fetcher import ensure_fund_prices_exist


MANDATORY_LIMITATIONS_NOTICE = {
    "simulation_badge": "SİMÜLASYON / SENARYO ANALİZİ (Yatırım Tavsiyesi Değildir)",
    "past_performance_warning": (
        "Geçmiş dönemdeki fon performansları, gelecekteki getiri veya kayıpların "
        "garantisi değildir."
    ),
    "gross_calculation_warning": (
        "Tüm hesaplamalar TEFAS'ta yayımlanan günlük brüt birim pay fiyatları üzerinden "
        "yapılmıştır. Fon türüne göre değişen stopaj vergisi (%0 - %15+), alım/satım "
        "emirlerindeki T+1 / T+2 / T+3 valör (fiyat ve nakit takas) gecikmeleri ve "
        "kurum komisyon/masrafları net getiriye dahil edilmemiştir."
    ),
    "management_fee_note": (
        "TEFAS'ta ilan edilen günlük fon birim pay fiyatları içinden fon yönetim ücreti "
        "kesintisi günlük olarak düşülmüş durumdadır."
    ),
}


def simulate_virtual_basket(
    allocations: List[Dict[str, Any]],
    start_date: str,
    end_date: str,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Sanal Yatırım Sepeti Simülatörü:
    - allocations formatı: [{'fund_code': 'AFT', 'amount_tl': 10000}, ...]
    - Her fon için başlangıç işlem günündeki fiyattan alınan pay sayısını
      (shares = amount_tl / start_price) hesaplar.
    - Seçilen dönem boyunca her ortak işlem günü için sepetin toplam TL değerini
      ve 100 bazlı normalize sepet serisini hesaplar.
    - Dönem sonunda toplam kar/zarar, ağırlıklı sepet getirisi (%), her fonun bireysel
      getirisi (%), bitiş TL değeri, toplam sepet kar/zararına yaptığı katkı (TL ve % payı),
      sepetin Max Drawdown (%) oranı ve zorunlu şeffaflık uyarılarını (limitations_notice)
      döndürür.
    """
    if not allocations:
        raise ValueError("Sepet simülasyonu için en az bir fon dağılımı (allocation) gereklidir.")

    req_start = start_date.strip()
    req_end = end_date.strip()
    if req_start > req_end:
        raise ValueError(f"Başlangıç tarihi ({req_start}) bitiş tarihinden ({req_end}) sonra olamaz.")

    # Aynı fon birden fazla kez girildiyse tutarlarını birleştir
    merged_allocs: Dict[str, float] = {}
    for item in allocations:
        code = str(item["fund_code"]).strip().upper()
        amt = float(item["amount_tl"])
        if amt <= 0:
            raise ValueError(f"[{code}] Yatırım tutarı 0'dan büyük olmalıdır (Girilen: {amt}).")
        merged_allocs[code] = merged_allocs.get(code, 0.0) + amt

    fund_codes = list(merged_allocs.keys())
    total_initial_amount = sum(merged_allocs.values())

    ensure_fund_prices_exist(fund_codes, req_start, req_end, db_path=db_path)

    fund_meta_map: Dict[str, Dict[str, Any]] = {}
    fund_price_maps: Dict[str, Dict[str, float]] = {}

    with get_connection(db_path) as conn:
        for code in fund_codes:
            meta_row = conn.execute(
                "SELECT fund_code, fund_title, fund_type FROM funds WHERE fund_code = ?",
                (code,),
            ).fetchone()
            fund_meta_map[code] = (
                dict(meta_row)
                if meta_row
                else {"fund_code": code, "fund_title": f"{code} Yatırım Fonu", "fund_type": None}
            )

            price_rows = conn.execute(
                """
                SELECT date, price
                FROM fund_prices
                WHERE fund_code = ? AND date >= ? AND date <= ?
                ORDER BY date ASC
                """,
                (code, req_start, req_end),
            ).fetchall()

            if not price_rows:
                raise ValueError(
                    f"[{code}] Seçilen tarih aralığında ({req_start} -> {req_end}) "
                    f"veritabanında gerçek fiyat verisi bulunamadı."
                )

            fund_price_maps[code] = {r["date"]: float(r["price"]) for r in price_rows}

    # Ortak işlem günlerini belirle
    common_dates_set = set(fund_price_maps[fund_codes[0]].keys())
    for code in fund_codes[1:]:
        common_dates_set &= set(fund_price_maps[code].keys())

    common_dates = sorted(common_dates_set)
    if not common_dates:
        raise ValueError(
            f"Sepetteki fonlar ({fund_codes}) için {req_start} -> {req_end} aralığında "
            f"ortak işlem günü bulunamadı."
        )

    actual_start = common_dates[0]
    actual_end = common_dates[-1]

    date_warnings: List[str] = []
    if actual_start != req_start:
        date_warnings.append(
            f"Başlangıç tarihi ({req_start}) hafta sonu/tatil olduğu için takip eden "
            f"ilk işlem günü ({actual_start}) fiyatı kullanılmıştır."
        )
    if actual_end != req_end:
        date_warnings.append(
            f"Bitiş tarihi ({req_end}) hafta sonu/tatil olduğu için önceki "
            f"son işlem günü ({actual_end}) fiyatı kullanılmıştır."
        )

    # Başlangıç pay adetlerini (shares = amount_tl / start_price) hesapla
    shares_by_fund: Dict[str, float] = {}
    start_prices_by_fund: Dict[str, float] = {}
    end_prices_by_fund: Dict[str, float] = {}

    for code in fund_codes:
        s_price = fund_price_maps[code][actual_start]
        e_price = fund_price_maps[code][actual_end]
        if s_price <= 0:
            raise ValueError(f"[{code}] Başlangıç fiyatı geçersiz: {s_price}")
        start_prices_by_fund[code] = s_price
        end_prices_by_fund[code] = e_price
        shares_by_fund[code] = merged_allocs[code] / s_price

    # Günlük sepet TL değeri ve 100 bazlı normalize zaman serisi
    daily_basket_series: List[Dict[str, Any]] = []
    daily_total_values: List[float] = []

    for d in common_dates:
        day_total_tl = 0.0
        fund_values_tl: Dict[str, float] = {}
        for code in fund_codes:
            val_tl = shares_by_fund[code] * fund_price_maps[code][d]
            fund_values_tl[code] = round(val_tl, 2)
            day_total_tl += val_tl

        norm_100 = (day_total_tl / total_initial_amount) * 100.0
        daily_total_values.append(day_total_tl)
        daily_basket_series.append(
            {
                "date": d,
                "total_value_tl": round(day_total_tl, 2),
                "normalized_100": round(norm_100, 4),
                "fund_values_tl": fund_values_tl,
            }
        )

    total_final_value = daily_total_values[-1]
    total_net_profit = total_final_value - total_initial_amount
    weighted_return_pct = ((total_final_value / total_initial_amount) - 1.0) * 100.0
    basket_risk = compute_risk_metrics_from_prices(daily_total_values)

    # Fon bazlı performans ve toplam kar/zarara katkı kırılımı
    items_breakdown: List[Dict[str, Any]] = []
    for code in fund_codes:
        init_tl = merged_allocs[code]
        weight_pct = (init_tl / total_initial_amount) * 100.0
        s_price = start_prices_by_fund[code]
        e_price = end_prices_by_fund[code]
        shares = shares_by_fund[code]
        final_tl = shares * e_price
        profit_tl = final_tl - init_tl
        indiv_ret_pct = ((e_price / s_price) - 1.0) * 100.0

        # Toplam sepet kar/zararına katkı payı (%) ve başlangıç sermayesine göre ağırlıklı puan katkısı (%)
        if abs(total_net_profit) > 1e-9:
            profit_share_pct = (profit_tl / total_net_profit) * 100.0
        else:
            profit_share_pct = 0.0

        weighted_return_point_contribution_pct = (profit_tl / total_initial_amount) * 100.0

        items_breakdown.append(
            {
                "fund_code": code,
                "fund_title": fund_meta_map[code]["fund_title"],
                "fund_type": fund_meta_map[code]["fund_type"],
                "initial_amount_tl": round(init_tl, 2),
                "initial_weight_pct": round(weight_pct, 2),
                "start_date": actual_start,
                "end_date": actual_end,
                "start_price": round(s_price, 6),
                "end_price": round(e_price, 6),
                "shares": round(shares, 4),
                "final_value_tl": round(final_tl, 2),
                "individual_return_pct": round(indiv_ret_pct, 4),
                "profit_contribution_tl": round(profit_tl, 2),
                "profit_contribution_share_pct": round(profit_share_pct, 2),
                "weighted_return_point_contribution_pct": round(weighted_return_point_contribution_pct, 4),
            }
        )

    return {
        "data_classification": "SIMULASYON_VERISI (Gerçek TEFAS Fiyatlarına Dayalı Senaryo)",
        "price_source": "TEFAS (SQLite Gerçek Tarihsel Fiyatlar)",
        "requested_start_date": req_start,
        "requested_end_date": req_end,
        "actual_start_date": actual_start,
        "actual_end_date": actual_end,
        "trading_days_count": len(common_dates),
        "date_warnings": date_warnings,
        "date_warning": " ".join(date_warnings) if date_warnings else None,
        "total_initial_amount_tl": round(total_initial_amount, 2),
        "total_final_value_tl": round(total_final_value, 2),
        "total_net_profit_tl": round(total_net_profit, 2),
        "weighted_return_pct": round(weighted_return_pct, 4),
        "normalized_base_100_end": round(100.0 + weighted_return_pct, 4),
        "basket_max_drawdown_pct": basket_risk["max_drawdown_pct"],
        "basket_max_drawdown_signed_pct": basket_risk["max_drawdown_signed_pct"],
        "basket_annualized_volatility_pct": basket_risk["annualized_volatility_pct"],
        "items_breakdown": items_breakdown,
        "limitations_notice": MANDATORY_LIMITATIONS_NOTICE,
        "daily_series": daily_basket_series,
    }


def save_basket(
    basket_name: str,
    allocations: List[Dict[str, Any]],
    start_date: str,
    end_date: str,
    db_path: Optional[Path] = None,
) -> int:
    """
    Sanal Yatırım Sepetini SQLite veritabanındaki virtual_baskets ve basket_items
    tablolarına kaydeder ve oluşturulan basket_id değerini döndürür.
    """
    if not basket_name or not basket_name.strip():
        raise ValueError("Sepet adı (basket_name) boş olamaz.")
    if not allocations:
        raise ValueError("Kaydedilecek sepette en az 1 fon bulunmalıdır.")

    total_initial = sum(float(item["amount_tl"]) for item in allocations)

    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO virtual_baskets (basket_name, start_date, end_date, total_initial_amount)
            VALUES (?, ?, ?, ?)
            """,
            (basket_name.strip(), start_date.strip(), end_date.strip(), total_initial),
        )
        basket_id = int(cursor.lastrowid)

        item_rows = [
            (basket_id, str(item["fund_code"]).strip().upper(), float(item["amount_tl"]))
            for item in allocations
        ]
        cursor.executemany(
            """
            INSERT INTO basket_items (basket_id, fund_code, initial_amount)
            VALUES (?, ?, ?)
            """,
            item_rows,
        )
        conn.commit()
        return basket_id


def load_basket(
    basket_id: int,
    run_simulation: bool = True,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    SQLite veritabanından kayıtlı bir Sanal Yatırım Sepetini (virtual_baskets + basket_items)
    okur ve istenirse güncel simülasyon sonuçlarıyla birlikte döndürür.
    """
    with get_connection(db_path) as conn:
        basket_row = conn.execute(
            """
            SELECT id, basket_name, start_date, end_date, total_initial_amount, created_at
            FROM virtual_baskets
            WHERE id = ?
            """,
            (basket_id,),
        ).fetchone()

        if not basket_row:
            raise ValueError(f"Veritabanında id={basket_id} olan bir sanal sepet bulunamadı.")

        item_rows = conn.execute(
            """
            SELECT id, basket_id, fund_code, initial_amount
            FROM basket_items
            WHERE basket_id = ?
            ORDER BY id ASC
            """,
            (basket_id,),
        ).fetchall()

    allocations = [
        {"fund_code": r["fund_code"], "amount_tl": float(r["initial_amount"])}
        for r in item_rows
    ]

    result: Dict[str, Any] = {
        "basket_id": basket_row["id"],
        "basket_name": basket_row["basket_name"],
        "start_date": basket_row["start_date"],
        "end_date": basket_row["end_date"],
        "total_initial_amount": float(basket_row["total_initial_amount"]),
        "created_at": basket_row["created_at"],
        "allocations": allocations,
    }

    if run_simulation:
        result["simulation"] = simulate_virtual_basket(
            allocations=allocations,
            start_date=basket_row["start_date"],
            end_date=basket_row["end_date"],
            db_path=db_path,
        )

    return result
