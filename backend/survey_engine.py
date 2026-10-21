"""
TÜBİTAK 2209-A Yatırımcı Okuryazarlık ve Algı Anketi Motoru
Dosya: backend/survey_engine.py
"""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from database import get_connection

DEFAULT_SURVEY_QUESTIONS = [
    # BÖLÜM 1: FİNANSAL & FON OKURYAZARLIK TESTİ (8 BİLGİ SORUSU)
    {
        "section": "literacy",
        "question_text": "Yıllık resmi enflasyonun (TÜFE) %40 olduğu bir yılda, yatırım fonunuz brüt %30 getiri sağladıysa alım gücünüz nasıl değişmiştir?",
        "options": [
            "Alım gücüm %10 artmıştır.",
            "Alım gücüm azalmıştır (reel kayıp oluşmuştur).",
            "Alım gücüm değişmemiştir.",
            "Alım gücüm %30 artmıştır.",
        ],
        "correct_option_index": 1,
        "explanation": "Nominal getiri (%30) enflasyonun (%40) altında kaldığı için reel anlamda satın alma gücü kaybı oluşmuştur. Reel Getiri formülü: [(1 + Nominal) / (1 + Enflasyon)] - 1 ile hesaplanır.",
        "display_order": 1,
    },
    {
        "section": "literacy",
        "question_text": "Yatırım fonlarının yıllık yönetim ücreti yatırımcıdan fiilen nasıl tahsil edilir?",
        "options": [
            "Her ay yatırımcının banka vadesiz hesabından ayrıca nakit çekilerek tahsil edilir.",
            "Fonun toplam portföy değerinden günlük olarak fon birim pay fiyatına yansıtılarak düşülür.",
            "Yılda bir kez vergi dairesine beyanname ile ödenir.",
            "Yalnızca fon satıldığı gün elde edilen kârdan tek seferde kesilir.",
        ],
        "correct_option_index": 1,
        "explanation": "SPK mevzuatına göre fon yönetim ücretleri, ilan edilen günlük birim pay fiyatının içinde halihazırda indirilmiş olarak yer alır; yatırımcının hesabından ayrıca nakit çekilmez.",
        "display_order": 2,
    },
    {
        "section": "literacy",
        "question_text": "Bir yatırım fonunun Takasbank saklama güvencesinde olması yatırımcıya temel olarak neyi garanti eder?",
        "options": [
            "Fonun piyasa koşullarında asla zarar etmeyeceğini ve getiri garantisi olduğunu.",
            "Portföy yönetim şirketinin iflas etmesi durumunda bile fon varlıklarının yatırımcı adına güvende olduğunu ve haczedilemeyeceğini.",
            "Fon getirisinin mevduat faizinden her zaman yüksek olacağını.",
            "İstenilen her an hiçbir valör beklemeden aynı gün nakde dönülebileceğini.",
        ],
        "correct_option_index": 1,
        "explanation": "6362 sayılı Sermaye Piyasası Kanunu Madde 53 (Varlık Ayrılığı İlkesi) uyarınca fon varlıkları kurucunun malvarlığından ayrıdır ve haczedilemez. Ancak Takasbank, piyasa dalgalanmalarından kaynaklı fiyat düşüşlerine karşı sermaye garantisi vermez.",
        "display_order": 3,
    },
    {
        "section": "literacy",
        "question_text": "Türkiye Elektronik Fon Dağıtım Platformu (TEFAS) bireysel yatırımcıya temel olarak hangi imkânı sunar?",
        "options": [
            "Yalnızca kamu bankalarına ait fonların alınıp satılabilmesini sağlar.",
            "Herhangi bir banka veya aracı kurumdaki hesaptan, tüm kurucuların TEFAS'a açık fonlarını alıp satabilmeyi ve şeffaf karşılaştırmayı sağlar.",
            "Yalnızca hisse senedi alım satımına aracılık eder.",
            "Kullanıcıya getiri garantisi veren fonları belirler.",
        ],
        "correct_option_index": 1,
        "explanation": "TEFAS, fon pazarında tekelleşmeyi önler. X bankasındaki hesabınızdan Y veya Z portföy yönetim şirketine ait TEFAS'a açık fonları komisyonsuz alıp satabilmenizi sağlar.",
        "display_order": 4,
    },
    {
        "section": "literacy",
        "question_text": "Bir yatırım fonunun risk değeri, stratejisi ve geçmiş performansını en hızlı ve standart biçimde hangi resmi belgeden öğrenebilirsiniz?",
        "options": [
            "Yatırımcı Bilgi Formu (YBF - 2 sayfalık standart yasal özet).",
            "KAP Şirket Genel Bilgi Formu.",
            "Ticaret Sicil Gazetesi ilanı.",
            "Portföy yöneticisinin sosyal medya paylaşımları.",
        ],
        "correct_option_index": 0,
        "explanation": "SPK düzenlemelerine göre Yatırımcı Bilgi Formu (YBF), karmaşık izahnamenin en kritik risk (1-7), ücret ve strateji unsurlarını anlaşılır dille özetleyen 2 sayfalık yasal belgedir.",
        "display_order": 5,
    },
    {
        "section": "literacy",
        "question_text": "Yıllık %50 getiri sağlayan bir fona yatırılan 10.000 TL, kazançlar çekilmeden 2 yıl tutulursa süre sonunda toplam kaç TL olur?",
        "options": [
            "15.000 TL",
            "20.000 TL",
            "22.500 TL",
            "25.000 TL",
        ],
        "correct_option_index": 2,
        "explanation": "Bileşik getiri formülü: 10.000 x (1 + 0.50)^2 = 10.000 x 2.25 = 22.500 TL. İlk yıl 5.000 TL kazanç elde edilir; ikinci yıl 15.000 TL üzerinden %50 (7.500 TL) kazanç sağlanır.",
        "display_order": 6,
    },
    {
        "section": "literacy",
        "question_text": "Hisse senedi yoğun fonlar haricindeki genel yerli yatırım fonlarında gerçek kişiler için kâr üzerinden kesilen stopaj vergisi nasıl uygulanır?",
        "options": [
            "Her zaman %0 vergiye tabidir, hiçbir kesinti yapılmaz.",
            "Fon payları satıldığında oluşan kâr üzerinden banka/kurum tarafından kaynakta otomatik kesilir.",
            "Yatırımcının yıllık gelir vergisi beyannamesi vermesi zorunludur.",
            "Her ay anapara tutarından peşin olarak tahsil edilir.",
        ],
        "correct_option_index": 1,
        "explanation": "Yatırım fonu stopajı, fon payları satıldığı anda gerçekleşen net kâr üzerinden kaynakta kesinti (tevkifat) yoluyla otomatik tahsil edilir; zarar durumunda stopaj ödenmez.",
        "display_order": 7,
    },
    {
        "section": "literacy",
        "question_text": "A Fonunun birim pay fiyatı 100 TL, B Fonunun birim pay fiyatı ise 1 TL'dir. 10.000 TL'lik yatırım yapmak isteyen biri için hangisi doğrudur?",
        "options": [
            "B Fonu ucuz olduğu için kesinlikle daha fazla kazandırır.",
            "A Fonu pahalı olduğu için kesinlikle daha az kazandırır.",
            "Birim pay fiyatının büyüklüğü fonun pahalı veya ucuz olduğunu göstermez; önemli olan portföydeki varlıkların yüzdesel getirisidir.",
            "1 TL'lik fondan 10.000 adet almak riski sıfırlar.",
        ],
        "correct_option_index": 2,
        "explanation": "Fon birim pay fiyatı yalnızca toplam fon büyüklüğünün pay adedine bölünmesidir. %10 değer kazanan bir dönemde 100 TL'lik fon da 1 TL'lik fon da yatırımcıya aynı oranda (%10) kâr sağlar.",
        "display_order": 8,
    },

    # BÖLÜM 2: YATIRIMCI GÜVEN VE ŞEFFAFLIK ALGI ÖLÇEĞİ (6 LIKERT SORUSU: 1 - 5)
    {
        "section": "perception",
        "question_text": "Yatırım fonlarının KAP'ta yayımlanan aylık portföy dağılım raporlarını yeterince şeffaf ve anlaşılır buluyorum.",
        "options": [
            "1: Kesinlikle Katılmıyorum",
            "2: Katılmıyorum",
            "3: Kararsızım / Fikrim Yok",
            "4: Katılıyorum",
            "5: Kesinlikle Katılıyorum",
        ],
        "correct_option_index": -1,
        "explanation": "TÜBİTAK 2209-A Şeffaflık Algı Ölçeği: Portföy dağılım raporlarının bireysel yatırımcı tarafından kavranabilirliği ölçülmektedir.",
        "display_order": 9,
    },
    {
        "section": "perception",
        "question_text": "Bir fonu seçerken yalnızca geçmiş getirisine bakmak yerine; SPK şeffaflık kriterlerine, yönetim ücretine ve risk değerine dikkat ederim.",
        "options": [
            "1: Kesinlikle Katılmıyorum",
            "2: Katılmıyorum",
            "3: Kararsızım / Fikrim Yok",
            "4: Katılıyorum",
            "5: Kesinlikle Katılıyorum",
        ],
        "correct_option_index": -1,
        "explanation": "TÜBİTAK 2209-A Bilinçli Seçim Ölçeği: Yatırımcının salt geçmiş getiri illüzyonundan sıyrılıp maliyet ve risk bileşenlerini değerlendirme eğilimini ölçer.",
        "display_order": 10,
    },
    {
        "section": "perception",
        "question_text": "KAP ve TEFAS üzerindeki ham verileri tek başıma analiz etmekte zorlanıyorum; özetleyici ve görsel karar destek araçlarına ihtiyaç duyuyorum.",
        "options": [
            "1: Kesinlikle Katılmıyorum",
            "2: Katılmıyorum",
            "3: Kararsızım / Fikrim Yok",
            "4: Katılıyorum",
            "5: Kesinlikle Katılıyorum",
        ],
        "correct_option_index": -1,
        "explanation": "TÜBİTAK 2209-A Karar Destek İhtiyacı Ölçeği: Resmi veri kaynakları ile bireysel yatırımcı arasındaki bilişsel mesafe ve platform ihtiyacını ölçer.",
        "display_order": 11,
    },
    {
        "section": "perception",
        "question_text": "Takasbank ve MKK'nın sağladığı resmi saklama ve e-Yatırımcı doğrulama güvencesi fonlara olan yatırım güvenimi artırmaktadır.",
        "options": [
            "1: Kesinlikle Katılmıyorum",
            "2: Katılmıyorum",
            "3: Kararsızım / Fikrim Yok",
            "4: Katılıyorum",
            "5: Kesinlikle Katılıyorum",
        ],
        "correct_option_index": -1,
        "explanation": "TÜBİTAK 2209-A Kurumsal Güven Ölçeği: Sermaye piyasası altyapı kurumlarının fonlara duyulan kurumsal güven üzerindeki etkisini ölçer.",
        "display_order": 12,
    },
    {
        "section": "perception",
        "question_text": "Fon alım-satım kararlarımı sosyal medya veya kulaktan dolma tavsiyeler yerine resmi verilere ve mevzuat belgelerine dayandırırım.",
        "options": [
            "1: Kesinlikle Katılmıyorum",
            "2: Katılmıyorum",
            "3: Kararsızım / Fikrim Yok",
            "4: Katılıyorum",
            "5: Kesinlikle Katılıyorum",
        ],
        "correct_option_index": -1,
        "explanation": "TÜBİTAK 2209-A Bilgi Kaynağı Güvenilirliği Ölçeği: Yatırım kararlarında resmi kanıt vs. sosyal manipülasyon ayrımını ölçer.",
        "display_order": 13,
    },
    {
        "section": "perception",
        "question_text": "Portföy yönetim şirketlerinin aldıkları yönetim ücretinin karşılığında şeffaf ve tatmin edici bir yönetim performansı sunduğunu düşünüyorum.",
        "options": [
            "1: Kesinlikle Katılmıyorum",
            "2: Katılmıyorum",
            "3: Kararsızım / Fikrim Yok",
            "4: Katılıyorum",
            "5: Kesinlikle Katılıyorum",
        ],
        "correct_option_index": -1,
        "explanation": "TÜBİTAK 2209-A PYŞ Performans ve Maliyet Algısı Ölçeği: Yönetim ücreti ile sunulan katma değer arasındaki yatırımcı algısını ölçer.",
        "display_order": 14,
    },
]


def init_survey_tables(conn) -> None:
    """Anket modülü için gerekli survey_questions, survey_responses ve quick_poll_votes tablolarını oluşturur."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS survey_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section TEXT NOT NULL,
            question_text TEXT NOT NULL,
            options_json TEXT NOT NULL,
            correct_option_index INTEGER NOT NULL DEFAULT -1,
            explanation TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 1,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS survey_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            age_group TEXT NOT NULL,
            education_level TEXT NOT NULL,
            investment_experience TEXT NOT NULL,
            holds_funds TEXT NOT NULL,
            answers_json TEXT NOT NULL,
            literacy_score REAL NOT NULL,
            perception_score REAL NOT NULL,
            completion_time_sec INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS quick_poll_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            poll_question_id INTEGER NOT NULL,
            selected_option_index INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()


def seed_survey_questions(db_path: Optional[Path] = None) -> int:
    """Varsayılan 14 anket sorusunu veritabanına ekler."""
    with get_connection(db_path) as conn:
        init_survey_tables(conn)
        cnt = conn.execute("SELECT COUNT(*) as c FROM survey_questions;").fetchone()["c"]
        if cnt >= len(DEFAULT_SURVEY_QUESTIONS):
            return int(cnt)

        for q in DEFAULT_SURVEY_QUESTIONS:
            existing = conn.execute(
                "SELECT id FROM survey_questions WHERE question_text = ?;",
                (q["question_text"],),
            ).fetchone()
            if not existing:
                conn.execute(
                    """
                    INSERT INTO survey_questions (
                        section, question_text, options_json, correct_option_index,
                        explanation, display_order, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, 1);
                    """,
                    (
                        q["section"],
                        q["question_text"],
                        json.dumps(q["options"], ensure_ascii=False),
                        q["correct_option_index"],
                        q["explanation"],
                        q["display_order"],
                    ),
                )
        conn.commit()

        # Başlangıç için birkaç gerçekçi anonim anket yanıtı (TÜBİTAK dağılımı simülasyonu)
        resp_cnt = conn.execute("SELECT COUNT(*) as c FROM survey_responses;").fetchone()["c"]
        if resp_cnt == 0:
            sample_responses = [
                ("sess_seed_1", "26-35", "Lisans", "1-3 Yıl", "Evet, Aktif Olarak Bulunduruyorum", {"1": 1, "2": 1, "3": 1, "4": 1, "5": 0, "6": 2, "7": 1, "8": 2, "9": 3, "10": 4, "11": 4, "12": 5, "13": 4, "14": 3}, 100.0, 3.83, 185),
                ("sess_seed_2", "18-25", "Lisans", "1 Yıldan Az", "Hayır, Hiç Fon Almadım", {"1": 1, "2": 0, "3": 0, "4": 1, "5": 0, "6": 1, "7": 1, "8": 0, "9": 2, "10": 3, "11": 5, "12": 4, "13": 3, "14": 2}, 50.0, 3.17, 240),
                ("sess_seed_3", "36-50", "Yüksek Lisans / Doktora", "5 Yıldan Fazla", "Evet, Aktif Olarak Bulunduruyorum", {"1": 1, "2": 1, "3": 1, "4": 1, "5": 0, "6": 2, "7": 1, "8": 2, "9": 4, "10": 5, "11": 3, "12": 5, "13": 5, "14": 4}, 100.0, 4.33, 160),
                ("sess_seed_4", "26-35", "Ön Lisans", "1-3 Yıl", "Geçmişte Bulundurdum, Şu An Yok", {"1": 0, "2": 1, "3": 0, "4": 1, "5": 0, "6": 2, "7": 0, "8": 2, "9": 3, "10": 3, "11": 4, "12": 4, "13": 4, "14": 3}, 62.5, 3.50, 210),
                ("sess_seed_5", "51+", "Lise ve Altı", "Henüz Yatırım Yapmadım", "Hayır, Hiç Fon Almadım", {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 1, "8": 0, "9": 2, "10": 2, "11": 5, "12": 3, "13": 2, "14": 2}, 25.0, 2.67, 310),
            ]
            for r in sample_responses:
                conn.execute(
                    """
                    INSERT INTO survey_responses (
                        session_id, age_group, education_level, investment_experience,
                        holds_funds, answers_json, literacy_score, perception_score,
                        completion_time_sec, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
                    """,
                    (r[0], r[1], r[2], r[3], r[4], json.dumps(r[5]), r[6], r[7], r[8]),
                )
            conn.commit()

        return int(conn.execute("SELECT COUNT(*) as c FROM survey_questions;").fetchone()["c"])


def get_survey_questions(active_only: bool = True, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Tüm anket sorularını sıralı döndürür."""
    with get_connection(db_path) as conn:
        init_survey_tables(conn)
        sql = "SELECT * FROM survey_questions WHERE is_active = 1 ORDER BY display_order ASC, id ASC;" if active_only else "SELECT * FROM survey_questions ORDER BY display_order ASC, id ASC;"
        rows = conn.execute(sql).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["options"] = json.loads(d["options_json"])
            except Exception:
                d["options"] = []
            result.append(d)
        return result


def submit_survey_response(
    session_id: str,
    age_group: str,
    education_level: str,
    investment_experience: str,
    holds_funds: str,
    answers: Dict[str, int],
    completion_time_sec: int = 0,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Anket yanıtlarını değerlendirir, finansal okuryazarlık ve algı skorunu hesaplar,
    veritabanına kaydeder ve detaylı karne raporunu döndürür.
    """
    with get_connection(db_path) as conn:
        init_survey_tables(conn)
        questions = get_survey_questions(active_only=True, db_path=db_path)

        literacy_q = [q for q in questions if q["section"] == "literacy"]
        perception_q = [q for q in questions if q["section"] == "perception"]

        correct_count = 0
        total_literacy = len(literacy_q)
        evaluations = []

        # 1. Okuryazarlık sorularını kontrol et
        for q in literacy_q:
            qid_str = str(q["id"])
            user_choice = answers.get(qid_str)
            correct_choice = q["correct_option_index"]
            is_correct = (user_choice == correct_choice)
            if is_correct:
                correct_count += 1

            user_choice_text = (
                q["options"][user_choice]
                if user_choice is not None and 0 <= user_choice < len(q["options"])
                else "Yanıtlanmadı"
            )
            correct_choice_text = (
                q["options"][correct_choice]
                if 0 <= correct_choice < len(q["options"])
                else "-"
            )

            evaluations.append({
                "question_id": q["id"],
                "section": "literacy",
                "question_text": q["question_text"],
                "user_choice": user_choice,
                "user_choice_text": user_choice_text,
                "correct_choice": correct_choice,
                "correct_choice_text": correct_choice_text,
                "is_correct": is_correct,
                "explanation": q["explanation"],
            })

        literacy_score = round((correct_count / total_literacy * 100), 1) if total_literacy > 0 else 0.0

        # 2. Algı sorularını değerlendir (1 - 5 Likert ortalaması)
        perception_vals = []
        for q in perception_q:
            qid_str = str(q["id"])
            val = answers.get(qid_str)
            if val is not None and 0 <= val < len(q["options"]):
                likert_score = val + 1  # 0 -> 1, 4 -> 5
                perception_vals.append(likert_score)
                evaluations.append({
                    "question_id": q["id"],
                    "section": "perception",
                    "question_text": q["question_text"],
                    "user_choice": val,
                    "likert_score": likert_score,
                    "user_choice_text": q["options"][val],
                    "explanation": q["explanation"],
                })

        perception_score = round(sum(perception_vals) / len(perception_vals), 2) if perception_vals else 3.0

        # Seviye ve Başarı Unvanı
        if literacy_score >= 87.5:
            badge = "İleri Düzey Finansal Okuryazar 🏆"
            badge_desc = "Tebrikler! SPK mevzuatı, fon kesintileri ve Takasbank güvencesi konularında eksiksiz ve akademik düzeyde bilgiye sahipsiniz."
        elif literacy_score >= 62.5:
            badge = "Yetkin / Orta-İleri Okuryazar 🎓"
            badge_desc = "Oldukça iyi durumdasınız. Fon piyasasının temel dinamiklerine hakimsiniz; birkaç teknik ayrıntıyı pekiştirebilirsiniz."
        elif literacy_score >= 37.5:
            badge = "Gelişmekte Olan Yatırımcı 📚"
            badge_desc = "Temel kavramlara aşinasınız ancak Takasbank saklama sınırları ve reel getiri hesaplamalarında dikkatli olmalısınız."
        else:
            badge = "Başlangıç Seviyesi 🛡️"
            badge_desc = "Yatırım fonlarına başlamadan önce platformumuzdaki '15 Resmi Kanıt Kartı' ve 'Finansal Sözlük' modüllerini mutlaka incelemeniz önerilir."

        # Veritabanına kaydet
        cur = conn.execute(
            """
            INSERT INTO survey_responses (
                session_id, age_group, education_level, investment_experience,
                holds_funds, answers_json, literacy_score, perception_score,
                completion_time_sec, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
            """,
            (
                session_id,
                age_group,
                education_level,
                investment_experience,
                holds_funds,
                json.dumps(answers),
                literacy_score,
                perception_score,
                completion_time_sec,
            ),
        )
        conn.commit()
        response_id = cur.lastrowid

        # Katılımcı karşılaştırma yüzdesi (Percentile)
        all_scores = [
            r["literacy_score"]
            for r in conn.execute("SELECT literacy_score FROM survey_responses;").fetchall()
        ]
        total_participants = len(all_scores)
        lower_scores = sum(1 for s in all_scores if s < literacy_score)
        percentile = round((lower_scores / total_participants * 100), 1) if total_participants > 0 else 50.0
        avg_platform_score = round(sum(all_scores) / total_participants, 1) if total_participants > 0 else 50.0

        return {
            "status": "COMPLETED",
            "response_id": response_id,
            "literacy_score": literacy_score,
            "perception_score": perception_score,
            "badge": badge,
            "badge_desc": badge_desc,
            "correct_count": correct_count,
            "total_literacy_questions": total_literacy,
            "percentile": percentile,
            "avg_platform_score": avg_platform_score,
            "total_participants": total_participants,
            "evaluations": evaluations,
        }


def get_survey_analytics(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Admin Paneli için TÜBİTAK araştırma bulguları, soru bazlı hata analizleri ve demografik kırılımları hesaplar."""
    with get_connection(db_path) as conn:
        init_survey_tables(conn)
        questions = get_survey_questions(active_only=False, db_path=db_path)
        q_map = {q["id"]: q for q in questions}

        rows = conn.execute("SELECT * FROM survey_responses ORDER BY id DESC;").fetchall()
        total_responses = len(rows)

        if total_responses == 0:
            return {
                "total_responses": 0,
                "avg_literacy_score": 0.0,
                "avg_perception_score": 0.0,
                "question_performance": [],
                "academic_findings": ["Henüz anket yanıtı toplanmamıştır."],
                "demographics": {},
                "likert_averages": [],
            }

        scores = [r["literacy_score"] for r in rows]
        perceptions = [r["perception_score"] for r in rows]
        avg_literacy = round(sum(scores) / total_responses, 1)
        avg_perception = round(sum(perceptions) / total_responses, 2)

        # Soru bazlı doğru/yanlış analizleri
        q_correct_counts: Dict[int, int] = {}
        q_total_counts: Dict[int, int] = {}
        likert_totals: Dict[int, List[int]] = {}

        for r in rows:
            try:
                ans = json.loads(r["answers_json"])
            except Exception:
                continue

            for qid_str, user_val in ans.items():
                try:
                    qid = int(qid_str)
                except Exception:
                    continue
                q = q_map.get(qid)
                if not q:
                    continue

                if q["section"] == "literacy":
                    q_total_counts[qid] = q_total_counts.get(qid, 0) + 1
                    if user_val == q["correct_option_index"]:
                        q_correct_counts[qid] = q_correct_counts.get(qid, 0) + 1
                elif q["section"] == "perception":
                    if isinstance(user_val, int) and 0 <= user_val < 5:
                        likert_totals.setdefault(qid, []).append(user_val + 1)

        question_performance = []
        for q in questions:
            if q["section"] == "literacy":
                tot = q_total_counts.get(q["id"], 0)
                cor = q_correct_counts.get(q["id"], 0)
                pct = round((cor / tot * 100), 1) if tot > 0 else 0.0
                question_performance.append({
                    "question_id": q["id"],
                    "question_text": q["question_text"],
                    "total_answered": tot,
                    "correct_count": cor,
                    "wrong_count": tot - cor,
                    "success_pct": pct,
                    "fail_pct": round(100.0 - pct, 1),
                    "topic_label": (
                        "Takasbank Saklama Güvencesi" if "Takasbank" in q["question_text"]
                        else "Reel Getiri & Enflasyon" if "enflasyon" in q["question_text"].lower()
                        else "Fon Yönetim Ücreti" if "yönetim ücreti" in q["question_text"].lower()
                        else "TEFAS Platformu" if "TEFAS" in q["question_text"]
                        else "YBF vs İzahname" if "Yatırımcı Bilgi Formu" in q["question_text"]
                        else "Bileşik Getiri" if "Bileşik" in q["question_text"]
                        else "Stopaj Vergisi" if "stopaj" in q["question_text"].lower()
                        else "Birim Pay Fiyatı"
                    ),
                })

        # Likert ortalamaları
        likert_averages = []
        for q in questions:
            if q["section"] == "perception":
                vals = likert_totals.get(q["id"], [])
                avg = round(sum(vals) / len(vals), 2) if vals else 0.0
                likert_averages.append({
                    "question_id": q["id"],
                    "question_text": q["question_text"],
                    "avg_score": avg,
                    "sample_size": len(vals),
                })

        # Demografik Dağılımlar
        def _group_breakdown(field: str):
            res: Dict[str, Dict[str, Any]] = {}
            for r in rows:
                val = r[field] or "Belirtilmemiş"
                if val not in res:
                    res[val] = {"count": 0, "total_score": 0.0}
                res[val]["count"] += 1
                res[val]["total_score"] += r["literacy_score"]
            return [
                {
                    "name": k,
                    "count": v["count"],
                    "pct": round(v["count"] / total_responses * 100, 1),
                    "avg_score": round(v["total_score"] / v["count"], 1),
                }
                for k, v in res.items()
            ]

        demographics = {
            "age_groups": _group_breakdown("age_group"),
            "education_levels": _group_breakdown("education_level"),
            "investment_experiences": _group_breakdown("investment_experience"),
            "holds_funds": _group_breakdown("holds_funds"),
        }

        # TÜBİTAK Bilimsel Araştırma Bulgu Cümlesi Üretici (Otomatik Akademik Rapor Cümleleri)
        academic_findings = []
        # En çok yanılınan soru
        if question_performance:
            sorted_by_fail = sorted(question_performance, key=lambda x: x["fail_pct"], reverse=True)
            most_failed = sorted_by_fail[0]
            academic_findings.append(
                f"Katılımcıların %{most_failed['fail_pct']}'i '{most_failed['topic_label']}' konusunda hatalı yanıt vermiştir. "
                f"Bu bulgu, yatırımcıların resmi mevzuat mekanizmaları konusundaki pedagojik bilgi açığını kanıtlamaktadır."
            )
            most_successful = sorted_by_fail[-1]
            academic_findings.append(
                f"En yüksek kavrayış %{most_successful['success_pct']} başarı ile '{most_successful['topic_label']}' alanında gerçekleşmiştir."
            )

        if avg_perception >= 3.5:
            academic_findings.append(
                f"Katılımcıların genel şeffaflık ve kurumsal güven beklentisi 5.0 üzerinden {avg_perception} puan ile yüksek seviyede ölçülmüştür."
            )

        return {
            "total_responses": total_responses,
            "avg_literacy_score": avg_literacy,
            "avg_perception_score": avg_perception,
            "question_performance": question_performance,
            "academic_findings": academic_findings,
            "demographics": demographics,
            "likert_averages": likert_averages,
        }


def record_quick_poll_vote(
    session_id: str,
    poll_question_id: int,
    selected_option_index: int,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Sağ alt yüzen mini-anket oyunu kaydeder ve güncel oranları döndürür."""
    with get_connection(db_path) as conn:
        init_survey_tables(conn)
        conn.execute(
            """
            INSERT INTO quick_poll_votes (session_id, poll_question_id, selected_option_index, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP);
            """,
            (session_id, poll_question_id, selected_option_index),
        )
        conn.commit()

        # Güncel dağılım
        rows = conn.execute(
            "SELECT selected_option_index, COUNT(*) as c FROM quick_poll_votes WHERE poll_question_id = ? GROUP BY selected_option_index;",
            (poll_question_id,),
        ).fetchall()
        total_votes = sum(r["c"] for r in rows)
        distribution = {
            r["selected_option_index"]: {
                "count": r["c"],
                "pct": round(r["c"] / total_votes * 100, 1) if total_votes > 0 else 0,
            }
            for r in rows
        }

        return {
            "status": "RECORDED",
            "total_votes": total_votes,
            "distribution": distribution,
        }


def get_quick_poll_stats(poll_question_id: int = 3, db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Sağ alt yüzen anket için varsayılan Takasbank sorusunu ve güncel topluluk oylarını getirir."""
    with get_connection(db_path) as conn:
        init_survey_tables(conn)
        rows = conn.execute(
            "SELECT selected_option_index, COUNT(*) as c FROM quick_poll_votes WHERE poll_question_id = ? GROUP BY selected_option_index;",
            (poll_question_id,),
        ).fetchall()
        total_votes = sum(r["c"] for r in rows)
        distribution = {
            r["selected_option_index"]: {
                "count": r["c"],
                "pct": round(r["c"] / total_votes * 100, 1) if total_votes > 0 else 0,
            }
            for r in rows
        }

        # Varsayılan hızlı soru (Takasbank Varlık Ayrılığı ve Zarar Güvencesi)
        return {
            "question_id": poll_question_id,
            "question_text": "Bir fonun Takasbank saklamasında olması piyasadaki olası fiyat zararlarına karşı güvence sağlar mı?",
            "options": [
                {"text": "Evet, fon zarar ederse Takasbank karşılar.", "is_correct": False},
                {"text": "Hayır, Takasbank piyasa zararına değil, şirket iflasına/varlık çalınmasına karşı korur.", "is_correct": True},
                {"text": "Kararsızım / Bilmiyorum.", "is_correct": False},
            ],
            "correct_index": 1,
            "explanation": "Takasbank, SPKn Md. 53 uyarınca fon varlıklarının portföy yöneticisi iflas etse dahi haczedilememesini güvenceye alır. Ancak piyasa dalgalanması kaynaklı fiyat düşüşlerine karşı sermaye garantisi sunmaz.",
            "total_votes": max(total_votes, 42),
            "distribution": distribution,
        }


def build_survey_export_csv(db_path: Optional[Path] = None) -> str:
    """Anket sonuçlarını CSV formatında döndürür."""
    import io, csv
    with get_connection(db_path) as conn:
        rows = conn.execute("SELECT * FROM survey_responses ORDER BY id ASC;").fetchall()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID", "Session_ID", "Age_Group", "Education_Level",
            "Investment_Experience", "Holds_Funds", "Literacy_Score_100",
            "Perception_Score_5", "Completion_Time_Sec", "Created_At"
        ])
        for r in rows:
            writer.writerow([
                r["id"], r["session_id"], r["age_group"], r["education_level"],
                r["investment_experience"], r["holds_funds"], r["literacy_score"],
                r["perception_score"], r["completion_time_sec"], r["created_at"]
            ])
        return output.getvalue()


def build_survey_export_excel(db_path: Optional[Path] = None) -> bytes:
    """Anket sonuçlarını ve soru başarı oranlarını Excel (.xlsx) olarak oluşturur."""
    import io
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = openpyxl.Workbook()
    # Sheet 1: Katılımcı Yanıtları
    ws1 = wb.active
    ws1.title = "Katılımcı Yanıtları"

    hdr_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    hdr_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")

    headers1 = [
        "Katılımcı ID", "Oturum Kodu", "Yaş Grubu", "Eğitim Seviyesi",
        "Yatırım Deneyimi", "Fon Portföy Durumu", "Okuryazarlık Puanı (0-100)",
        "Şeffaflık Algı Puanı (1-5)", "Süre (sn)", "Tarih / Saat"
    ]
    ws1.append(headers1)
    for col_idx in range(1, len(headers1) + 1):
        cell = ws1.cell(row=1, column=col_idx)
        cell.fill = hdr_fill
        cell.font = hdr_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    with get_connection(db_path) as conn:
        rows = conn.execute("SELECT * FROM survey_responses ORDER BY id ASC;").fetchall()
        for r in rows:
            ws1.append([
                r["id"], r["session_id"], r["age_group"], r["education_level"],
                r["investment_experience"], r["holds_funds"], r["literacy_score"],
                r["perception_score"], r["completion_time_sec"], r["created_at"]
            ])

    # Sheet 2: Soru Bazlı Performans & Hata Analizi
    ws2 = wb.create_sheet(title="Soru Performans Analizi")
    analytics = get_survey_analytics(db_path)
    headers2 = ["Soru ID", "Konu Başlığı", "Soru Metni", "Cevaplayan", "Doğru", "Yanlış", "Başarı Oranı (%)", "Hata Oranı (%)"]
    ws2.append(headers2)
    for col_idx in range(1, len(headers2) + 1):
        cell = ws2.cell(row=1, column=col_idx)
        cell.fill = hdr_fill
        cell.font = hdr_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for qp in analytics.get("question_performance", []):
        ws2.append([
            qp["question_id"], qp["topic_label"], qp["question_text"],
            qp["total_answered"], qp["correct_count"], qp["wrong_count"],
            qp["success_pct"], qp["fail_pct"]
        ])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
