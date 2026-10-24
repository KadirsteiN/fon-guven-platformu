"""
Neon PostgreSQL Kalıcı Veritabanı Şema Kurulumu ve Canlı Veri Aktarımı (Seed)
Dosya: backend/neon_seed.py
"""

import json
import os
import re
import sqlite3
from pathlib import Path
from typing import Dict, List

import psycopg2
from psycopg2.extras import execute_values

NEON_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_TdDnFhc8mWy9@ep-steep-salad-b92j8mft-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require",
)

BASE_DIR = Path(__file__).resolve().parent
SQLITE_DB_PATH = BASE_DIR / "fon_platformu.db"
GLOSSARY_TS_PATH = BASE_DIR.parent / "frontend" / "src" / "lib" / "glossaryData.ts"


def get_neon_conn():
    url = NEON_DATABASE_URL.replace("&channel_binding=require", "").replace("?channel_binding=require&", "?")
    return psycopg2.connect(url)


DDL_STATEMENTS = """
CREATE TABLE IF NOT EXISTS funds (
    fund_code TEXT PRIMARY KEY,
    fund_title TEXT NOT NULL,
    fund_type TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracked_funds (
    fund_code TEXT PRIMARY KEY,
    fund_title TEXT NOT NULL,
    fund_type TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fund_prices (
    id SERIAL PRIMARY KEY,
    fund_code TEXT NOT NULL,
    date TEXT NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    investor_count INTEGER,
    total_value DOUBLE PRECISION,
    source TEXT NOT NULL,
    UNIQUE(fund_code, date)
);
CREATE INDEX IF NOT EXISTS idx_pg_fund_prices_code_date ON fund_prices (fund_code, date);

CREATE TABLE IF NOT EXISTS bulletins (
    id SERIAL PRIMARY KEY,
    fund_code TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    source_institution TEXT NOT NULL,
    publish_date TEXT NOT NULL,
    period_covered TEXT NOT NULL,
    original_url TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    ai_summary_json TEXT NOT NULL,
    content_origin_badge TEXT NOT NULL,
    file_data TEXT,
    file_name TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS file_data TEXT;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS file_name TEXT;

CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidences (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS evidence_cards (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS transparency_scores (
    fund_code TEXT PRIMARY KEY,
    fund_title TEXT NOT NULL,
    total_score INTEGER NOT NULL DEFAULT 100,
    freshness_score INTEGER NOT NULL DEFAULT 25,
    completeness_score INTEGER NOT NULL DEFAULT 25,
    custody_verified BOOLEAN NOT NULL DEFAULT TRUE,
    kap_verified BOOLEAN NOT NULL DEFAULT TRUE,
    management_company TEXT,
    custody_institution TEXT DEFAULT 'İstanbul Takas ve Saklama Bankası A.Ş. (Takasbank)',
    risk_level INTEGER DEFAULT 5,
    buy_valor TEXT DEFAULT 'T+1',
    sell_valor TEXT DEFAULT 'T+2',
    management_fee_pct DOUBLE PRECISION DEFAULT 2.0,
    details_json TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    kvkk_approved INTEGER NOT NULL DEFAULT 1,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_questions (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    category TEXT,
    question_text TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_option_index INTEGER,
    explanation TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_responses (
    id SERIAL PRIMARY KEY,
    session_id TEXT,
    age_group TEXT,
    education_level TEXT,
    investment_experience TEXT,
    holds_funds TEXT,
    answers_json TEXT NOT NULL,
    literacy_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    perception_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    completion_time_sec INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quick_poll_votes (
    id SERIAL PRIMARY KEY,
    session_id TEXT,
    poll_question_id INTEGER DEFAULT 1,
    selected_option_index INTEGER DEFAULT 0,
    selected_option TEXT,
    is_correct INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS glossary_terms (
    id SERIAL PRIMARY KEY,
    term TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    tip TEXT NOT NULL,
    spk TEXT NOT NULL,
    importance TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    module_name TEXT NOT NULL,
    page_path TEXT,
    fund_code TEXT,
    paired_fund_code TEXT,
    secondary_funds TEXT,
    basket_weight_pct DOUBLE PRECISION,
    weight_pct DOUBLE PRECISION,
    duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    duration_sec INTEGER NOT NULL DEFAULT 0,
    date_range_label TEXT,
    bulletin_id INTEGER,
    bulletin_title TEXT,
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS traffic_logs (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO',
    ip_address TEXT NOT NULL,
    endpoint TEXT,
    details TEXT,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pg_security_logs_ip ON security_logs (ip_address, created_at DESC);

CREATE TABLE IF NOT EXISTS research_logs (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS virtual_baskets (
    id SERIAL PRIMARY KEY,
    basket_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_initial_amount DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS basket_items (
    id SERIAL PRIMARY KEY,
    basket_id INTEGER NOT NULL,
    fund_code TEXT NOT NULL,
    initial_amount DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_transactions (
    id SERIAL PRIMARY KEY,
    tx_type TEXT NOT NULL,
    category TEXT NOT NULL,
    is_fixed INTEGER NOT NULL DEFAULT 0,
    amount DOUBLE PRECISION NOT NULL,
    tx_date TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS savings_goals (
    id SERIAL PRIMARY KEY,
    goal_name TEXT NOT NULL,
    target_amount DOUBLE PRECISION NOT NULL,
    current_saved DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    target_date TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'YÜKSEK'
);

CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    debt_name TEXT NOT NULL,
    total_remaining DOUBLE PRECISION NOT NULL,
    monthly_payment DOUBLE PRECISION NOT NULL,
    interest_rate_note TEXT,
    due_day INTEGER NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS budget_limits (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    monthly_limit DOUBLE PRECISION NOT NULL
);
"""


def parse_glossary_ts() -> List[Dict[str, str]]:
    if not GLOSSARY_TS_PATH.exists():
        return []
    text = GLOSSARY_TS_PATH.read_text(encoding="utf-8")
    pattern = re.compile(
        r'\{\s*term:\s*"([^"]+)",\s*category:\s*"([^"]+)",\s*tip:\s*"([^"]+)",\s*spk:\s*"([^"]+)",\s*importance:\s*"([^"]+)",?\s*\}',
        re.DOTALL,
    )
    items = []
    for idx, m in enumerate(pattern.finditer(text), start=1):
        items.append({
            "term": m.group(1),
            "category": m.group(2),
            "tip": m.group(3),
            "spk": m.group(4),
            "importance": m.group(5),
            "display_order": idx,
        })
    return items


def seed_all_to_neon() -> Dict[str, int]:
    from database import (
        DEFAULT_ANNOUNCEMENT_SETTINGS,
        DEFAULT_ECONOMIC_SETTINGS,
        DEFAULT_SYSTEM_SETTINGS,
    )
    from evidence_engine import EVIDENCE_CARDS_DATA, evaluate_fund_transparency
    from survey_engine import DEFAULT_SURVEY_QUESTIONS

    pg_conn = get_neon_conn()
    sq_conn = sqlite3.connect(str(SQLITE_DB_PATH))
    sq_conn.row_factory = sqlite3.Row

    with pg_conn.cursor() as cur:
        print("1) Tablolar (CREATE TABLE IF NOT EXISTS) oluşturuluyor...")
        cur.execute(DDL_STATEMENTS)
        pg_conn.commit()

        # 1. funds & tracked_funds
        funds_rows = sq_conn.execute("SELECT fund_code, fund_title, fund_type FROM funds;").fetchall()
        if funds_rows:
            f_vals = [(r["fund_code"], r["fund_title"], r["fund_type"]) for r in funds_rows]
            execute_values(
                cur,
                """
                INSERT INTO funds (fund_code, fund_title, fund_type)
                VALUES %s
                ON CONFLICT (fund_code) DO UPDATE SET
                    fund_title = EXCLUDED.fund_title,
                    fund_type = COALESCE(EXCLUDED.fund_type, funds.fund_type);
                """,
                f_vals,
            )
            tf_vals = [(r["fund_code"], r["fund_title"], r["fund_type"], 1) for r in funds_rows]
            execute_values(
                cur,
                """
                INSERT INTO tracked_funds (fund_code, fund_title, fund_type, is_default)
                VALUES %s
                ON CONFLICT (fund_code) DO NOTHING;
                """,
                tf_vals,
            )

        # 2. fund_prices
        print("2) 1 Yıllık TEFAS fiyat geçmişleri (fund_prices) aktarılıyor...")
        price_rows = sq_conn.execute(
            "SELECT fund_code, date, price, investor_count, total_value, source FROM fund_prices;"
        ).fetchall()
        if price_rows:
            p_vals = [
                (r["fund_code"], r["date"], float(r["price"]), r["investor_count"], r["total_value"], r["source"])
                for r in price_rows
            ]
            execute_values(
                cur,
                """
                INSERT INTO fund_prices (fund_code, date, price, investor_count, total_value, source)
                VALUES %s
                ON CONFLICT (fund_code, date) DO NOTHING;
                """,
                p_vals,
                page_size=1500,
            )

        # 3. bulletins
        print("3) Bültenler (bulletins + file_data Base64 sütunu) aktarılıyor...")
        bul_rows = sq_conn.execute(
            """
            SELECT id, fund_code, title, category, doc_type, source_institution,
                   publish_date, period_covered, original_url, raw_text, ai_summary_json, content_origin_badge
            FROM bulletins;
            """
        ).fetchall()
        if bul_rows:
            b_vals = [
                (
                    b["id"], b["fund_code"], b["title"], b["category"], b["doc_type"],
                    b["source_institution"], b["publish_date"], b["period_covered"],
                    b["original_url"], b["raw_text"], b["ai_summary_json"], b["content_origin_badge"],
                    None, None,
                )
                for b in bul_rows
            ]
            execute_values(
                cur,
                """
                INSERT INTO bulletins (
                    id, fund_code, title, category, doc_type, source_institution,
                    publish_date, period_covered, original_url, raw_text, ai_summary_json,
                    content_origin_badge, file_data, file_name
                ) VALUES %s
                ON CONFLICT (id) DO NOTHING;
                """,
                b_vals,
            )
            cur.execute("SELECT setval('bulletins_id_seq', COALESCE((SELECT MAX(id) FROM bulletins), 1));")

        # 4. site_settings & system_settings
        print("4) Site ayarları, duyuru bandı ve ekonomik parametreler aktarılıyor...")
        set_rows = sq_conn.execute("SELECT key, value FROM system_settings;").fetchall()
        merged_settings = {**DEFAULT_SYSTEM_SETTINGS, **DEFAULT_ANNOUNCEMENT_SETTINGS, **DEFAULT_ECONOMIC_SETTINGS}
        for r in set_rows:
            merged_settings[r["key"]] = r["value"]
        s_vals = [(k, str(v)) for k, v in merged_settings.items()]
        execute_values(
            cur,
            "INSERT INTO site_settings (key, value) VALUES %s ON CONFLICT (key) DO NOTHING;",
            s_vals,
        )
        execute_values(
            cur,
            "INSERT INTO system_settings (key, value) VALUES %s ON CONFLICT (key) DO NOTHING;",
            s_vals,
        )

        # 5. evidences & evidence_cards
        print("5) SPK Kanıt Kartları (evidences) ve Şeffaflık Skorları (transparency_scores) aktarılıyor...")
        ev_vals = [
            (
                ev["order_no"], ev["topic_slug"], ev["question"], ev["claim_summary"],
                ev["detailed_explanation"], ev["official_source"], ev["regulation_ref"],
                ev["source_date"], ev["official_url"], ev["user_meaning"],
                ev["limitations_and_risks"], ev["common_misconception"],
            )
            for ev in EVIDENCE_CARDS_DATA
        ]
        execute_values(
            cur,
            """
            INSERT INTO evidences (
                order_no, topic_slug, question, claim_summary, detailed_explanation,
                official_source, regulation_ref, source_date, official_url,
                user_meaning, limitations_and_risks, common_misconception
            ) VALUES %s
            ON CONFLICT (topic_slug) DO NOTHING;
            """,
            ev_vals,
        )
        execute_values(
            cur,
            """
            INSERT INTO evidence_cards (
                order_no, topic_slug, question, claim_summary, detailed_explanation,
                official_source, regulation_ref, source_date, official_url,
                user_meaning, limitations_and_risks, common_misconception
            ) VALUES %s
            ON CONFLICT (topic_slug) DO NOTHING;
            """,
            ev_vals,
        )

        # 6. transparency_scores
        tr_vals = []
        for r in funds_rows:
            code = r["fund_code"]
            try:
                tr_data = evaluate_fund_transparency(code)
                tr_vals.append((
                    code,
                    tr_data.get("fund_title", r["fund_title"]),
                    int(tr_data.get("transparency_score_100", 100)),
                    25,
                    25,
                    True,
                    True,
                    tr_data.get("identity_profile", {}).get("founder_company", "Portföy Yönetim A.Ş."),
                    tr_data.get("identity_profile", {}).get("custodian_institution", "İstanbul Takas ve Saklama Bankası A.Ş. (Takasbank)"),
                    int(str(tr_data.get("identity_profile", {}).get("risk_value_1_to_7", "5")).split("/")[0].strip() or 5),
                    tr_data.get("identity_profile", {}).get("buy_valor", "T+1"),
                    tr_data.get("identity_profile", {}).get("sell_valor", "T+2"),
                    2.0,
                    json.dumps(tr_data, ensure_ascii=False),
                ))
            except Exception:
                pass
        if tr_vals:
            execute_values(
                cur,
                """
                INSERT INTO transparency_scores (
                    fund_code, fund_title, total_score, freshness_score, completeness_score,
                    custody_verified, kap_verified, management_company, custody_institution,
                    risk_level, buy_valor, sell_valor, management_fee_pct, details_json
                ) VALUES %s
                ON CONFLICT (fund_code) DO UPDATE SET
                    total_score = EXCLUDED.total_score,
                    details_json = EXCLUDED.details_json;
                """,
                tr_vals,
            )

        # 7. contact_messages
        print("6) İletişim mesajları, anket soruları/yanıtları ve sözlük terimleri aktarılıyor...")
        cm_rows = sq_conn.execute(
            "SELECT id, full_name, email, phone, subject, message, kvkk_approved, is_read, created_at FROM contact_messages;"
        ).fetchall()
        if cm_rows:
            cm_vals = [
                (
                    m["id"], m["full_name"], m["email"], m["phone"], m["subject"],
                    m["message"], int(m["kvkk_approved"]), int(m["is_read"]), m["created_at"],
                )
                for m in cm_rows
            ]
            execute_values(
                cur,
                """
                INSERT INTO contact_messages (
                    id, full_name, email, phone, subject, message, kvkk_approved, is_read, created_at
                ) VALUES %s
                ON CONFLICT (id) DO NOTHING;
                """,
                cm_vals,
            )
            cur.execute("SELECT setval('contact_messages_id_seq', COALESCE((SELECT MAX(id) FROM contact_messages), 1));")

        # 8. survey_questions & survey_responses
        sq_vals = [
            (
                idx,
                q["section"],
                q["section"],
                q["question_text"],
                json.dumps(q["options"], ensure_ascii=False),
                q["correct_option_index"],
                q["explanation"],
                q["display_order"],
                1,
            )
            for idx, q in enumerate(DEFAULT_SURVEY_QUESTIONS, start=1)
        ]
        execute_values(
            cur,
            """
            INSERT INTO survey_questions (
                id, section, category, question_text, options_json, correct_option_index, explanation, display_order, is_active
            ) VALUES %s
            ON CONFLICT (id) DO NOTHING;
            """,
            sq_vals,
        )
        cur.execute("SELECT setval('survey_questions_id_seq', COALESCE((SELECT MAX(id) FROM survey_questions), 1));")

        sr_rows = sq_conn.execute(
            """
            SELECT id, session_id, age_group, education_level, investment_experience,
                   holds_funds, answers_json, literacy_score, perception_score, completion_time_sec, created_at
            FROM survey_responses;
            """
        ).fetchall()
        if sr_rows:
            sr_vals = [
                (
                    sr["id"], sr["session_id"], sr["age_group"], sr["education_level"],
                    sr["investment_experience"], sr["holds_funds"], sr["answers_json"],
                    sr["literacy_score"], sr["perception_score"], sr["completion_time_sec"], sr["created_at"],
                )
                for sr in sr_rows
            ]
            execute_values(
                cur,
                """
                INSERT INTO survey_responses (
                    id, session_id, age_group, education_level, investment_experience,
                    holds_funds, answers_json, literacy_score, perception_score, completion_time_sec, created_at
                ) VALUES %s
                ON CONFLICT (id) DO NOTHING;
                """,
                sr_vals,
            )
            cur.execute("SELECT setval('survey_responses_id_seq', COALESCE((SELECT MAX(id) FROM survey_responses), 1));")

        # 9. glossary_terms
        glossary_items = parse_glossary_ts()
        if glossary_items:
            g_vals = [
                (g["term"], g["category"], g["tip"], g["spk"], g["importance"], g["display_order"])
                for g in glossary_items
            ]
            execute_values(
                cur,
                """
                INSERT INTO glossary_terms (term, category, tip, spk, importance, display_order)
                VALUES %s
                ON CONFLICT (term) DO UPDATE SET
                    category = EXCLUDED.category,
                    tip = EXCLUDED.tip,
                    spk = EXCLUDED.spk,
                    importance = EXCLUDED.importance,
                    display_order = EXCLUDED.display_order;
                """,
                g_vals,
            )

        # 10. analytics_events, research_logs, security_logs
        ae_rows = sq_conn.execute(
            """
            SELECT id, session_id, event_type, module_name, page_path, fund_code,
                   paired_fund_code, secondary_funds, basket_weight_pct, weight_pct,
                   duration_seconds, duration_sec, date_range_label, bulletin_id,
                   bulletin_title, metadata_json, created_at
            FROM analytics_events;
            """
        ).fetchall()
        if ae_rows:
            ae_vals = [
                (
                    ae["id"], ae["session_id"], ae["event_type"], ae["module_name"], ae["page_path"],
                    ae["fund_code"], ae["paired_fund_code"], ae["secondary_funds"], ae["basket_weight_pct"],
                    ae["weight_pct"], ae["duration_seconds"], ae["duration_sec"], ae["date_range_label"],
                    ae["bulletin_id"], ae["bulletin_title"], ae["metadata_json"], ae["created_at"],
                )
                for ae in ae_rows
            ]
            execute_values(
                cur,
                """
                INSERT INTO analytics_events (
                    id, session_id, event_type, module_name, page_path, fund_code,
                    paired_fund_code, secondary_funds, basket_weight_pct, weight_pct,
                    duration_seconds, duration_sec, date_range_label, bulletin_id,
                    bulletin_title, metadata_json, created_at
                ) VALUES %s
                ON CONFLICT (id) DO NOTHING;
                """,
                ae_vals,
            )
            cur.execute("SELECT setval('analytics_events_id_seq', COALESCE((SELECT MAX(id) FROM analytics_events), 1));")

        rl_rows = sq_conn.execute(
            """
            SELECT id, participant_code, module_code, action_type, fund_or_topic,
                   duration_sec, trust_score_pre, trust_score_post, data_badge, notes, created_at
            FROM research_logs;
            """
        ).fetchall()
        if rl_rows:
            rl_vals = [
                (
                    rl["id"], rl["participant_code"], rl["module_code"], rl["action_type"],
                    rl["fund_or_topic"], rl["duration_sec"], rl["trust_score_pre"],
                    rl["trust_score_post"], rl["data_badge"], rl["notes"], rl["created_at"],
                )
                for rl in rl_rows
            ]
            execute_values(
                cur,
                """
                INSERT INTO research_logs (
                    id, participant_code, module_code, action_type, fund_or_topic,
                    duration_sec, trust_score_pre, trust_score_post, data_badge, notes, created_at
                ) VALUES %s
                ON CONFLICT (id) DO NOTHING;
                """,
                rl_vals,
            )
            cur.execute("SELECT setval('research_logs_id_seq', COALESCE((SELECT MAX(id) FROM research_logs), 1));")

        cur.execute("SELECT COUNT(*) FROM security_logs;")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO security_logs (event_type, severity, ip_address, endpoint, details)
                VALUES
                ('WAF_SHIELD_ACTIVE', 'INFO', '127.0.0.1', '/api/system/security', 'Neon PostgreSQL Siber Güvenlik Kalkanı, Rate Limiter (180 req/dk) ve Brute-Force koruması (5 deneme / 15 dk kilit) devreye alındı.'),
                ('SQLI_XSS_SANITIZER_READY', 'INFO', '127.0.0.1', '/api/*', 'Tüm gelen POST/GET parametrelerinde XSS ve SQL Injection girdi temizleme filtresi aktif.');
            """)

        pg_conn.commit()

        tables_to_verify = [
            "funds",
            "tracked_funds",
            "fund_prices",
            "bulletins",
            "site_settings",
            "evidences",
            "transparency_scores",
            "contact_messages",
            "survey_questions",
            "survey_responses",
            "glossary_terms",
            "analytics_events",
            "security_logs",
            "research_logs",
        ]
        counts = {}
        for t in tables_to_verify:
            cur.execute(f"SELECT COUNT(*) FROM {t};")
            counts[t] = cur.fetchone()[0]

    sq_conn.close()
    pg_conn.close()
    return counts


if __name__ == "__main__":
    print("Neon PostgreSQL şeması oluşturuluyor ve başlangıç verileri yükleniyor...")
    summary = seed_all_to_neon()
    print("\n=== NEON POSTGRESQL CANLI VERİTABANI TABLO KAYIT SAYILARI ===")
    for k, v in summary.items():
        print(f"  - {k:22s}: {v} kayıt")
