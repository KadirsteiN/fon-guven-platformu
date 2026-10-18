"""
BÖLÜM 3 — Ultra Detaylı Kullanıcı Davranışı ve Fon Telemetri Sistemi (Analytics Engine)
Dosya: backend/telemetry_engine.py

Bu modül:
1. Kullanıcıların anonim olarak (KVKK uyumlu) yaptığı tüm sayfa görüntüleme,
   süre (time-on-page), fon inceleme (/evidence, /transparency, /analytics),
   sanal sepet ağırlıklandırma (/baskets), ikili fon karşılaştırma (AFT vs TTE vb.),
   tarih aralığı seçimi (1 Ay, 3 Ay, 6 Ay, 1 Yıl, Özel Tarih) ve bülten okuma/indirme
   davranışlarını SQLite `analytics_events` tablosuna kaydeder.
2. Admin Panelindeki "Platform İstatistikleri & Davranış Analizi" sekmesi için:
   - Modül ve Sayfa Bazlı İstatistikler (Hit + Toplam & Ortalama Süre)
   - Fon Bazlı Detaylı "Fon Etkileşim Matrisi"
   - Karşılaştırma & Çapraz Analiz Liderlik Tablosu (En Çok Karşılaştırılan Fon Çiftleri & Tarih Aralıkları)
   - Bülten & Rapor Okunma İstatistikleri
   - Günlük Zaman Serisi Trendi ve Son 50 Anonim Kullanıcı Hareketi (Canlı Akış / Live Activity Feed)
   verilerini üretir.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from database import get_connection


MODULE_DEFINITIONS: List[Dict[str, str]] = [
    {"key": "home", "label": "Ana Sayfa (Genel Bakış)", "path": "/"},
    {"key": "evidence", "label": "Fonlara Güven & Kanıt Merkezi", "path": "/evidence"},
    {"key": "transparency", "label": "Fon Şeffaflık Kontrolü", "path": "/transparency"},
    {"key": "bulletins", "label": "Fon Bültenleri & Raporlar", "path": "/bulletins"},
    {"key": "analytics", "label": "Fon Performans Analizi", "path": "/analytics"},
    {"key": "baskets", "label": "Sanal Sepet Laboratuvarı", "path": "/baskets"},
    {"key": "contact", "label": "Proje Künyesi & İletişim", "path": "/contact"},
]


def _normalize_module_key(module_name: Optional[str], route_path: Optional[str] = None) -> str:
    raw = (module_name or route_path or "").strip().lower()
    if raw in ("home", "/", "dashboard", "ana sayfa"):
        return "home"
    if "evidence" in raw or "kanit" in raw or "güven" in raw:
        return "evidence"
    if "transparency" in raw or "seffaflik" in raw or "şeffaflık" in raw:
        return "transparency"
    if "bulletin" in raw or "bulten" in raw or "bülten" in raw:
        return "bulletins"
    if "analytic" in raw or "performans" in raw or "compare" in raw:
        return "analytics"
    if "basket" in raw or "sepet" in raw:
        return "baskets"
    if "contact" in raw or "iletisim" in raw or "iletişim" in raw:
        return "contact"
    return "home"


def _classify_date_range_label(
    explicit_label: Optional[str],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> str:
    if explicit_label and explicit_label.strip():
        lbl = explicit_label.strip()
        if lbl in ("1 Ay", "3 Ay", "6 Ay", "1 Yıl", "Özel Tarih"):
            return lbl
        low = lbl.lower()
        if "1" in low and ("ay" in low or "m" in low):
            return "1 Ay"
        if "3" in low and ("ay" in low or "m" in low):
            return "3 Ay"
        if "6" in low and ("ay" in low or "m" in low):
            return "6 Ay"
        if ("1" in low and ("yıl" in low or "yil" in low or "y" in low)) or "12" in low:
            return "1 Yıl"
        return "Özel Tarih"

    if start_date and end_date:
        try:
            d1 = datetime.strptime(start_date[:10], "%Y-%m-%d")
            d2 = datetime.strptime(end_date[:10], "%Y-%m-%d")
            days = abs((d2 - d1).days)
            if 25 <= days <= 36:
                return "1 Ay"
            if 80 <= days <= 100:
                return "3 Ay"
            if 170 <= days <= 195:
                return "6 Ay"
            if 350 <= days <= 380:
                return "1 Yıl"
            return "Özel Tarih"
        except Exception:
            return "Özel Tarih"
    return "3 Ay"


def _format_relative_time_tr(created_at_str: str) -> str:
    try:
        clean_ts = created_at_str.replace("T", " ").split(".")[0]
        dt = datetime.strptime(clean_ts, "%Y-%m-%d %H:%M:%S")
        now = datetime.now()
        diff_sec = max(0, int((now - dt).total_seconds()))
        if diff_sec < 45:
            return "Az önce"
        if diff_sec < 3600:
            return f"{max(1, diff_sec // 60)} dk önce"
        if diff_sec < 86400:
            return f"{diff_sec // 3600} saat önce"
        return f"{diff_sec // 86400} gün önce"
    except Exception:
        return "Yakın zamanda"


def _build_turkish_activity_description(row: Dict[str, Any]) -> str:
    ev_type = (row.get("event_type") or "").upper()
    mod_key = _normalize_module_key(row.get("module_name"))
    fund = (row.get("fund_code") or "").strip().upper()
    paired = (row.get("paired_fund_code") or "").strip().upper()
    dr_label = row.get("date_range_label") or ""
    dur = float(row.get("duration_seconds") or 0)
    weight = row.get("basket_weight_pct")
    meta_raw = row.get("metadata_json")
    meta: Dict[str, Any] = {}
    if meta_raw:
        try:
            meta = json.loads(meta_raw) if isinstance(meta_raw, str) else dict(meta_raw)
        except Exception:
            meta = {}

    if ev_type == "FUND_COMPARE":
        funds_list = meta.get("fund_codes")
        if isinstance(funds_list, list) and len(funds_list) >= 2:
            joined = ", ".join(str(c).upper() for c in funds_list[:4])
            range_suffix = f" ({dr_label})" if dr_label else ""
            return f"Bir kullanıcı {joined} fonlarını 100 bazlı grafikle karşılaştırdı{range_suffix}"
        if fund and paired:
            range_suffix = f" ({dr_label})" if dr_label else ""
            return f"Bir kullanıcı {fund} ve {paired} fonlarını karşılaştırdı{range_suffix}"
        if fund:
            return f"Bir kullanıcı {fund} fonunun tarihsel performans analizini çalıştırdı"

    if ev_type == "TRANSPARENCY_QUERY" and fund:
        return f"Bir kullanıcı {fund} fonunun Şeffaflık ve Güven Skorunu sorguladı"

    if ev_type == "EVIDENCE_INSPECT" and fund:
        return f"Bir kullanıcı {fund} fonunun KAP/SPK resmi kanıt kartlarını inceledi"

    if ev_type == "BASKET_SIMULATE":
        if fund and weight is not None:
            return f"Bir kullanıcı {fund} fonunu %{round(float(weight), 1)} ağırlıkla Sanal Sepet simülasyonuna ekledi"
        return "Bir kullanıcı Sanal Sepet Laboratuvarında çoklu fon portföy simülasyonu çalıştırdı"

    if ev_type == "BULLETIN_OPEN":
        title = meta.get("bulletin_title") or (f"{fund} Bülteni" if fund else "Fon Bülteni")
        return f"Bir kullanıcı '{title}' raporunun özetini inceledi"

    if ev_type == "BULLETIN_SOURCE_CLICK":
        title = meta.get("bulletin_title") or (f"{fund} Bülteni" if fund else "Fon Bülteni")
        return f"Bir kullanıcı '{title}' resmi kaynak PDF/KAP bağlantısını açtı"

    if ev_type == "TIME_ON_PAGE":
        mod_label = next((m["label"] for m in MODULE_DEFINITIONS if m["key"] == mod_key), "Platform")
        if fund and dur > 0:
            return f"Bir kullanıcı {fund} fonu üzerinde {int(round(dur))} saniye detaylı inceleme yaptı"
        if dur > 0:
            return f"Bir kullanıcı '{mod_label}' sayfasında {int(round(dur))} saniye vakit geçirdi"

    if ev_type == "CONTACT_SUBMIT":
        subj = meta.get("subject") or "Geri Bildirim"
        return f"Bir araştırmacı/kullanıcı '{subj}' konulu iletişim mesajı gönderdi"

    mod_label = next((m["label"] for m in MODULE_DEFINITIONS if m["key"] == mod_key), "Ana Sayfa")
    if fund:
        return f"Bir kullanıcı '{mod_label}' modülünde {fund} fonunu görüntüledi"
    return f"Bir kullanıcı '{mod_label}' sayfasını ziyaret etti"


def record_telemetry_event(
    event_type: str,
    module_name: str,
    session_id: Optional[str] = None,
    fund_code: Optional[str] = None,
    paired_fund_code: Optional[str] = None,
    date_range_label: Optional[str] = None,
    bulletin_id: Optional[int] = None,
    duration_seconds: float = 0.0,
    basket_weight_pct: Optional[float] = None,
    metadata: Optional[Dict[str, Any]] = None,
    created_at: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> int:
    """Tekil bir kullanıcı etkileşim/telemetri olayını `analytics_events` tablosuna yazar."""
    norm_mod = _normalize_module_key(module_name)
    clean_fund = fund_code.strip().upper() if fund_code and fund_code.strip() else None
    clean_paired = paired_fund_code.strip().upper() if paired_fund_code and paired_fund_code.strip() else None
    clean_range = (
        _classify_date_range_label(
            date_range_label,
            metadata.get("start_date") if metadata else None,
            metadata.get("end_date") if metadata else None,
        )
        if (date_range_label or (metadata and ("start_date" in metadata or "end_date" in metadata)))
        else None
    )
    meta_json = json.dumps(metadata, ensure_ascii=False) if metadata else None
    ts = created_at or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_connection(db_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO analytics_events (
                session_id, event_type, module_name, fund_code, paired_fund_code,
                date_range_label, bulletin_id, duration_seconds, basket_weight_pct,
                metadata_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id or "anon-session",
                event_type.strip().upper(),
                norm_mod,
                clean_fund,
                clean_paired,
                clean_range,
                bulletin_id,
                max(0.0, float(duration_seconds or 0.0)),
                float(basket_weight_pct) if basket_weight_pct is not None else None,
                meta_json,
                ts,
            ),
        )
        conn.commit()
        return int(cursor.lastrowid)


def seed_telemetry_events(db_path: Optional[Path] = None) -> int:
    """
    Veritabanında henüz hiç telemetri kaydı yoksa, Admin Panelindeki
    'Platform İstatistikleri & Davranış Analizi' ekranının ilk açılışta anlamlı
    ve gerçekçi başlangıç verileriyle (AFT, TTE, YAY, TI2, IPB, MAC, TTA) çalışması
    için temel etkileşim kayıtlarını oluşturur. Mevcut kayıt varsa dokunmaz.
    """
    with get_connection(db_path) as conn:
        cnt = conn.execute("SELECT COUNT(*) as c FROM analytics_events").fetchone()["c"]
        if cnt > 0:
            return 0

        bulletins = conn.execute(
            "SELECT id, title, fund_code, source_institution AS institution FROM bulletins ORDER BY id ASC LIMIT 6"
        ).fetchall()

    now = datetime.now()
    events_to_insert: List[tuple] = []

    def _add(
        minutes_ago: int,
        session_id: str,
        event_type: str,
        module_name: str,
        fund_code: Optional[str] = None,
        paired_fund_code: Optional[str] = None,
        date_range_label: Optional[str] = None,
        bulletin_id: Optional[int] = None,
        duration_seconds: float = 0.0,
        basket_weight_pct: Optional[float] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        ts = (now - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%d %H:%M:%S")
        events_to_insert.append(
            (
                session_id,
                event_type,
                module_name,
                fund_code,
                paired_fund_code,
                date_range_label,
                bulletin_id,
                duration_seconds,
                basket_weight_pct,
                json.dumps(meta, ensure_ascii=False) if meta else None,
                ts,
            )
        )

    # Son 10 güne yayılmış gerçekçi modül ziyaretleri ve süreleri
    sample_sessions = [
        ("sess-ank-101", 18),
        ("sess-ist-102", 42),
        ("sess-izm-103", 95),
        ("sess-bur-104", 180),
        ("sess-esk-105", 340),
        ("sess-ant-106", 720),
        ("sess-trb-107", 1480),
        ("sess-kon-108", 2900),
        ("sess-koc-109", 4320),
        ("sess-adn-110", 5800),
        ("sess-gaz-111", 7200),
        ("sess-kay-112", 8640),
    ]

    for idx, (sess, base_min) in enumerate(sample_sessions):
        _add(base_min + 12, sess, "PAGE_VIEW", "home", duration_seconds=45 + (idx * 7) % 40)
        _add(base_min + 10, sess, "TIME_ON_PAGE", "home", duration_seconds=52 + (idx * 11) % 50)
        _add(base_min + 9, sess, "PAGE_VIEW", "evidence", duration_seconds=0)
        _add(base_min + 8, sess, "TIME_ON_PAGE", "evidence", fund_code="AFT" if idx % 2 == 0 else "TTE", duration_seconds=78 + (idx * 13) % 60)
        _add(base_min + 7, sess, "PAGE_VIEW", "transparency", duration_seconds=0)
        _add(base_min + 6, sess, "TIME_ON_PAGE", "transparency", fund_code="TI2" if idx % 3 == 0 else "AFT", duration_seconds=64 + (idx * 9) % 45)
        _add(base_min + 5, sess, "PAGE_VIEW", "analytics", duration_seconds=0)
        _add(base_min + 4, sess, "TIME_ON_PAGE", "analytics", fund_code="AFT", duration_seconds=115 + (idx * 17) % 80)
        _add(base_min + 3, sess, "PAGE_VIEW", "baskets", duration_seconds=0)
        _add(base_min + 2, sess, "TIME_ON_PAGE", "baskets", duration_seconds=95 + (idx * 15) % 70)
        if idx % 2 == 0:
            _add(base_min + 1, sess, "PAGE_VIEW", "bulletins", duration_seconds=0)
            _add(base_min, sess, "TIME_ON_PAGE", "bulletins", duration_seconds=84 + (idx * 12) % 55)
        if idx % 3 == 0:
            _add(base_min, sess, "PAGE_VIEW", "contact", duration_seconds=0)
            _add(base_min, sess, "TIME_ON_PAGE", "contact", duration_seconds=48 + idx * 4)

    # Fon bazlı detaylı etkileşimler (Kanıt, Şeffaflık, Analiz, Sepet)
    fund_seed_profiles = [
        ("AFT", 14, 18, 22, [("sess-ank-101", 40.0), ("sess-ist-102", 35.0), ("sess-izm-103", 50.0), ("sess-bur-104", 30.0), ("sess-esk-105", 45.0)]),
        ("TTE", 11, 15, 19, [("sess-ank-101", 30.0), ("sess-ist-102", 40.0), ("sess-ant-106", 35.0), ("sess-trb-107", 25.0)]),
        ("YAY", 9, 12, 16, [("sess-ank-101", 30.0), ("sess-izm-103", 25.0), ("sess-kon-108", 40.0)]),
        ("TI2", 8, 13, 12, [("sess-ist-102", 25.0), ("sess-bur-104", 40.0), ("sess-koc-109", 50.0)]),
        ("IPB", 7, 10, 14, [("sess-izm-103", 25.0), ("sess-esk-105", 30.0), ("sess-adn-110", 35.0)]),
        ("MAC", 6, 9, 11, [("sess-bur-104", 30.0), ("sess-ant-106", 40.0)]),
        ("TTA", 5, 7, 9, [("sess-esk-105", 25.0), ("sess-trb-107", 35.0)]),
    ]

    min_cursor = 15
    for f_code, ev_count, tr_count, an_count, basket_weights in fund_seed_profiles:
        for i in range(ev_count):
            min_cursor += 11
            _add(min_cursor, f"sess-ev-{i%6}", "EVIDENCE_INSPECT", "evidence", fund_code=f_code, duration_seconds=35 + (i * 7) % 45)
        for i in range(tr_count):
            min_cursor += 9
            _add(min_cursor, f"sess-tr-{i%6}", "TRANSPARENCY_QUERY", "transparency", fund_code=f_code, duration_seconds=28 + (i * 5) % 35)
        for i in range(an_count):
            min_cursor += 8
            dr = ["3 Ay", "6 Ay", "1 Yıl", "1 Ay", "Özel Tarih"][i % 5]
            _add(min_cursor, f"sess-an-{i%6}", "ANALYTICS_QUERY", "analytics", fund_code=f_code, date_range_label=dr, duration_seconds=42 + (i * 9) % 50)
        for sess_id, w_pct in basket_weights:
            min_cursor += 14
            _add(min_cursor, sess_id, "BASKET_SIMULATE", "baskets", fund_code=f_code, basket_weight_pct=w_pct, date_range_label="6 Ay", duration_seconds=55)

    # İkili Fon Karşılaştırma Çiftleri (Top Pairings)
    pair_seeds = [
        ("AFT", "TTE", "6 Ay", 14),
        ("AFT", "YAY", "1 Yıl", 11),
        ("TTE", "YAY", "3 Ay", 9),
        ("IPB", "MAC", "6 Ay", 7),
        ("TI2", "TTA", "1 Ay", 6),
        ("AFT", "IPB", "1 Yıl", 5),
        ("TTE", "MAC", "Özel Tarih", 4),
    ]
    pair_min = 6
    for fa, fb, dr_lbl, cnt_pair in pair_seeds:
        for k in range(cnt_pair):
            pair_min += 22 if k > 0 else 4
            c1, c2 = sorted([fa, fb])
            _add(
                pair_min,
                f"sess-cmp-{k%5}",
                "FUND_COMPARE",
                "analytics",
                fund_code=c1,
                paired_fund_code=c2,
                date_range_label=dr_lbl,
                duration_seconds=65 + (k * 8) % 40,
                meta={"fund_codes": [c1, c2], "date_range_label": dr_lbl},
            )

    # Bülten okuma ve kaynak tıklama istatistikleri
    if bulletins:
        for b_idx, b_row in enumerate(bulletins):
            b_id = b_row["id"]
            b_title = b_row["title"]
            b_fund = b_row["fund_code"]
            opens = max(4, 15 - b_idx * 2)
            clicks = max(2, 9 - b_idx)
            for o_i in range(opens):
                _add(
                    25 + b_idx * 30 + o_i * 15,
                    f"sess-bul-{o_i%5}",
                    "BULLETIN_OPEN",
                    "bulletins",
                    fund_code=b_fund,
                    bulletin_id=b_id,
                    duration_seconds=72 + (o_i * 11) % 60,
                    meta={"bulletin_title": b_title, "institution": b_row["institution"]},
                )
            for c_i in range(clicks):
                _add(
                    30 + b_idx * 35 + c_i * 19,
                    f"sess-bul-{c_i%5}",
                    "BULLETIN_SOURCE_CLICK",
                    "bulletins",
                    fund_code=b_fund,
                    bulletin_id=b_id,
                    duration_seconds=15,
                    meta={"bulletin_title": b_title, "institution": b_row["institution"]},
                )

    with get_connection(db_path) as conn:
        conn.executemany(
            """
            INSERT INTO analytics_events (
                session_id, event_type, module_name, fund_code, paired_fund_code,
                date_range_label, bulletin_id, duration_seconds, basket_weight_pct,
                metadata_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            events_to_insert,
        )
        conn.commit()
    return len(events_to_insert)


def get_telemetry_dashboard_data(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Admin Panelindeki 'Platform İstatistikleri & Davranış Analizi' ekranı için
    5 ana analitik bölümün tamamını gerçek SQLite verilerinden hesaplayarak döndürür.
    """
    seed_telemetry_events(db_path=db_path)

    with get_connection(db_path) as conn:
        # 1. Genel Özet Metrikler
        summary_row = conn.execute(
            """
            SELECT
                COUNT(*) AS total_events,
                COUNT(DISTINCT session_id) AS unique_sessions,
                COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds,
                SUM(CASE WHEN event_type IN ('EVIDENCE_INSPECT', 'TRANSPARENCY_QUERY', 'ANALYTICS_QUERY', 'FUND_COMPARE', 'BASKET_SIMULATE') THEN 1 ELSE 0 END) AS total_fund_interactions,
                SUM(CASE WHEN event_type = 'FUND_COMPARE' THEN 1 ELSE 0 END) AS total_comparisons,
                SUM(CASE WHEN event_type = 'BASKET_SIMULATE' THEN 1 ELSE 0 END) AS total_basket_simulations,
                SUM(CASE WHEN event_type IN ('BULLETIN_OPEN', 'BULLETIN_SOURCE_CLICK') THEN 1 ELSE 0 END) AS total_bulletin_interactions
            FROM analytics_events
            """
        ).fetchone()

        # 2. Modül ve Sayfa Bazlı İstatistikler
        mod_rows = conn.execute(
            """
            SELECT
                module_name,
                COUNT(*) AS total_events,
                SUM(CASE WHEN event_type = 'PAGE_VIEW' THEN 1 ELSE 0 END) AS page_views,
                COUNT(DISTINCT session_id) AS unique_sessions,
                COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds,
                COALESCE(AVG(CASE WHEN duration_seconds > 0 THEN duration_seconds END), 0) AS avg_duration_seconds
            FROM analytics_events
            GROUP BY module_name
            """
        ).fetchall()
        mod_map = {r["module_name"]: dict(r) for r in mod_rows}

        module_stats: List[Dict[str, Any]] = []
        for mdef in MODULE_DEFINITIONS:
            mkey = mdef["key"]
            row_data = mod_map.get(mkey, {})
            p_views = int(row_data.get("page_views") or 0)
            t_events = int(row_data.get("total_events") or 0)
            effective_hits = max(p_views, t_events)
            tot_dur = round(float(row_data.get("total_duration_seconds") or 0.0), 1)
            avg_dur = round(float(row_data.get("avg_duration_seconds") or 0.0), 1)
            module_stats.append(
                {
                    "module_key": mkey,
                    "module_label": mdef["label"],
                    "route_path": mdef["path"],
                    "total_views": effective_hits,
                    "page_views": p_views,
                    "unique_sessions": int(row_data.get("unique_sessions") or 0),
                    "total_duration_seconds": tot_dur,
                    "total_duration_minutes": round(tot_dur / 60.0, 1),
                    "avg_duration_seconds": avg_dur,
                }
            )

        # 3. Fon Bazlı Ayrı Ayrı Detaylı İstatistikler ("Fon Etkileşim Matrisi")
        tracked_rows = conn.execute(
            """
            SELECT f.fund_code, f.fund_title, f.fund_type
            FROM funds f
            ORDER BY f.fund_code ASC
            """
        ).fetchall()
        fund_meta_lookup = {
            r["fund_code"]: {"fund_title": r["fund_title"], "fund_type": r["fund_type"]}
            for r in tracked_rows
        }

        fund_event_rows = conn.execute(
            """
            SELECT
                fund_code,
                COUNT(*) AS total_events,
                SUM(CASE WHEN event_type = 'EVIDENCE_INSPECT' OR (module_name = 'evidence' AND event_type != 'PAGE_VIEW') THEN 1 ELSE 0 END) AS evidence_views,
                SUM(CASE WHEN event_type = 'TRANSPARENCY_QUERY' OR (module_name = 'transparency' AND event_type != 'PAGE_VIEW') THEN 1 ELSE 0 END) AS transparency_queries,
                SUM(CASE WHEN event_type IN ('ANALYTICS_QUERY', 'FUND_COMPARE') OR (module_name = 'analytics' AND event_type != 'PAGE_VIEW') THEN 1 ELSE 0 END) AS analytics_queries,
                SUM(CASE WHEN event_type = 'BASKET_SIMULATE' THEN 1 ELSE 0 END) AS basket_additions,
                AVG(CASE WHEN event_type = 'BASKET_SIMULATE' AND basket_weight_pct IS NOT NULL THEN basket_weight_pct END) AS avg_basket_weight_pct,
                COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds,
                COALESCE(AVG(CASE WHEN duration_seconds > 0 THEN duration_seconds END), 0) AS avg_duration_seconds
            FROM analytics_events
            WHERE fund_code IS NOT NULL AND TRIM(fund_code) != ''
            GROUP BY fund_code
            """
        ).fetchall()

        paired_counts_rows = conn.execute(
            """
            SELECT paired_fund_code AS fund_code, COUNT(*) AS paired_compare_count
            FROM analytics_events
            WHERE event_type = 'FUND_COMPARE' AND paired_fund_code IS NOT NULL AND TRIM(paired_fund_code) != ''
            GROUP BY paired_fund_code
            """
        ).fetchall()
        paired_extra_map = {r["fund_code"]: int(r["paired_compare_count"] or 0) for r in paired_counts_rows}

        fund_stats_map: Dict[str, Dict[str, Any]] = {}
        for r in fund_event_rows:
            fc = r["fund_code"]
            extra_cmp = paired_extra_map.get(fc, 0)
            ev_v = int(r["evidence_views"] or 0)
            tr_q = int(r["transparency_queries"] or 0)
            an_q = int(r["analytics_queries"] or 0) + extra_cmp
            bs_a = int(r["basket_additions"] or 0)
            tot_insp = ev_v + tr_q + an_q + bs_a
            if tot_insp == 0:
                tot_insp = int(r["total_events"] or 0) + extra_cmp
            meta_info = fund_meta_lookup.get(fc, {"fund_title": f"{fc} Yatırım Fonu", "fund_type": "Yatırım Fonu"})
            fund_stats_map[fc] = {
                "fund_code": fc,
                "fund_title": meta_info["fund_title"],
                "fund_type": meta_info["fund_type"] or "Yatırım Fonu",
                "total_inspections": tot_insp,
                "evidence_views": ev_v,
                "transparency_queries": tr_q,
                "analytics_queries": an_q,
                "basket_additions": bs_a,
                "avg_basket_weight_pct": round(float(r["avg_basket_weight_pct"] or 0.0), 1),
                "total_duration_seconds": round(float(r["total_duration_seconds"] or 0.0), 1),
                "avg_duration_seconds": round(float(r["avg_duration_seconds"] or 0.0), 1),
            }

        # Tüm takip edilen fonların matriste yer almasını sağla
        for fc, meta_info in fund_meta_lookup.items():
            if fc not in fund_stats_map:
                extra_cmp = paired_extra_map.get(fc, 0)
                fund_stats_map[fc] = {
                    "fund_code": fc,
                    "fund_title": meta_info["fund_title"],
                    "fund_type": meta_info["fund_type"] or "Yatırım Fonu",
                    "total_inspections": extra_cmp,
                    "evidence_views": 0,
                    "transparency_queries": 0,
                    "analytics_queries": extra_cmp,
                    "basket_additions": 0,
                    "avg_basket_weight_pct": 0.0,
                    "total_duration_seconds": 0.0,
                    "avg_duration_seconds": 0.0,
                }

        fund_matrix = sorted(
            fund_stats_map.values(),
            key=lambda x: (x["total_inspections"], x["total_duration_seconds"]),
            reverse=True,
        )

        # 4. Karşılaştırma & Çapraz Analiz İstatistikleri (Top Pairings & Date Ranges)
        pair_rows = conn.execute(
            """
            SELECT
                fund_code,
                paired_fund_code,
                COUNT(*) AS compare_count
            FROM analytics_events
            WHERE event_type = 'FUND_COMPARE'
              AND fund_code IS NOT NULL AND paired_fund_code IS NOT NULL
              AND TRIM(fund_code) != '' AND TRIM(paired_fund_code) != ''
            GROUP BY fund_code, paired_fund_code
            ORDER BY compare_count DESC
            LIMIT 12
            """
        ).fetchall()

        consolidated_pairs: Dict[str, int] = {}
        for pr in pair_rows:
            a, b = sorted([str(pr["fund_code"]).upper(), str(pr["paired_fund_code"]).upper()])
            if a == b:
                continue
            key = f"{a} vs {b}"
            consolidated_pairs[key] = consolidated_pairs.get(key, 0) + int(pr["compare_count"] or 0)

        total_pair_cmps = max(1, sum(consolidated_pairs.values()))
        top_pairings: List[Dict[str, Any]] = []
        for pair_lbl, cmp_cnt in sorted(consolidated_pairs.items(), key=lambda x: x[1], reverse=True)[:10]:
            parts = pair_lbl.split(" vs ")
            top_pairings.append(
                {
                    "pair_label": pair_lbl,
                    "fund_a": parts[0],
                    "fund_b": parts[1] if len(parts) > 1 else "",
                    "compare_count": cmp_cnt,
                    "share_pct": round((cmp_cnt / total_pair_cmps) * 100.0, 1),
                }
            )

        range_rows = conn.execute(
            """
            SELECT
                date_range_label,
                COUNT(*) AS query_count
            FROM analytics_events
            WHERE date_range_label IS NOT NULL AND TRIM(date_range_label) != ''
            GROUP BY date_range_label
            ORDER BY query_count DESC
            """
        ).fetchall()

        standard_ranges = ["1 Ay", "3 Ay", "6 Ay", "1 Yıl", "Özel Tarih"]
        range_map = {r["date_range_label"]: int(r["query_count"] or 0) for r in range_rows}
        total_range_queries = max(1, sum(range_map.values()))
        date_range_breakdown: List[Dict[str, Any]] = []
        for r_lbl in standard_ranges:
            q_cnt = range_map.get(r_lbl, 0)
            date_range_breakdown.append(
                {
                    "range_label": r_lbl,
                    "query_count": q_cnt,
                    "share_pct": round((q_cnt / total_range_queries) * 100.0, 1),
                }
            )
        date_range_breakdown.sort(key=lambda x: x["query_count"], reverse=True)

        # 5. Bülten & Rapor İstatistikleri
        bulletin_rows = conn.execute(
            """
            SELECT
                b.id AS bulletin_id,
                b.title,
                b.source_institution AS institution,
                b.fund_code,
                b.publish_date AS issue_date,
                SUM(CASE WHEN ae.event_type = 'BULLETIN_OPEN' THEN 1 ELSE 0 END) AS open_count,
                SUM(CASE WHEN ae.event_type = 'BULLETIN_SOURCE_CLICK' THEN 1 ELSE 0 END) AS source_click_count,
                COALESCE(SUM(ae.duration_seconds), 0) AS total_duration_seconds,
                COALESCE(AVG(CASE WHEN ae.duration_seconds > 0 THEN ae.duration_seconds END), 0) AS avg_duration_seconds
            FROM bulletins b
            LEFT JOIN analytics_events ae ON ae.bulletin_id = b.id
            GROUP BY b.id
            ORDER BY open_count DESC, source_click_count DESC, b.publish_date DESC
            """
        ).fetchall()

        bulletin_stats: List[Dict[str, Any]] = []
        for br in bulletin_rows:
            bulletin_stats.append(
                {
                    "bulletin_id": br["bulletin_id"],
                    "title": br["title"],
                    "institution": br["institution"],
                    "fund_code": br["fund_code"],
                    "issue_date": br["issue_date"],
                    "open_count": int(br["open_count"] or 0),
                    "source_click_count": int(br["source_click_count"] or 0),
                    "total_duration_seconds": round(float(br["total_duration_seconds"] or 0.0), 1),
                    "avg_duration_seconds": round(float(br["avg_duration_seconds"] or 0.0), 1),
                }
            )

        # 6. Günlük Zaman Serisi Trendi (Son 14 Gün)
        trend_rows = conn.execute(
            """
            SELECT
                SUBSTR(created_at, 1, 10) AS event_date,
                COUNT(*) AS total_events,
                SUM(CASE WHEN event_type = 'PAGE_VIEW' THEN 1 ELSE 0 END) AS page_views,
                SUM(CASE WHEN event_type IN ('EVIDENCE_INSPECT', 'TRANSPARENCY_QUERY', 'ANALYTICS_QUERY', 'FUND_COMPARE') THEN 1 ELSE 0 END) AS fund_queries,
                SUM(CASE WHEN event_type = 'BASKET_SIMULATE' THEN 1 ELSE 0 END) AS basket_simulations
            FROM analytics_events
            GROUP BY SUBSTR(created_at, 1, 10)
            ORDER BY event_date ASC
            LIMIT 14
            """
        ).fetchall()
        daily_trend = [
            {
                "date": tr["event_date"],
                "total_events": int(tr["total_events"] or 0),
                "page_views": int(tr["page_views"] or 0),
                "fund_queries": int(tr["fund_queries"] or 0),
                "basket_simulations": int(tr["basket_simulations"] or 0),
            }
            for tr in trend_rows
        ]

        # 7. Canlı Akış (Live Activity Feed - Son 50 Anonim Kullanıcı Hareketi)
        feed_rows = conn.execute(
            """
            SELECT
                id, session_id, event_type, module_name, fund_code, paired_fund_code,
                date_range_label, bulletin_id, duration_seconds, basket_weight_pct,
                metadata_json, created_at
            FROM analytics_events
            ORDER BY created_at DESC, id DESC
            LIMIT 50
            """
        ).fetchall()

        live_feed: List[Dict[str, Any]] = []
        for fr in feed_rows:
            r_dict = dict(fr)
            live_feed.append(
                {
                    "id": r_dict["id"],
                    "session_id": r_dict["session_id"],
                    "event_type": r_dict["event_type"],
                    "module_name": r_dict["module_name"],
                    "fund_code": r_dict["fund_code"],
                    "paired_fund_code": r_dict["paired_fund_code"],
                    "date_range_label": r_dict["date_range_label"],
                    "duration_seconds": round(float(r_dict["duration_seconds"] or 0.0), 1),
                    "description_tr": _build_turkish_activity_description(r_dict),
                    "created_at": r_dict["created_at"],
                    "relative_time_tr": _format_relative_time_tr(str(r_dict["created_at"])),
                }
            )

    tot_sec = float(summary_row["total_duration_seconds"] or 0.0)
    return {
        "summary": {
            "total_events": int(summary_row["total_events"] or 0),
            "unique_sessions": int(summary_row["unique_sessions"] or 0),
            "total_duration_seconds": round(tot_sec, 1),
            "total_duration_minutes": round(tot_sec / 60.0, 1),
            "total_fund_interactions": int(summary_row["total_fund_interactions"] or 0),
            "total_comparisons": int(summary_row["total_comparisons"] or 0),
            "total_basket_simulations": int(summary_row["total_basket_simulations"] or 0),
            "total_bulletin_interactions": int(summary_row["total_bulletin_interactions"] or 0),
        },
        "module_stats": module_stats,
        "fund_matrix": fund_matrix,
        "comparison_stats": {
            "top_pairings": top_pairings,
            "date_range_breakdown": date_range_breakdown,
        },
        "bulletin_stats": bulletin_stats,
        "daily_trend": daily_trend,
        "live_feed": live_feed,
    }
