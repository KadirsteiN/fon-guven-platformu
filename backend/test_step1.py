"""
Adım 1 Gerçek Veri Testi ve Doğrulama Raporu Betiği
Dosya: backend/test_step1.py

Görevler:
1. Veritabanı tablolarını oluşturur.
2. Son 90 gün için 5 gerçek TEFAS fonunun (AFT, MAC, TTA, IPB, TI1) verilerini çekmeyi dener.
3. Gerçek veriler gelirse SQLite veritabanına kaydeder ve her fon için:
   - Çekilen toplam işlem günü sayısını,
   - En eski ve en güncel tarihi ve fiyatları,
   - Veritabanındaki toplam kayıt sayısını terminale yazdırır.
4. TEFAS WAF bağlantıyı engellerse ASLA sahte veri üretmez; hatayı açıkça raporlar.
"""

from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
import sys
import requests

from database import init_db, get_fund_stats, get_total_price_records, DB_PATH
from tefas_fetcher import fetch_tefas_history, TefasFetchError, TEFAS_PAGE_URL

TARGET_FUNDS = [
    ("AFT", "Yabancı Teknoloji"),
    ("MAC", "Hisse Senedi"),
    ("TTA", "Altın"),
    ("IPB", "Değişken"),
    ("TI1", "Para Piyasası"),
]


def resolve_reference_today() -> datetime:
    """
    Sistem saati ile gerçek dünya (TEFAS sunucu saati) arasında fark olup olmadığını
    kontrol eder; TEFAS sunucu Date başlığı okunabiliyorsa gerçek tarihi baz alır.
    """
    local_now = datetime.now()
    try:
        resp = requests.head(
            TEFAS_PAGE_URL,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            timeout=10,
        )
        server_date_str = resp.headers.get("Date")
        if server_date_str:
            server_dt = parsedate_to_datetime(server_date_str)
            # Eğer yerel sistem saati sunucu saatinden 5 günden fazla sapmışsa sunucu saatini kullan
            if abs((local_now.date() - server_dt.date()).days) > 5:
                print(
                    f"[BİLGİ] Yerel sistem tarihi ({local_now.strftime('%Y-%m-%d')}) ile "
                    f"TEFAS sunucu tarihi ({server_dt.strftime('%Y-%m-%d')}) farklı. "
                    f"Gerçek piyasa verisi için TEFAS sunucu tarihi baz alınıyor."
                )
                return server_dt.replace(tzinfo=None)
    except Exception:
        pass
    return local_now


def main() -> None:
    print("=" * 78)
    print("ADIM 1: VERİTABANI ŞEMASI VE TEFAS GERÇEK VERİ ÇEKME TESTİ")
    print("=" * 78)

    # 1. Veritabanı tablolarını oluştur
    init_db()
    print(f"[OK] SQLite veritabanı ve tablolar hazırlandı: {DB_PATH}")

    # 2. Son 90 gün tarih aralığını belirle
    end_dt = resolve_reference_today()
    start_dt = end_dt - timedelta(days=90)
    start_str = start_dt.strftime("%Y-%m-%d")
    end_str = end_dt.strftime("%Y-%m-%d")

    print(f"[BİLGİ] Sorgulanan 90 Günlük Tarih Aralığı: {start_str} -> {end_str}")
    print("-" * 78)

    success_count = 0
    failure_count = 0

    for idx, (fund_code, fund_type) in enumerate(TARGET_FUNDS):
        if idx > 0:
            import time
            time.sleep(2.0)
        print(f"\n>>> [{fund_code}] ({fund_type}) fonu için TEFAS API'den gerçek veri çekiliyor...")
        try:
            result = fetch_tefas_history(
                fund_code=fund_code,
                start_date_str=start_str,
                end_date_str=end_str,
                fund_type_label=fund_type,
            )

            stats = get_fund_stats(fund_code)
            total_days = stats["total_days"]
            oldest = stats["oldest"]
            newest = stats["newest"]

            print(f"    Fon Ünvanı            : {stats['fund_title'] or result.get('fund_title')}")
            print(f"    Kategori / Tür        : {stats['fund_type']}")
            print(f"    Çekilen İşlem Günü    : {total_days} gün")

            if oldest and newest:
                print(
                    f"    En Eski Tarih & Fiyat : {oldest['date']} | "
                    f"Fiyat: {oldest['price']:.6f} TL | "
                    f"Yatırımcı: {oldest['investor_count']} | "
                    f"Portföy: {oldest['total_value']:,.2f} TL"
                )
                print(
                    f"    En Güncel Tarih & Fiyat: {newest['date']} | "
                    f"Fiyat: {newest['price']:.6f} TL | "
                    f"Yatırımcı: {newest['investor_count']} | "
                    f"Portföy: {newest['total_value']:,.2f} TL"
                )
                success_count += 1
            else:
                print("    [UYARI] TEFAS API yanıt döndü ancak bu tarih aralığında kayıt bulunamadı (0 kayıt).")

        except TefasFetchError as waf_err:
            failure_count += 1
            print(f"    [HATA - GERÇEK VERİ ÇEKİLEMEDİ] {waf_err}")
            print("    [KURAL 1 GEREĞİ] Sahte (mock/dummy) veri ÜRETİLMEDİ.")
        except Exception as exc:
            failure_count += 1
            print(f"    [BEKLENMEYEN HATA] [{fund_code}]: {type(exc).__name__}: {exc}")
            print("    [KURAL 1 GEREĞİ] Sahte (mock/dummy) veri ÜRETİLMEDİ.")

    print("\n" + "=" * 78)
    total_db_records = get_total_price_records()
    print("DOĞRULAMA RAPORU ÖZETİ")
    print("=" * 78)
    print(f"Başarılı Fon Sayısı                    : {success_count} / {len(TARGET_FUNDS)}")
    print(f"Hata Alan / Engellenen Fon Sayısı      : {failure_count} / {len(TARGET_FUNDS)}")
    print(f"Veritabanındaki Toplam Fiyat Kaydı     : {total_db_records}")
    print("=" * 78)


if __name__ == "__main__":
    main()
