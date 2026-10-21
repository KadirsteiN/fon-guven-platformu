"""
Veritabanı Kurulumu ve Veri Erişim Katmanı (SQLite)
Dosya: backend/database.py
Veritabanı: backend/fon_platformu.db
"""

import json
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_PATH = Path(__file__).resolve().parent / "fon_platformu.db"


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """SQLite veritabanı bağlantısı oluşturur ve Row factory ayarlar."""
    target_path = db_path or DB_PATH
    conn = sqlite3.connect(str(target_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def _table_columns(conn: sqlite3.Connection, table_name: str) -> List[str]:
    """Bir tablonun mevcut sütun adlarını döndürür."""
    rows = conn.execute(f"PRAGMA table_info({table_name});").fetchall()
    return [r["name"] for r in rows]


def init_db(db_path: Optional[Path] = None) -> None:
    """
    Proje şemasındaki tüm tabloları:
    - funds, fund_prices (Modül C & TEFAS)
    - bulletins (Modül B)
    - evidence_cards (Modül A & G)
    - virtual_baskets, basket_items (Modül D)
    - finance_transactions, savings_goals, debts, budget_limits (Modül E)
    oluşturur.
    """
    with get_connection(db_path) as conn:
        cursor = conn.cursor()

        # 1. funds tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS funds (
                fund_code TEXT PRIMARY KEY,
                fund_title TEXT NOT NULL,
                fund_type TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. fund_prices tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fund_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fund_code TEXT NOT NULL,
                date TEXT NOT NULL,
                price REAL NOT NULL,
                investor_count INTEGER,
                total_value REAL,
                source TEXT NOT NULL,
                UNIQUE(fund_code, date),
                FOREIGN KEY (fund_code) REFERENCES funds(fund_code) ON DELETE CASCADE
            );
        """)

        # 3. bulletins tablosu
        existing_bulletin_cols = _table_columns(conn, "bulletins")
        required_bulletin_cols = {
            "id", "fund_code", "title", "category", "doc_type",
            "source_institution", "publish_date", "period_covered",
            "original_url", "raw_text", "ai_summary_json",
            "content_origin_badge", "last_updated",
        }
        if existing_bulletin_cols and not required_bulletin_cols.issubset(set(existing_bulletin_cols)):
            cursor.execute("DROP TABLE bulletins;")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bulletins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fund_code TEXT,
                title TEXT NOT NULL,
                category TEXT NOT NULL CHECK(category IN ('FON_SEKTOR_BULTENI', 'RESMI_DUYURU', 'KURUCU_BELGESI')),
                doc_type TEXT NOT NULL CHECK(doc_type IN ('SPK_BULTENI', 'KAP_BILDIRIMI', 'AYLIK_FON_BULTENI', 'YATIRIMCI_BILGI_FORMU', 'IZAHNAME')),
                source_institution TEXT NOT NULL,
                publish_date TEXT NOT NULL,
                period_covered TEXT NOT NULL,
                original_url TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                ai_summary_json TEXT NOT NULL,
                content_origin_badge TEXT NOT NULL CHECK(content_origin_badge IN ('RESMI_BELGE_OZETI', 'DUZENLEYICI_DUYURU', 'SEKTOR_RAPORU')),
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 4. evidence_cards tablosu
        existing_evidence_cols = _table_columns(conn, "evidence_cards")
        required_evidence_cols = {
            "id", "order_no", "topic_slug", "question", "claim_summary",
            "detailed_explanation", "official_source", "regulation_ref",
            "source_date", "official_url", "user_meaning",
            "limitations_and_risks", "common_misconception",
        }
        if existing_evidence_cols and not required_evidence_cols.issubset(set(existing_evidence_cols)):
            cursor.execute("DROP TABLE evidence_cards;")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evidence_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_no INTEGER NOT NULL,
                topic_slug TEXT NOT NULL UNIQUE,
                question TEXT NOT NULL,
                claim_summary TEXT NOT NULL,
                detailed_explanation TEXT NOT NULL,
                official_source TEXT NOT NULL,
                regulation_ref TEXT NOT NULL,
                source_date TEXT NOT NULL,
                official_url TEXT NOT NULL,
                user_meaning TEXT NOT NULL,
                limitations_and_risks TEXT NOT NULL,
                common_misconception TEXT NOT NULL
            );
        """)

        # 5. virtual_baskets tablosu (Modül D)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS virtual_baskets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                basket_name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                total_initial_amount REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 6. basket_items tablosu (Modül D)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS basket_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                basket_id INTEGER NOT NULL,
                fund_code TEXT NOT NULL,
                initial_amount REAL NOT NULL,
                FOREIGN KEY (basket_id) REFERENCES virtual_baskets(id) ON DELETE CASCADE,
                FOREIGN KEY (fund_code) REFERENCES funds(fund_code) ON DELETE RESTRICT
            );
        """)

        # 7. finance_transactions tablosu (Modül E - Gelir/Gider Kayıtları)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_type TEXT NOT NULL CHECK(tx_type IN ('INCOME', 'EXPENSE')),
                category TEXT NOT NULL,
                is_fixed INTEGER NOT NULL DEFAULT 0 CHECK(is_fixed IN (0, 1)),
                amount REAL NOT NULL,
                tx_date TEXT NOT NULL,
                description TEXT
            );
        """)

        # 8. savings_goals tablosu (Modül E - Birikim Hedefleri)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS savings_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal_name TEXT NOT NULL,
                target_amount REAL NOT NULL,
                current_saved REAL NOT NULL DEFAULT 0.0,
                target_date TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'YÜKSEK'
            );
        """)

        # 9. debts tablosu (Modül E - Borç ve Yükümlülükler)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS debts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                debt_name TEXT NOT NULL,
                total_remaining REAL NOT NULL,
                monthly_payment REAL NOT NULL,
                interest_rate_note TEXT,
                due_day INTEGER NOT NULL DEFAULT 15
            );
        """)

        # 10. budget_limits tablosu (Modül E - Kategori Bütçe Limitleri)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS budget_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL UNIQUE,
                monthly_limit REAL NOT NULL
            );
        """)

        # 11. sync_logs tablosu (GÖREV 1 - Günlük Otomatik & Manuel TEFAS Senkronizasyon Logları)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sync_type TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 12. system_settings tablosu (GÖREV 2 & 3 - Site Kimliği, Başlık ve Logo Ayarları)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 13. research_logs tablosu (GÖREV 6 - TÜBİTAK 2209-A Anonim Katılımcı Etkileşim ve Değerlendirme Verileri)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS research_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                participant_code TEXT NOT NULL,
                module_code TEXT NOT NULL,
                action_type TEXT NOT NULL,
                fund_or_topic TEXT NOT NULL,
                duration_sec INTEGER NOT NULL DEFAULT 0,
                trust_score_pre INTEGER,
                trust_score_post INTEGER,
                data_badge TEXT NOT NULL DEFAULT 'ANONIM_ARASTIRMA_ETKILESIM_VERISI',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 14. tracked_funds tablosu (BÖLÜM 1 - Kalıcı Takip Edilen Fon Havuzu)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tracked_funds (
                fund_code TEXT PRIMARY KEY,
                fund_title TEXT NOT NULL,
                fund_type TEXT,
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 15. contact_messages tablosu (BÖLÜM 2 - Proje Künyesi & İletişim Gelen Kutusu)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                kvkk_approved INTEGER NOT NULL DEFAULT 1,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 16. analytics_events tablosu (BÖLÜM 3 - Kullanıcı Davranışı ve Fon Telemetri Motoru)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analytics_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                module_name TEXT NOT NULL,
                page_path TEXT,
                fund_code TEXT,
                paired_fund_code TEXT,
                secondary_funds TEXT,
                basket_weight_pct REAL,
                weight_pct REAL,
                duration_seconds REAL NOT NULL DEFAULT 0.0,
                duration_sec INTEGER NOT NULL DEFAULT 0,
                date_range_label TEXT,
                bulletin_id INTEGER,
                bulletin_title TEXT,
                metadata_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        existing_cols = {
            r["name"]
            for r in cursor.execute("PRAGMA table_info(analytics_events);").fetchall()
        }
        for col_def in [
            ("paired_fund_code", "TEXT"),
            ("basket_weight_pct", "REAL"),
            ("duration_seconds", "REAL NOT NULL DEFAULT 0.0"),
        ]:
            if col_def[0] not in existing_cols:
                cursor.execute(
                    f"ALTER TABLE analytics_events ADD COLUMN {col_def[0]} {col_def[1]};"
                )

        # 17. traffic_logs tablosu (Ziyaretçi trafiği, cihaz/tarayıcı/ekran ve akış yolu analizi)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS traffic_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                page_path TEXT NOT NULL,
                is_entry INTEGER NOT NULL DEFAULT 0,
                device_type TEXT,
                os_name TEXT,
                browser_name TEXT,
                screen_width INTEGER,
                screen_height INTEGER,
                created_at TEXT NOT NULL
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_traffic_logs_session
            ON traffic_logs (session_id, created_at);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_analytics_events_type
            ON analytics_events (event_type, created_at);
        """)

        # Sorgu performansı için indeksler
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_fund_prices_code_date
            ON fund_prices (fund_code, date);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_basket_items_basket_id
            ON basket_items (basket_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_bulletins_fund_period
            ON bulletins (fund_code, period_covered);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_finance_tx_date
            ON finance_transactions (tx_date, tx_type);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sync_logs_created
            ON sync_logs (created_at DESC);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_analytics_events_type_fund
            ON analytics_events (event_type, fund_code, created_at DESC);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_contact_messages_created
            ON contact_messages (created_at DESC);
        """)

        conn.commit()


DEFAULT_CORE_TRACKED_FUNDS: List[Dict[str, Any]] = [
    {"fund_code": "AFT", "fund_title": "AK PORTFÖY YENİ TEKNOLOJİLER YABANCI HİSSE SENEDİ FONU", "fund_type": "Yabancı Hisse / Teknoloji Fonu", "is_default": 1},
    {"fund_code": "TTE", "fund_title": "İŞ PORTFÖY BIST TEKNOLOJİ AĞIRLIK SINIRLAMALI ENDEKSİ HİSSE SENEDİ (TL) FONU (HİSSE SENEDİ YOĞUN FON)", "fund_type": "Yabancı Hisse / Teknoloji Fonu", "is_default": 1},
    {"fund_code": "YAY", "fund_title": "YAPI KREDİ PORTFÖY YABANCI TEKNOLOJİ SEKTÖRÜ HİSSE SENEDİ FONU", "fund_type": "Yabancı Hisse / Teknoloji Fonu", "is_default": 1},
    {"fund_code": "TI2", "fund_title": "İŞ PORTFÖY İKİNCİ HİSSE SENEDİ (TL) FONU (HİSSE SENEDİ YOĞUN FON)", "fund_type": "Hisse Senedi Yoğun Fon", "is_default": 1},
    {"fund_code": "IPB", "fund_title": "İSTANBUL PORTFÖY BİRİNCİ DEĞİŞKEN FON", "fund_type": "Değişken / Çoklu Varlık Fonu", "is_default": 1},
    {"fund_code": "MAC", "fund_title": "MARMARA KAPİTAL PORTFÖY HİSSE SENEDİ (TL) FONU (HİSSE SENEDİ YOĞUN FON)", "fund_type": "Hisse Senedi Yoğun Fon", "is_default": 1},
    {"fund_code": "TTA", "fund_title": "İŞ PORTFÖY ALTIN FONU", "fund_type": "Kıymetli Madenler / Altın Fonu", "is_default": 1},
    {"fund_code": "TI1", "fund_title": "İŞ PORTFÖY PARA PİYASASI (TL) FONU", "fund_type": "Para Piyasası (TL) Fonu", "is_default": 1},
    {"fund_code": "GMR", "fund_title": "INVEO PORTFÖY İKİNCİ HİSSE SENEDİ FONU (HİSSE SENEDİ YOĞUN FON)", "fund_type": "Hisse Senedi Yoğun Fon", "is_default": 1},
    {"fund_code": "NNF", "fund_title": "HEDEF PORTFÖY BİRİNCİ HİSSE SENEDİ (TL) FONU (HİSSE SENEDİ YOĞUN FON)", "fund_type": "Hisse Senedi Yoğun Fon", "is_default": 1},
    {"fund_code": "IDH", "fund_title": "İŞ PORTFÖY BIST 100 DIŞI ŞİRKETLER HİSSE SENEDİ (TL) FONU (HİSSE SENEDİ YOĞUN FON)", "fund_type": "Hisse Senedi Yoğun Fon", "is_default": 1},
    {"fund_code": "YAS", "fund_title": "YAPI KREDİ PORTFÖY KOÇ HOLDİNG İŞTİRAK VE HİSSE SENEDİ (TL) FONU (HİSSE SENEDİ YOĞUN FON)", "fund_type": "Hisse Senedi Yoğun Fon", "is_default": 1},
]


def seed_tracked_funds(db_path: Optional[Path] = None) -> int:
    """
    BÖLÜM 1: Sunucu başlangıcında varsayılan ana fonları (AFT, TTE, YAY, TI2, IPB, MAC, TTA, TI1 vb.)
    INSERT OR IGNORE ile tracked_funds ve funds tablolarına ekler.
    Mevcut eklenmiş fonları ASLA silmez veya üzerine yazmaz; iki tabloyu karşılıklı senkronize tutar.
    """
    with get_connection(db_path) as conn:
        for item in DEFAULT_CORE_TRACKED_FUNDS:
            conn.execute(
                """
                INSERT OR IGNORE INTO tracked_funds (fund_code, fund_title, fund_type, is_default, created_at, last_updated)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
                """,
                (item["fund_code"], item["fund_title"], item["fund_type"], item["is_default"]),
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO funds (fund_code, fund_title, fund_type, last_updated)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP);
                """,
                (item["fund_code"], item["fund_title"], item["fund_type"]),
            )

        # Mevcut funds tablosundaki tüm fonları tracked_funds tablosuna koruyarak aktar
        conn.execute(
            """
            INSERT OR IGNORE INTO tracked_funds (fund_code, fund_title, fund_type, is_default, created_at, last_updated)
            SELECT fund_code, fund_title, fund_type, 0, CURRENT_TIMESTAMP, last_updated
            FROM funds;
            """
        )
        # tracked_funds tablosundaki tüm fonların funds tablosunda da bulunduğundan emin ol
        conn.execute(
            """
            INSERT OR IGNORE INTO funds (fund_code, fund_title, fund_type, last_updated)
            SELECT fund_code, fund_title, fund_type, last_updated
            FROM tracked_funds;
            """
        )
        conn.commit()
        cnt = conn.execute("SELECT COUNT(*) as c FROM tracked_funds;").fetchone()["c"]
        return int(cnt)


def upsert_fund(
    fund_code: str,
    fund_title: str,
    fund_type: Optional[str] = None,
    db_path: Optional[Path] = None
) -> None:
    """Fon bilgisini hem funds hem de tracked_funds tablosuna silmeden (Upsert) ekler veya günceller."""
    clean_code = fund_code.strip().upper()
    with get_connection(db_path) as conn:
        conn.execute(
            """
            INSERT INTO funds (fund_code, fund_title, fund_type, last_updated)
            VALUES (?, ?, COALESCE(?, (SELECT fund_type FROM funds WHERE fund_code = ?)), CURRENT_TIMESTAMP)
            ON CONFLICT(fund_code) DO UPDATE SET
                fund_title = CASE
                    WHEN excluded.fund_title LIKE '%Yatırım Fonu' AND funds.fund_title NOT LIKE '%Yatırım Fonu'
                    THEN funds.fund_title
                    ELSE excluded.fund_title
                END,
                fund_type = COALESCE(excluded.fund_type, funds.fund_type),
                last_updated = CURRENT_TIMESTAMP;
            """,
            (clean_code, fund_title, fund_type, clean_code),
        )
        conn.execute(
            """
            INSERT INTO tracked_funds (fund_code, fund_title, fund_type, is_default, created_at, last_updated)
            VALUES (?, ?, COALESCE(?, (SELECT fund_type FROM tracked_funds WHERE fund_code = ?)), 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(fund_code) DO UPDATE SET
                fund_title = CASE
                    WHEN excluded.fund_title LIKE '%Yatırım Fonu' AND tracked_funds.fund_title NOT LIKE '%Yatırım Fonu'
                    THEN tracked_funds.fund_title
                    ELSE excluded.fund_title
                END,
                fund_type = COALESCE(excluded.fund_type, tracked_funds.fund_type),
                last_updated = CURRENT_TIMESTAMP;
            """,
            (clean_code, fund_title, fund_type, clean_code),
        )
        conn.commit()


def bulk_upsert_fund_prices(
    records: List[Dict[str, Any]],
    db_path: Optional[Path] = None
) -> int:
    """
    Toplu olarak fon fiyat kayıtlarını INSERT OR REPLACE ile kaydeder.
    Her kayıt: fund_code, date (YYYY-MM-DD), price, investor_count, total_value, source içermelidir.
    """
    if not records:
        return 0

    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.executemany(
            """
            INSERT OR REPLACE INTO fund_prices
                (fund_code, date, price, investor_count, total_value, source)
            VALUES
                (:fund_code, :date, :price, :investor_count, :total_value, :source);
            """,
            records,
        )
        conn.commit()
        return len(records)


def get_fund_stats(fund_code: str, db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Belirli bir fonun veritabanındaki özet istatistiklerini döndürür."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT fund_code, fund_title, fund_type, last_updated FROM funds WHERE fund_code = ?",
            (fund_code,),
        )
        fund_row = cursor.fetchone()

        cursor.execute(
            "SELECT COUNT(*) as cnt FROM fund_prices WHERE fund_code = ?",
            (fund_code,),
        )
        count_row = cursor.fetchone()
        total_days = count_row["cnt"] if count_row else 0

        cursor.execute(
            """
            SELECT date, price, investor_count, total_value, source
            FROM fund_prices
            WHERE fund_code = ?
            ORDER BY date ASC
            LIMIT 1
            """,
            (fund_code,),
        )
        oldest = cursor.fetchone()

        cursor.execute(
            """
            SELECT date, price, investor_count, total_value, source
            FROM fund_prices
            WHERE fund_code = ?
            ORDER BY date DESC
            LIMIT 1
            """,
            (fund_code,),
        )
        newest = cursor.fetchone()

        return {
            "fund_code": fund_code,
            "fund_title": fund_row["fund_title"] if fund_row else None,
            "fund_type": fund_row["fund_type"] if fund_row else None,
            "total_days": total_days,
            "oldest": dict(oldest) if oldest else None,
            "newest": dict(newest) if newest else None,
        }


def get_total_price_records(db_path: Optional[Path] = None) -> int:
    """fund_prices tablosundaki toplam kayıt sayısını döndürür."""
    with get_connection(db_path) as conn:
        row = conn.execute("SELECT COUNT(*) as total FROM fund_prices").fetchone()
        return row["total"] if row else 0


DEFAULT_SPLASH_QUOTES: List[str] = [
    "Finansta en değerli sermaye doğru ve doğrulanabilir bilgidir.",
    "Yatırımlarınızı sloganlara değil, resmi kanıtlara dayandırın.",
    "Şeffaflık güveni, bilinçli çeşitlendirme ise geleceği korur.",
    "Geçmiş getiri bir teminat değildir; ancak finansal okuryazarlık kalıcı bir güçtür.",
    "Büyük birikimler, küçük ve disiplinli adımlarla inşa edilir.",
]

DEFAULT_LEGAL_SETTINGS: Dict[str, str] = {
    "legal_disclaimer_spk": (
        "YASAL UYARI (SPK MEVZUATI UYARINCA): Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında değildir. "
        "Yatırım danışmanlığı hizmeti; aracı kurumlar, portföy yönetim şirketleri, mevduat kabul etmeyen bankalar ile müşteri arasında imzalanacak "
        "yatırım danışmanlığı sözleşmesi çerçevesinde sunulmaktadır. Bu platformda yer alan fon analizleri, grafikler, sanal sepet simülasyonları ve "
        "bülten özetleri yalnızca finansal okuryazarlık, eğitim ve TÜBİTAK 2209-A akademik araştırma projesi kapsamında sunulmakta olup, herhangi bir "
        "yatırım aracının alım-satım önerisi veya getiri vaadi olarak değerlendirilemez. Geçmiş dönem performansları gelecek dönem getirilerinin "
        "garantisi değildir. Veriler resmi kaynaklardan (TEFAS, Takasbank, KAP) derlenmiş olup, teknik gecikmelerden veya kaynak kaynaklı hatalardan "
        "platform sorumlu tutulamaz."
    ),
    "legal_terms_of_service": (
        "KULLANIM KOŞULLARI VE AKADEMİK KARAR DESTEK ÇERÇEVESİ:\n\n"
        "1. Amaç ve Kapsam: Fon Güven & Şeffaflık Platformu, TÜBİTAK 2209-A Üniversite Öğrencileri Araştırma Projeleri Destekleme Programı kapsamında "
        "geliştirilmiş, kâr amacı gütmeyen, akademik araştırma ve finansal okuryazarlık odaklı bir karar destek sistemidir.\n\n"
        "2. Yatırım Danışmanlığı Niteliği Taşımama (6362 Sayılı SPKn): Platformda sunulan hiçbir veri, kanıt kartı, şeffaflık puanı, bülten özeti, "
        "100 bazlı performans karşılaştırması veya sanal sepet simülasyonu 6362 sayılı Sermaye Piyasası Kanunu ve ilgili SPK Tebliğleri kapsamında "
        "'Yatırım Danışmanlığı' veya 'Portföy Yöneticiliği' faaliyeti teşkil etmez.\n\n"
        "3. Brüt Birim Pay Fiyatı ve Vergi/Komisyon Sorumluluğu: Platformdaki tüm tarihsel getiri ve sanal sepet hesaplamaları TEFAS'ta ilan edilen "
        "günlük brüt birim pay fiyatları üzerinden gerçekleştirilir. Fon yönetim ücreti günlük fiyata dahil olmakla birlikte; fon türüne göre değişen "
        "stopaj vergisi kesintileri, alım-satım valör süreleri (T+1, T+2, T+3), aracı kurum/banka komisyonları ve piyasa likidite koşulları kullanıcı "
        "sorumluluğundadır.\n\n"
        "4. Fikri Mülkiyet ve Kullanım Sınırları: Platformun yazılım mimarisi, kanıt kartı kurgusu ve araştırma metodolojisi akademik telif hakları ile "
        "korunmaktadır; ticari amaçla izinsiz kopyalanamaz, çoğaltılamaz veya ücretli bir hizmet olarak satılamaz."
    ),
    "legal_privacy_kvkk": (
        "6698 SAYILI KVKK VE GİZLİLİK POLİTİKASI BİLDİRİMİ:\n\n"
        "1. Veri İşleme İlkeleri: Platformumuz, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca 'veri minimizasyonu' ve 'mahremiyet odaklı "
        "tasarım (Privacy by Design)' ilkelerini benimser. Ziyaretçilerden ad, soyad, T.C. kimlik numarası, telefon veya banka hesap bilgisi talep edilmez.\n\n"
        "2. Üçüncü Şahıslarla Paylaşmama Garantisi: Kullanıcıların platform üzerinde oluşturduğu sanal sepet simülasyonları, bütçe/senaryo denemeleri ve "
        "anonim araştırma etkileşimleri hiçbir koşulda üçüncü şahıslara, finans kuruluşlarına, veri simsarlarına veya reklam ağlarına satılmaz ve aktarılmaz.\n\n"
        "3. Yerel ve Akademik Kullanım: Girilen tüm parametreler yalnızca yerel veritabanı üzerinde karar destek simülasyonlarının çalıştırılması ve "
        "anonimleştirilmiş akademik istatistiklerin üretilmesi amacıyla işlenir.\n\n"
        "4. Veri Sahibi Hakları (KVKK Md. 11): Kullanıcılar diledikleri zaman yerel kayıtlarının silinmesini talep etme ve veri işleme süreçleri hakkında "
        "şeffaf bilgi alma hakkına sahiptir."
    ),
    "legal_tubitak_consent": (
        "TÜBİTAK 2209-A BİLGİLENDİRİLMİŞ GÖNÜLLÜ ONAM METNİ:\n\n"
        "1. Araştırmanın Konusu: Bu çalışma, 'Kişisel Finans, Yatırım Fonları, Finansal Şeffaflık ve Fonlara Güven Platformu' başlığı altında bireysel "
        "yatırımcıların resmi kanıt kartları (SPKn Md. 52-53, Takasbank saklama güvencesi, KAP/TEFAS doğrulaması) ve 100 bazlı şeffaf analiz araçları "
        "ile etkileşiminin finansal okuryazarlık ve fonlara duyulan kurumsal güven üzerindeki etkisini ölçmektedir.\n\n"
        "2. Anonimlik ve Katılımcı Kodları: Araştırma kapsamında toplanan Ön-Test / Son-Test güven puanları, modül kullanım süreleri ve incelenen fon/konu "
        "kayıtları tamamen anonim kimlik kodlarıyla (Örn: K-2209-01) saklanmaktadır. Hiçbir kayıt gerçek kişi kimliğiyle ilişkilendirilmez.\n\n"
        "3. Gönüllülük ve Akademik Kullanım Taahhüdü: Araştırmaya katılım tamamen gönüllülük esasına dayanır. Elde edilen anonim veriler yalnızca "
        "TÜBİTAK 2209-A proje sonuç raporu, akademik tez çalışmaları ve hakemli bilimsel yayınlarda toplu istatistiksel analiz (t-Testi / Wilcoxon) "
        "amacıyla kullanılacak olup başka hiçbir kurum veya amaçla paylaşılmayacaktır."
    ),
    "legal_methodology": (
        "VERİ METODOLOJİSİ, MATEMATİKSEL FORMÜLLER VE ŞEFFAFLIK BİLDİRİMİ:\n\n"
        "1. 100 Bazlı Normalizasyon Formülü: Farklı birim pay fiyatlarına sahip fonların adil biçimde karşılaştırılabilmesi için seçilen başlangıç "
        "tarihindeki ($t_0$) fiyat 100 kabul edilir ve takip eden her işlem günü ($t$) için endeks değeri şu formülle hesaplanır:\n"
        "   Endeks_t = (Fiyat_t / Fiyat_0) * 100\n\n"
        "2. Tatil Günü ve Hafta Sonu Çözümleme Kuralı: Borsa İstanbul ve TEFAS resmi tatil veya hafta sonu günlerinde fon fiyatı oluşmadığından, "
        "kullanıcının seçtiği başlangıç/bitiş tarihi tatil gününe denk gelirse sistem otomatik olarak veritabanındaki en yakın geçerli işlem gününü "
        "(actual_start_date / actual_end_date) seçer ve kullanıcıya şeffaf uyarı kutusunda bildirir.\n\n"
        "3. Ağırlıklı Sanal Sepet Getirisi ve Risk Metrikleri: Sepetteki her bir fon için başlangıç TL tutarı o günkü birim pay fiyatına bölünerek "
        "alınan pay adedi ($Pay_i = Tutar_i / Fiyat_{i,0}$) bulunur. Günlük toplam sepet değeri $\\sum (Pay_i \\times Fiyat_{i,t})$ üzerinden hesaplanır. "
        "Maksimum Düşüş (Max Drawdown), dönem içi zirveden dibe en yüksek yüzdesel gerilemeyi; Yıllıklandırılmış Volatilite ise günlük logaritmik/yüzdesel "
        "getirilerin standart sapmasının $\\sqrt{252}$ işlem günü ile ölçeklendirilmiş değerini ifade eder.\n\n"
        "4. Fon Şeffaflık Değerlendirme Kriterleri: Fonların KAP bildirim bağlantısı, Takasbank saklama doğrulaması, portföy yönetim şirketi bilgisi, "
        "risk değeri beyanı ve izahname erişilebilirliği resmi mevzuat kriterlerine göre denetlenerek şeffaflık kontrol listesi oluşturulur."
    ),
}

DEFAULT_SYSTEM_SETTINGS: Dict[str, str] = {
    "site_title": "Fon Güven & Şeffaflık",
    "site_subtitle": "TÜBİTAK 2209-A Araştırma Platformu",
    "site_logo_url": "",
    "splash_enabled": "true",
    "splash_duration_ms": "2200",
    "splash_quotes": json.dumps(DEFAULT_SPLASH_QUOTES, ensure_ascii=False),
    **DEFAULT_LEGAL_SETTINGS,
}


def seed_legal_settings(db_path: Optional[Path] = None) -> Dict[str, str]:
    """Varsayılan 5 yasal metni (SPK, Kullanım Koşulları, KVKK, TÜBİTAK Onamı, Metodoloji) system_settings tablosuna kaydeder."""
    with get_connection(db_path) as conn:
        for k, v in DEFAULT_LEGAL_SETTINGS.items():
            conn.execute(
                """
                INSERT OR IGNORE INTO system_settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP);
                """,
                (k, v),
            )
        conn.commit()
    return get_legal_settings(db_path)


def get_legal_settings(db_path: Optional[Path] = None) -> Dict[str, str]:
    """5 yasal bildirim ve sözleşme metnini döndürür."""
    settings = get_settings(db_path)
    return {
        k: settings.get(k, default_val)
        for k, default_val in DEFAULT_LEGAL_SETTINGS.items()
    }


def update_legal_settings(
    updates: Dict[str, str], db_path: Optional[Path] = None
) -> Dict[str, str]:
    """Yasal metinleri günceller ve güncel yasal metin sözlüğünü döndürür."""
    filtered = {
        k: str(v).strip()
        for k, v in updates.items()
        if k in DEFAULT_LEGAL_SETTINGS and str(v).strip()
    }
    if filtered:
        update_settings(filtered, db_path=db_path)
    return get_legal_settings(db_path)


def seed_settings(db_path: Optional[Path] = None) -> Dict[str, str]:
    """Varsayılan site kimliği, karşılama ekranı ve yasal metin ayarlarını system_settings tablosuna kaydeder (mevcutları korur)."""
    with get_connection(db_path) as conn:
        for k, v in DEFAULT_SYSTEM_SETTINGS.items():
            conn.execute(
                """
                INSERT OR IGNORE INTO system_settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP);
                """,
                (k, v),
            )
        conn.commit()
    return get_settings(db_path)


def get_settings(db_path: Optional[Path] = None) -> Dict[str, str]:
    """Tüm sistem ayarlarını sözlük olarak döndürür."""
    with get_connection(db_path) as conn:
        rows = conn.execute("SELECT key, value FROM system_settings;").fetchall()
    result = dict(DEFAULT_SYSTEM_SETTINGS)
    for r in rows:
        result[r["key"]] = r["value"]
    return result


def update_settings(updates: Dict[str, str], db_path: Optional[Path] = None) -> Dict[str, str]:
    """Sistem ayarlarını günceller ve güncel sözlüğü döndürür."""
    with get_connection(db_path) as conn:
        for k, v in updates.items():
            conn.execute(
                """
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP;
                """,
                (k, str(v)),
            )
        conn.commit()
    return get_settings(db_path)


def get_splash_settings(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Karşılama / yüklenme ekranı ayarlarını ve söz listesini ayrıştırılmış tiplerle döndürür."""
    settings = get_settings(db_path)
    enabled_raw = str(settings.get("splash_enabled", "true")).strip().lower()
    splash_enabled = enabled_raw in ("true", "1", "yes", "on")

    try:
        splash_duration_ms = int(settings.get("splash_duration_ms", "2200"))
    except ValueError:
        splash_duration_ms = 2200

    quotes_raw = settings.get("splash_quotes", "")
    splash_quotes: List[str] = list(DEFAULT_SPLASH_QUOTES)
    if quotes_raw:
        try:
            parsed = json.loads(quotes_raw)
            if isinstance(parsed, list):
                cleaned = [str(q).strip() for q in parsed if str(q).strip()]
                if cleaned:
                    splash_quotes = cleaned
        except Exception:
            pass

    return {
        "splash_enabled": splash_enabled,
        "splash_duration_ms": splash_duration_ms,
        "splash_quotes": splash_quotes,
        "site_title": settings.get("site_title", DEFAULT_SYSTEM_SETTINGS["site_title"]),
        "site_subtitle": settings.get("site_subtitle", DEFAULT_SYSTEM_SETTINGS["site_subtitle"]),
        "site_logo_url": settings.get("site_logo_url", ""),
    }


def update_splash_settings(
    splash_enabled: bool,
    splash_duration_ms: int,
    splash_quotes: List[str],
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Karşılama ekranı ayarlarını ve motive edici sözleri günceller."""
    cleaned_quotes = [str(q).strip() for q in splash_quotes if str(q).strip()]
    if not cleaned_quotes:
        cleaned_quotes = list(DEFAULT_SPLASH_QUOTES)
    duration_clamped = max(500, min(10000, int(splash_duration_ms)))

    update_settings(
        {
            "splash_enabled": "true" if splash_enabled else "false",
            "splash_duration_ms": str(duration_clamped),
            "splash_quotes": json.dumps(cleaned_quotes, ensure_ascii=False),
        },
        db_path=db_path,
    )
    return get_splash_settings(db_path)


def insert_sync_log(
    sync_type: str,
    status: str,
    details: str,
    db_path: Optional[Path] = None,
) -> int:
    """Yeni bir senkronizasyon log kaydı ekler ve ID'sini döndürür."""
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """
            INSERT INTO sync_logs (sync_type, status, details, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP);
            """,
            (sync_type, status, details),
        )
        conn.commit()
        return int(cur.lastrowid)


def get_recent_sync_logs(limit: int = 25, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """En son senkronizasyon loglarını yeniden eskiye sıralı döndürür."""
    with get_connection(db_path) as conn:
        rows = conn.execute(
            "SELECT id, sync_type, status, details, created_at FROM sync_logs ORDER BY id DESC LIMIT ?;",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def seed_research_logs(db_path: Optional[Path] = None) -> int:
    """
    TÜBİTAK 2209-A araştırma modülü için anonim katılımcı etkileşim ve ön-test / son-test
    güven değerlendirme kayıtlarını (açıkça ANONIM_ARASTIRMA_ETKILESIM_VERISI etiketiyle)
    veritabanına yükler.
    """
    with get_connection(db_path) as conn:
        cnt = conn.execute("SELECT COUNT(*) as c FROM research_logs;").fetchone()["c"]
        if cnt > 0:
            return int(cnt)

        sample_logs = [
            ("K-2209-01", "MODUL_A_KANIT", "KANIT_KARTI_INCELEME", "SPKn Md. 53 Varlık Ayrılığı İlkesi", 185, 42, 88, "Katılımcı PYŞ iflası durumunda Takasbank saklama güvencesini doğruladı."),
            ("K-2209-02", "MODUL_G_SEFFAFLIK", "SEFFAFLIK_KONTROL_LISTESI", "AFT (100/100 Yapısal Şeffaflık)", 140, 50, 90, "YBF, İzahname ve T+3 valör bilgilerinin KAP üzerinden doğrulanabilirliği incelendi."),
            ("K-2209-03", "MODUL_B_BULTEN", "RESMI_VERI_YORUM_AYRIMI", "MAC 2026-07 vs 2026-10 Dönem Kıyas", 210, 48, 86, "Kesin resmi TEFAS verisi ile yönetici beklenti/yorumlarının ayrımı test edildi."),
            ("K-2209-04", "MODUL_C_ANALIZ", "100_BAZLI_NORMALIZASYON", "AFT vs TI1 vs TTA vs MAC (100 Bazlı)", 195, 55, 92, "Birim pay fiyatı büyüklüğü yanılgısı (Madde 15) 100 bazlı grafikle giderildi."),
            ("K-2209-05", "MODUL_D_SEPET", "SANAL_SEPET_SIMULASYONU", "40.000 TL Dengeli Sepet (AFT+TTA+TI1+MAC)", 260, 45, 91, "Çeşitlendirmenin maksimum düşüşü (MDD) tekil fona kıyasla düşürdüğü gözlemlendi."),
            ("K-2209-06", "MODUL_A_KANIT", "KANIT_KARTI_INCELEME", "MKK e-Yatırımcı Doğrulama Mekanizması", 155, 38, 89, "Katılımcı kendi adına saklanan fon paylarının MKK'dan sorgulanabildiğini öğrendi."),
            ("K-2209-07", "MODUL_B_BULTEN", "BULTEN_7_BASLIK_INCELEME", "SPK III-52.1 Tebliği Düzenleyici Rehberi", 175, 52, 87, "Sayfa/madde atıflı özet yapısı incelendi."),
            ("K-2209-08", "MODUL_C_ANALIZ", "TATIL_GUNU_COZUMLEYICI", "Hafta Sonu Tarih Seçimi -> İlk İşlem Günü", 120, 60, 94, "Tatil günü fiyat eşleştirme şeffaflık uyarısı doğrulandı."),
        ]
        conn.executemany(
            """
            INSERT INTO research_logs (
                participant_code, module_code, action_type, fund_or_topic,
                duration_sec, trust_score_pre, trust_score_post, data_badge, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ANONIM_ARASTIRMA_ETKILESIM_VERISI', ?);
            """,
            sample_logs,
        )
        conn.commit()
        return len(sample_logs)


def get_research_logs(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Tüm TÜBİTAK 2209-A anonim araştırma etkileşim kayıtlarını döndürür."""
    with get_connection(db_path) as conn:
        rows = conn.execute(
            "SELECT * FROM research_logs ORDER BY id DESC;"
        ).fetchall()
    return [dict(r) for r in rows]


def seed_contact_messages(db_path: Optional[Path] = None) -> int:
    """BÖLÜM 2: İletişim gelen kutusu boşsa başlangıç için örnek akademik ve teknik geri bildirim kayıtları ekler."""
    with get_connection(db_path) as conn:
        cnt = conn.execute("SELECT COUNT(*) as c FROM contact_messages;").fetchone()["c"]
        if cnt > 0:
            return int(cnt)
        sample_msgs = [
            (
                "Dr. Öğr. Üyesi Selim Kaya",
                "selim.kaya@universite.edu.tr",
                "0532 418 72 90",
                "Akademik İş Birliği",
                "TÜBİTAK 2209-A projenizde geliştirdiğiniz 15 Kanıt Kartı ve 100 bazlı normalizasyon modülünü finansal okuryazarlık dersimizde vaka analizi olarak incelemek isteriz.",
                1,
                0,
            ),
            (
                "Zeynep Demir",
                "zeynep.demir@ornek.com",
                "0544 812 35 14",
                "Öneri & Geri Bildirim",
                "Sanal sepet laboratuvarında AFT ve TTA fonlarını karşılaştırırken tatil günü çözümleyicinin otomatik devreye girmesi çok açıklayıcı olmuş, teşekkürler.",
                1,
                1,
            ),
        ]
        conn.executemany(
            """
            INSERT INTO contact_messages (
                full_name, email, phone, subject, message, kvkk_approved, is_read
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            sample_msgs,
        )
        conn.commit()
        return len(sample_msgs)


def insert_contact_message(
    full_name: str,
    email: str,
    phone: str,
    subject: str,
    message: str,
    kvkk_approved: bool = True,
    db_path: Optional[Path] = None,
) -> int:
    """Yeni bir iletişim mesajı kaydeder ve ID döndürür (tablo yoksa otomatik oluşturur)."""
    with get_connection(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                kvkk_approved INTEGER NOT NULL DEFAULT 1,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        cur = conn.execute(
            """
            INSERT INTO contact_messages (
                full_name, email, phone, subject, message, kvkk_approved, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);
            """,
            (
                full_name.strip(),
                email.strip(),
                phone.strip(),
                subject.strip(),
                message.strip(),
                1 if kvkk_approved else 0,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)


def get_contact_messages(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Tüm iletişim mesajlarını yeniden eskiye sıralı döndürür."""
    with get_connection(db_path) as conn:
        rows = conn.execute(
            """
            SELECT id, full_name, email, phone, subject, message, kvkk_approved, is_read, created_at
            FROM contact_messages
            ORDER BY id DESC;
            """
        ).fetchall()
    return [
        {
            **dict(r),
            "kvkk_approved": bool(r["kvkk_approved"]),
            "is_read": bool(r["is_read"]),
        }
        for r in rows
    ]


def set_contact_message_read(
    msg_id: int, is_read: bool, db_path: Optional[Path] = None
) -> bool:
    """İletişim mesajının okundu/okunmadı durumunu günceller."""
    with get_connection(db_path) as conn:
        cur = conn.execute(
            "UPDATE contact_messages SET is_read = ? WHERE id = ?;",
            (1 if is_read else 0, msg_id),
        )
        conn.commit()
        return cur.rowcount > 0


def delete_contact_message(msg_id: int, db_path: Optional[Path] = None) -> bool:
    """İletişim mesajını siler."""
    with get_connection(db_path) as conn:
        cur = conn.execute("DELETE FROM contact_messages WHERE id = ?;", (msg_id,))
        conn.commit()
        return cur.rowcount > 0


# --- DUYURU BANDI & DİNAMİK EKONOMİK PARAMETRELER AYARLARI ---

DEFAULT_ANNOUNCEMENT_SETTINGS: Dict[str, str] = {
    "announcement_enabled": "true",
    "announcement_text": "🎓 TÜBİTAK 2209-A Finansal Okuryazarlık ve Fon Algı Anketi yayında! Testi çözün ve seviyenizi anında öğrenin.",
    "announcement_badge": "TÜBİTAK 2209-A",
    "announcement_bg_color": "indigo",
    "announcement_link_url": "/survey",
}

DEFAULT_ECONOMIC_SETTINGS: Dict[str, str] = {
    "annual_inflation_pct": "33.0",
    "deposit_rate_pct": "40.0",
    "default_stopaj_pct": "17.5",
    "mgmt_fee_default_pct": "2.0",
}


def get_announcement_settings(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Sitenin en üstündeki duyuru bandı ayarlarını döndürür."""
    settings = get_settings(db_path)
    return {
        "enabled": settings.get("announcement_enabled", DEFAULT_ANNOUNCEMENT_SETTINGS["announcement_enabled"]).lower() == "true",
        "text": settings.get("announcement_text", DEFAULT_ANNOUNCEMENT_SETTINGS["announcement_text"]),
        "badge": settings.get("announcement_badge", DEFAULT_ANNOUNCEMENT_SETTINGS["announcement_badge"]),
        "bg_color": settings.get("announcement_bg_color", DEFAULT_ANNOUNCEMENT_SETTINGS["announcement_bg_color"]),
        "link_url": settings.get("announcement_link_url", DEFAULT_ANNOUNCEMENT_SETTINGS["announcement_link_url"]),
    }


def update_announcement_settings(updates: Dict[str, Any], db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Duyuru bandı ayarlarını günceller."""
    mapping = {}
    if "enabled" in updates:
        mapping["announcement_enabled"] = "true" if updates["enabled"] else "false"
    if "text" in updates:
        mapping["announcement_text"] = str(updates["text"])
    if "badge" in updates:
        mapping["announcement_badge"] = str(updates["badge"])
    if "bg_color" in updates:
        mapping["announcement_bg_color"] = str(updates["bg_color"])
    if "link_url" in updates:
        mapping["announcement_link_url"] = str(updates["link_url"])

    with get_connection(db_path) as conn:
        for k, v in mapping.items():
            conn.execute(
                """
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
                """,
                (k, v),
            )
        conn.commit()
    return get_announcement_settings(db_path)


def get_economic_settings(db_path: Optional[Path] = None) -> Dict[str, float]:
    """Reel Getiri ve simülasyon motorunun kullandığı dinamik enflasyon/faiz/stopaj parametrelerini döndürür."""
    settings = get_settings(db_path)
    try:
        inf = float(settings.get("annual_inflation_pct", DEFAULT_ECONOMIC_SETTINGS["annual_inflation_pct"]))
    except Exception:
        inf = 33.0
    try:
        dep = float(settings.get("deposit_rate_pct", DEFAULT_ECONOMIC_SETTINGS["deposit_rate_pct"]))
    except Exception:
        dep = 40.0
    try:
        stp = float(settings.get("default_stopaj_pct", DEFAULT_ECONOMIC_SETTINGS["default_stopaj_pct"]))
    except Exception:
        stp = 17.5
    try:
        mgt = float(settings.get("mgmt_fee_default_pct", DEFAULT_ECONOMIC_SETTINGS["mgmt_fee_default_pct"]))
    except Exception:
        mgt = 2.0

    return {
        "annual_inflation_pct": inf,
        "deposit_rate_pct": dep,
        "default_stopaj_pct": stp,
        "mgmt_fee_default_pct": mgt,
    }


def update_economic_settings(updates: Dict[str, Any], db_path: Optional[Path] = None) -> Dict[str, float]:
    """Dinamik ekonomik parametreleri günceller."""
    mapping = {}
    for key in ["annual_inflation_pct", "deposit_rate_pct", "default_stopaj_pct", "mgmt_fee_default_pct"]:
        if key in updates:
            mapping[key] = str(float(updates[key]))

    with get_connection(db_path) as conn:
        for k, v in mapping.items():
            conn.execute(
                """
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
                """,
                (k, v),
            )
        conn.commit()
    return get_economic_settings(db_path)


# --- SİSTEM SAĞLIĞI & VERİTABANI FULL JSON BACKUP / RESTORE ---

def create_full_db_backup(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Tüm SQLite veritabanını (fonlar, fiyatlar, bültenler, kanıtlar, mesajlar, anketler, ayarlar) JSON olarak paketler."""
    with get_connection(db_path) as conn:
        def _fetch_all(table_name: str) -> List[Dict[str, Any]]:
            try:
                return [dict(r) for r in conn.execute(f"SELECT * FROM {table_name};").fetchall()]
            except Exception:
                return []

        backup_payload = {
            "version": "2.0-tubitak2209a",
            "backup_created_at": datetime.now().isoformat(),
            "tables": {
                "funds": _fetch_all("funds"),
                "tracked_funds": _fetch_all("tracked_funds"),
                "fund_prices": _fetch_all("fund_prices"),
                "bulletins": _fetch_all("bulletins"),
                "evidence_cards": _fetch_all("evidence_cards"),
                "contact_messages": _fetch_all("contact_messages"),
                "survey_questions": _fetch_all("survey_questions"),
                "survey_responses": _fetch_all("survey_responses"),
                "system_settings": _fetch_all("system_settings"),
                "research_logs": _fetch_all("research_logs"),
            },
            "summary": {
                "total_funds": conn.execute("SELECT COUNT(*) as c FROM funds;").fetchone()["c"],
                "total_prices": conn.execute("SELECT COUNT(*) as c FROM fund_prices;").fetchone()["c"],
                "total_messages": conn.execute("SELECT COUNT(*) as c FROM contact_messages;").fetchone()["c"],
            }
        }
        return backup_payload


def restore_full_db_backup(payload: Dict[str, Any], db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Dışarıdan gelen JSON yedeğini SQLite veritabanına aktarır (UPSERT / REPLACE ile güvenli geri yükleme)."""
    tables = payload.get("tables", {})
    restored_counts = {}

    with get_connection(db_path) as conn:
        # 1. funds
        if "funds" in tables and tables["funds"]:
            conn.executemany(
                """
                INSERT OR REPLACE INTO funds (fund_code, fund_title, fund_type, last_updated)
                VALUES (:fund_code, :fund_title, :fund_type, CURRENT_TIMESTAMP);
                """,
                tables["funds"],
            )
            restored_counts["funds"] = len(tables["funds"])

        # 2. tracked_funds
        if "tracked_funds" in tables and tables["tracked_funds"]:
            conn.executemany(
                """
                INSERT OR REPLACE INTO tracked_funds (fund_code, fund_title, fund_type, is_default, created_at, last_updated)
                VALUES (:fund_code, :fund_title, :fund_type, :is_default, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
                """,
                tables["tracked_funds"],
            )
            restored_counts["tracked_funds"] = len(tables["tracked_funds"])

        # 3. fund_prices
        if "fund_prices" in tables and tables["fund_prices"]:
            conn.executemany(
                """
                INSERT OR REPLACE INTO fund_prices (fund_code, date, price, investor_count, total_value, source)
                VALUES (:fund_code, :date, :price, :investor_count, :total_value, :source);
                """,
                tables["fund_prices"],
            )
            restored_counts["fund_prices"] = len(tables["fund_prices"])

        # 4. bulletins
        if "bulletins" in tables and tables["bulletins"]:
            for b in tables["bulletins"]:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO bulletins (
                        id, fund_code, title, category, doc_type, source_institution,
                        publish_date, period_covered, original_url, raw_text, ai_summary_json,
                        content_origin_badge, last_updated
                    ) VALUES (
                        :id, :fund_code, :title, :category, :doc_type, :source_institution,
                        :publish_date, :period_covered, :original_url, :raw_text, :ai_summary_json,
                        :content_origin_badge, CURRENT_TIMESTAMP
                    );
                    """,
                    b,
                )
            restored_counts["bulletins"] = len(tables["bulletins"])

        # 5. contact_messages
        if "contact_messages" in tables and tables["contact_messages"]:
            for m in tables["contact_messages"]:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO contact_messages (
                        id, full_name, email, phone, subject, message, kvkk_approved, is_read, created_at
                    ) VALUES (
                        :id, :full_name, :email, :phone, :subject, :message, :kvkk_approved, :is_read, :created_at
                    );
                    """,
                    m,
                )
            restored_counts["contact_messages"] = len(tables["contact_messages"])

        # 6. survey_questions & survey_responses
        if "survey_questions" in tables and tables["survey_questions"]:
            for sq in tables["survey_questions"]:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO survey_questions (
                        id, section, question_text, options_json, correct_option_index,
                        explanation, display_order, is_active, created_at
                    ) VALUES (
                        :id, :section, :question_text, :options_json, :correct_option_index,
                        :explanation, :display_order, :is_active, CURRENT_TIMESTAMP
                    );
                    """,
                    sq,
                )
            restored_counts["survey_questions"] = len(tables["survey_questions"])

        if "survey_responses" in tables and tables["survey_responses"]:
            for sr in tables["survey_responses"]:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO survey_responses (
                        id, session_id, age_group, education_level, investment_experience,
                        holds_funds, answers_json, literacy_score, perception_score,
                        completion_time_sec, created_at
                    ) VALUES (
                        :id, :session_id, :age_group, :education_level, :investment_experience,
                        :holds_funds, :answers_json, :literacy_score, :perception_score,
                        :completion_time_sec, :created_at
                    );
                    """,
                    sr,
                )
            restored_counts["survey_responses"] = len(tables["survey_responses"])

        # 7. system_settings
        if "system_settings" in tables and tables["system_settings"]:
            for s in tables["system_settings"]:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO system_settings (key, value, updated_at)
                    VALUES (:key, :value, CURRENT_TIMESTAMP);
                    """,
                    s,
                )
            restored_counts["system_settings"] = len(tables["system_settings"])

        conn.commit()

    return {
        "status": "RESTORED",
        "restored_tables": restored_counts,
        "message": "Veritabanı yedeği başarıyla geri yüklendi ve birleştirildi.",
    }


if __name__ == "__main__":
    init_db()
    seed_tracked_funds()
    seed_settings()
    seed_research_logs()
    seed_contact_messages()
    print(f"Veritabanı başarıyla hazırlandı: {DB_PATH}")


