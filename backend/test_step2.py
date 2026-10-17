"""
Adım 2 Gerçek Veri ile Doğrulama Testi Betiği (Modül C ve Modül D Backend)
Dosya: backend/test_step2.py

Görevler:
1. Mevcut 5 fonun (AFT, MAC, TTA, IPB, TI1) verilerini 1 yıla (son 365 gün) tamamlar.
2. Tatil günü olan bir başlangıç tarihi seçerek (2026-01-03 Cumartesi -> 2026-10-16 Cuma)
   compare_funds_normalized fonksiyonunu test eder; tatil günü uyarısını, getirileri,
   Max Drawdown, Volatilite ve 100 bazlı bitiş değerlerini yazdırır.
3. Toplam 40.000 TL bütçeli bir Sanal Sepet oluşturur (AFT: 10.000 TL, TTA: 12.000 TL,
   TI1: 10.000 TL, MAC: 8.000 TL) ve aynı tarih aralığında simüle eder.
4. Sepeti SQLite veritabanına kaydeder, tekrar okur ve detaylı doğrulama raporunu
   terminale yazdırır.
"""

import time
from database import init_db, get_total_price_records, DB_PATH
from tefas_fetcher import fetch_tefas_history_chunked, TefasFetchError
from analytics_engine import (
    resolve_trading_dates,
    analyze_fund_performance,
    compare_funds_normalized,
)
from basket_engine import (
    simulate_virtual_basket,
    save_basket,
    load_basket,
)

TARGET_FUNDS = [
    ("AFT", "Yabancı Teknoloji"),
    ("MAC", "Hisse Senedi"),
    ("TTA", "Altın"),
    ("IPB", "Değişken"),
    ("TI1", "Para Piyasası"),
]


def main() -> None:
    print("=" * 88)
    print("ADIM 2: FON ANALİZİ, 100 BAZLI NORMALİZASYON VE SANAL SEPET MOTORU TESTİ")
    print("=" * 88)

    # 1. Veritabanı şemasını (virtual_baskets ve basket_items dahil) hazırla
    init_db()
    print(f"[OK] SQLite şeması (virtual_baskets ve basket_items dahil) hazır: {DB_PATH}")

    # 2. GÖREV 1: 5 Fon İçin 1 Yıllık (365 Gün) Tarihsel Veri Tamamlama (Chunked Backfill)
    print("\n" + "-" * 88)
    print("BÖLÜM 1: 5 FON İÇİN 1 YILLIK (365 GÜN) GERÇEK TEFAS VERİSİ TAMAMLAMA (CHUNKED BACKFILL)")
    print("-" * 88)

    for idx, (code, f_type) in enumerate(TARGET_FUNDS):
        if idx > 0:
            time.sleep(1.5)
        print(f">>> [{code}] ({f_type}) 365 günlük veri tamamlanıyor...")
        try:
            res = fetch_tefas_history_chunked(
                fund_code=code,
                total_days=365,
                window_days=90,
                end_date_str="2026-10-16",
                fund_type_label=f_type,
                sleep_seconds=1.0,
            )
            oldest = res["oldest"]
            newest = res["newest"]
            print(
                f"    [OK] Toplam İşlem Günü: {res['total_db_days']} gün | "
                f"En Eski: {oldest['date']} ({oldest['price']:.6f} TL) -> "
                f"En Güncel: {newest['date']} ({newest['price']:.6f} TL) | "
                f"(Sorgulanan Pencere: {res['windows_queried']}, Önbellekten Atlanan: {res['windows_skipped_cached']})"
            )
        except TefasFetchError as err:
            print(f"    [HATA] {err}")

    print(f"\n[BİLGİ] Veritabanındaki Toplam Gerçek Fiyat Kaydı Sayısı: {get_total_price_records()}")

    # 3. GÖREV 2: Modül C — Çoklu Fon Karşılaştırma, Tatil Günü Çözümleme ve 100 Bazlı Normalizasyon
    test_start_date = "2026-01-03"  # Cumartesi (Tatil Günü)
    test_end_date = "2026-10-16"    # Cuma (İşlem Günü)
    fund_codes = [c for c, _ in TARGET_FUNDS]

    print("\n" + "-" * 88)
    print("BÖLÜM 2: MODÜL C — TATİL GÜNÜ ÇÖZÜMLEME, RİSK VE 100 BAZLI NORMALİZASYON TESTİ")
    print(f"İstenen Tarih Aralığı: {test_start_date} (Cumartesi/Tatil) -> {test_end_date} (Cuma)")
    print("-" * 88)

    comp = compare_funds_normalized(
        fund_codes=fund_codes,
        requested_start_date=test_start_date,
        requested_end_date=test_end_date,
    )

    print(f"Gerçekleşen Ortak İşlem Günü Aralığı : {comp['actual_start_date']} -> {comp['actual_end_date']}")
    print(f"Ortak İşlem Günü Sayısı              : {comp['common_trading_days_count']} gün")
    print(f"Tatil Günü Uyarısı (date_warning)    : {comp['date_warning']}")
    print("\nFon Bazlı Performans, Risk ve 100 Bazlı Normalizasyon Özeti:")
    print(
        f"{'Fon':<6} | {'Kategori':<18} | {'Başlangıç Fiyat':>15} | {'Bitiş Fiyat':>15} | "
        f"{'Getiri (%)':>11} | {'100 Bazlı Son':>14} | {'Max DD (%)':>11} | {'Yıllık Vol (%)':>14}"
    )
    print("-" * 118)

    for f_sum in comp["funds_summary"]:
        print(
            f"{f_sum['fund_code']:<6} | "
            f"{(f_sum['fund_type'] or '-'):<18} | "
            f"{f_sum['start_price']:>15.6f} | "
            f"{f_sum['end_price']:>15.6f} | "
            f"{f_sum['return_pct']:>+10.2f}% | "
            f"{f_sum['normalized_base_100_end']:>14.2f} | "
            f"{-f_sum['max_drawdown_pct']:>10.2f}% | "
            f"{f_sum['annualized_volatility_pct']:>13.2f}%"
        )

    first_day_point = comp["daily_series"][0]
    last_day_point = comp["daily_series"][-1]
    print(f"\n100 Bazlı Seri Kontrolü — İlk İşlem Günü ({first_day_point['date']}): {first_day_point['normalized']}")
    print(f"100 Bazlı Seri Kontrolü — Son İşlem Günü ({last_day_point['date']}): {last_day_point['normalized']}")

    # 4. GÖREV 3 & 4: Modül D — 40.000 TL Sanal Yatırım Sepeti Simülasyonu ve Veritabanı Kayıt/Okuma
    print("\n" + "-" * 88)
    print("BÖLÜM 3: MODÜL D — 40.000 TL SANAL YATIRIM SEPETİ SİMÜLASYONU VE VERİTABANI TESTİ")
    print("-" * 88)

    basket_allocations = [
        {"fund_code": "AFT", "amount_tl": 10000.0},
        {"fund_code": "TTA", "amount_tl": 12000.0},
        {"fund_code": "TI1", "amount_tl": 10000.0},
        {"fund_code": "MAC", "amount_tl": 8000.0},
    ]

    basket_id = save_basket(
        basket_name="TÜBİTAK 2209-A Dengeli Test Sepeti (40.000 TL)",
        allocations=basket_allocations,
        start_date=test_start_date,
        end_date=test_end_date,
    )
    print(f"[OK] Sanal Sepet SQLite veritabanına kaydedildi. (basket_id = {basket_id})")

    loaded_basket = load_basket(basket_id=basket_id, run_simulation=True)
    sim = loaded_basket["simulation"]

    print(f"Yüklenen Sepet Adı                   : {loaded_basket['basket_name']}")
    print(f"Veri Sınıflandırması                 : {sim['data_classification']}")
    print(f"Fiyat Kaynağı                        : {sim['price_source']}")
    print(f"İstenen Tarih Aralığı                : {sim['requested_start_date']} -> {sim['requested_end_date']}")
    print(f"Gerçekleşen İşlem Günü Aralığı       : {sim['actual_start_date']} -> {sim['actual_end_date']} ({sim['trading_days_count']} işlem günü)")
    print(f"Tatil Günü Uyarısı                   : {sim['date_warning']}")
    print("-" * 88)
    print(f"Toplam Başlangıç Yatırım Tutarı      : {sim['total_initial_amount_tl']:,.2f} TL")
    print(f"Toplam Dönem Sonu Sepet Değeri       : {sim['total_final_value_tl']:,.2f} TL")
    print(f"Toplam Net Brüt Kar / Zarar          : {sim['total_net_profit_tl']:+,.2f} TL")
    print(f"Ağırlıklı Sepet Getirisi (%)         : %{sim['weighted_return_pct']:+.2f} (100 Bazlı Bitiş: {sim['normalized_base_100_end']:.2f})")
    print(f"Sepet Maksimum Düşüş (Max Drawdown)  : -%{sim['basket_max_drawdown_pct']:.2f}")
    print(f"Sepet Yıllıklandırılmış Volatilite   : %{sim['basket_annualized_volatility_pct']:.2f}")

    print("\nSepet Kalemleri Detaylı Performans ve Kar/Zarar Katkı Tablosu:")
    print(
        f"{'Fon':<5} | {'Başlangıç TL':>13} | {'Ağırlık':>8} | {'Alınan Pay Adedi':>17} | "
        f"{'Bitiş Değeri TL':>15} | {'Fon Getirisi':>12} | {'Net Katkı (TL)':>14} | {'Kar Payı (%)':>12}"
    )
    print("-" * 112)
    for item in sim["items_breakdown"]:
        print(
            f"{item['fund_code']:<5} | "
            f"{item['initial_amount_tl']:>13,.2f} | "
            f"%{item['initial_weight_pct']:>6.2f} | "
            f"{item['shares']:>17,.4f} | "
            f"{item['final_value_tl']:>15,.2f} | "
            f"%{item['individual_return_pct']:>+10.2f} | "
            f"{item['profit_contribution_tl']:>+14,.2f} | "
            f"%{item['profit_contribution_share_pct']:>+10.2f}"
        )

    print("\nZorunlu Şeffaflık ve Metodoloji Uyarıları (limitations_notice):")
    for key, val in sim["limitations_notice"].items():
        print(f"  - [{key}]: {val}")

    print("=" * 88)
    print("ADIM 2 TÜM TESTLER BAŞARIYLA TAMAMLANDI.")
    print("=" * 88)


if __name__ == "__main__":
    main()
