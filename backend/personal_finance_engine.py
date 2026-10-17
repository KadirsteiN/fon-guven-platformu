"""
Modül E — Kişisel Finans Yönetimi, Bütçe Limitleri ve Acil Durum Rezervi Motoru
Dosya: backend/personal_finance_engine.py

Kurallar (PROJECT_RULES.md):
- Kural 2 (Örnek/Simülasyon Ayrımı): Başlangıç bütçe verileri 'KULLANICI_BUTCE_VERISI'
  olarak açıkça etiketlenir ve gerçek piyasa verilerinden (TEFAS) ayrı tutulur.
- Kural 5 (Hesaplama Şeffaflığı): Tasarruf oranı, zorunlu/değişken gider kırılımı,
  bütçe limit aşımı ve acil durum rezervi (ay cinsinden karşılama süresi)
  doğrulanabilir Python fonksiyonlarıyla hesaplanır.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import pandas as pd

from database import get_connection


SAMPLE_TRANSACTIONS: List[Dict[str, Any]] = [
    # Gelirler (2026-10)
    {
        "tx_type": "INCOME",
        "category": "Maaş",
        "is_fixed": 1,
        "amount": 65000.0,
        "tx_date": "2026-10-01",
        "description": "Aylık Net Maaş Geliri",
    },
    {
        "tx_type": "INCOME",
        "category": "Ek Gelir / Proje",
        "is_fixed": 0,
        "amount": 7500.0,
        "tx_date": "2026-10-10",
        "description": "TÜBİTAK / Araştırma & Danışmanlık Ek Geliri",
    },
    # Sabit / Zorunlu Giderler (is_fixed = 1)
    {
        "tx_type": "EXPENSE",
        "category": "Kira/Konut",
        "is_fixed": 1,
        "amount": 20000.0,
        "tx_date": "2026-10-02",
        "description": "Aylık Konut Kirası ve Aidat",
    },
    {
        "tx_type": "EXPENSE",
        "category": "Market/Gıda",
        "is_fixed": 1,
        "amount": 11500.0,
        "tx_date": "2026-10-06",
        "description": "Aylık Temel Mutfak ve Market Alışverişi",
    },
    {
        "tx_type": "EXPENSE",
        "category": "Faturalar",
        "is_fixed": 1,
        "amount": 3200.0,
        "tx_date": "2026-10-08",
        "description": "Elektrik, Doğalgaz, Su ve İnternet Faturaları",
    },
    {
        "tx_type": "EXPENSE",
        "category": "Ulaşım",
        "is_fixed": 1,
        "amount": 2800.0,
        "tx_date": "2026-10-09",
        "description": "Şehir İçi Ulaşım ve Akaryakıt",
    },
    # Değişken / İsteğe Bağlı Giderler (is_fixed = 0)
    {
        "tx_type": "EXPENSE",
        "category": "Eğitim",
        "is_fixed": 0,
        "amount": 2500.0,
        "tx_date": "2026-10-11",
        "description": "Finansal Veri Mühendisliği Kitap ve Eğitim Abonelikleri",
    },
    {
        "tx_type": "EXPENSE",
        "category": "İsteğe Bağlı",
        "is_fixed": 0,
        "amount": 6500.0,
        "tx_date": "2026-10-14",
        "description": "Dışarıda Yemek, Sosyal Etkinlik ve Kişisel Harcamalar",
    },
]

SAMPLE_SAVINGS_GOALS: List[Dict[str, Any]] = [
    {
        "goal_name": "Acil Durum ve Yatırım Fonu Güvence Fonu Hedefi",
        "target_amount": 250000.0,
        "current_saved": 95000.0,
        "target_date": "2027-06-30",
        "priority": "YÜKSEK",
    },
    {
        "goal_name": "Yüksek Lisans / Teknoloji Ekipman Birikimi",
        "target_amount": 120000.0,
        "current_saved": 30000.0,
        "target_date": "2027-03-31",
        "priority": "ORTA",
    },
]

SAMPLE_DEBTS: List[Dict[str, Any]] = [
    {
        "debt_name": "Kredi Kartı Taksitli Eğitim/Teknoloji Harcaması",
        "total_remaining": 24000.0,
        "monthly_payment": 6000.0,
        "interest_rate_note": "Vade farksız 4 taksit kaldı",
        "due_day": 15,
    },
]

SAMPLE_BUDGET_LIMITS: List[Dict[str, Any]] = [
    {"category": "Kira/Konut", "monthly_limit": 20000.0},
    {"category": "Market/Gıda", "monthly_limit": 12000.0},
    {"category": "Faturalar", "monthly_limit": 3500.0},
    {"category": "Ulaşım", "monthly_limit": 3000.0},
    {"category": "Eğitim", "monthly_limit": 3000.0},
    {"category": "İsteğe Bağlı", "monthly_limit": 5000.0},  # 6.500 TL harcama ile limit aşımı örneği!
]


def seed_sample_personal_finance(
    reset_existing: bool = True,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Kullanıcı tarafından düzenlenebilir başlangıç kişisel bütçe profilini
    SQLite veritabanına yükler.
    """
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        if reset_existing:
            cursor.execute("DELETE FROM finance_transactions;")
            cursor.execute("DELETE FROM savings_goals;")
            cursor.execute("DELETE FROM debts;")
            cursor.execute("DELETE FROM budget_limits;")

        cursor.executemany(
            """
            INSERT INTO finance_transactions (tx_type, category, is_fixed, amount, tx_date, description)
            VALUES (:tx_type, :category, :is_fixed, :amount, :tx_date, :description);
            """,
            SAMPLE_TRANSACTIONS,
        )

        cursor.executemany(
            """
            INSERT INTO savings_goals (goal_name, target_amount, current_saved, target_date, priority)
            VALUES (:goal_name, :target_amount, :current_saved, :target_date, :priority);
            """,
            SAMPLE_SAVINGS_GOALS,
        )

        cursor.executemany(
            """
            INSERT INTO debts (debt_name, total_remaining, monthly_payment, interest_rate_note, due_day)
            VALUES (:debt_name, :total_remaining, :monthly_payment, :interest_rate_note, :due_day);
            """,
            SAMPLE_DEBTS,
        )

        cursor.executemany(
            """
            INSERT INTO budget_limits (category, monthly_limit)
            VALUES (:category, :monthly_limit);
            """,
            SAMPLE_BUDGET_LIMITS,
        )
        conn.commit()

    return {
        "data_origin": "KULLANICI_BUTCE_VERISI (Düzenlenebilir Örnek Bütçe Profili)",
        "transactions_seeded": len(SAMPLE_TRANSACTIONS),
        "goals_seeded": len(SAMPLE_SAVINGS_GOALS),
        "debts_seeded": len(SAMPLE_DEBTS),
        "budget_limits_seeded": len(SAMPLE_BUDGET_LIMITS),
    }


def add_transaction(
    tx_type: str,
    category: str,
    amount: float,
    tx_date: str,
    is_fixed: int = 0,
    description: str = "",
    db_path: Optional[Path] = None,
) -> int:
    """Yeni bir gelir veya gider işlemini veritabanına ekler."""
    t_type = tx_type.strip().upper()
    if t_type not in ("INCOME", "EXPENSE"):
        raise ValueError("tx_type 'INCOME' veya 'EXPENSE' olmalıdır.")
    if amount <= 0:
        raise ValueError("Tutar 0'dan büyük olmalıdır.")

    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO finance_transactions (tx_type, category, is_fixed, amount, tx_date, description)
            VALUES (?, ?, ?, ?, ?, ?);
            """,
            (t_type, category.strip(), 1 if is_fixed else 0, float(amount), tx_date.strip(), description.strip()),
        )
        conn.commit()
        return int(cur.lastrowid)


def add_savings_goal(
    goal_name: str,
    target_amount: float,
    current_saved: float,
    target_date: str,
    priority: str = "YÜKSEK",
    db_path: Optional[Path] = None,
) -> int:
    """Yeni bir birikim hedefini veritabanına ekler."""
    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO savings_goals (goal_name, target_amount, current_saved, target_date, priority)
            VALUES (?, ?, ?, ?, ?);
            """,
            (goal_name.strip(), float(target_amount), float(current_saved), target_date.strip(), priority.strip()),
        )
        conn.commit()
        return int(cur.lastrowid)


def get_financial_health_report(
    month_prefix: str = "2026-10",
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Nakit Akışı, Bütçe Limit Aşımı ve Acil Durum Rezervi Raporu:
    - Toplam Gelir, Toplam Gider (Sabit/Zorunlu vs. Değişken Gider kırılımı),
      Aylık Borç Taksit Yükü, Net Aylık Tasarruf/Yatırım Kapasitesi (TL) ve Tasarruf Oranı (%).
    - Kategori bazlı bütçe limit aşım analizleri.
    - Acil Durum Rezervi Analizi: Mevcut nakit/likit birikimin kaç aylık zorunlu gideri
      (Sabit giderler + Aylık borç taksitleri) karşıladığı (Önerilen: 3-6 ay).
    """
    with get_connection(db_path) as conn:
        tx_rows = conn.execute(
            """
            SELECT id, tx_type, category, is_fixed, amount, tx_date, description
            FROM finance_transactions
            WHERE tx_date LIKE ?
            ORDER BY tx_date ASC, id ASC;
            """,
            (f"{month_prefix}%",),
        ).fetchall()

        goal_rows = conn.execute(
            "SELECT * FROM savings_goals ORDER BY id ASC;"
        ).fetchall()

        debt_rows = conn.execute(
            "SELECT * FROM debts ORDER BY id ASC;"
        ).fetchall()

        limit_rows = conn.execute(
            "SELECT category, monthly_limit FROM budget_limits ORDER BY id ASC;"
        ).fetchall()

    transactions = [dict(r) for r in tx_rows]
    goals = [dict(r) for r in goal_rows]
    debts = [dict(r) for r in debt_rows]
    limits_map = {r["category"]: float(r["monthly_limit"]) for r in limit_rows}

    total_income = sum(float(t["amount"]) for t in transactions if t["tx_type"] == "INCOME")
    fixed_expenses = sum(
        float(t["amount"]) for t in transactions if t["tx_type"] == "EXPENSE" and int(t["is_fixed"]) == 1
    )
    variable_expenses = sum(
        float(t["amount"]) for t in transactions if t["tx_type"] == "EXPENSE" and int(t["is_fixed"]) == 0
    )
    total_operating_expenses = fixed_expenses + variable_expenses
    monthly_debt_payments = sum(float(d["monthly_payment"]) for d in debts)
    total_remaining_debt = sum(float(d["total_remaining"]) for d in debts)

    total_outflow = total_operating_expenses + monthly_debt_payments
    net_monthly_savings_capacity = total_income - total_outflow
    savings_rate_pct = (
        (net_monthly_savings_capacity / total_income) * 100.0 if total_income > 0 else 0.0
    )

    # Kategori bazlı harcama ve limit aşımı analizi
    category_spending: Dict[str, float] = {}
    for t in transactions:
        if t["tx_type"] == "EXPENSE":
            cat = t["category"]
            category_spending[cat] = category_spending.get(cat, 0.0) + float(t["amount"])

    budget_vs_actual: List[Dict[str, Any]] = []
    over_budget_alerts: List[str] = []

    for cat, spent in sorted(category_spending.items(), key=lambda x: x[1], reverse=True):
        limit_val = limits_map.get(cat)
        share_of_expenses_pct = (spent / total_outflow) * 100.0 if total_outflow > 0 else 0.0
        is_exceeded = bool(limit_val is not None and spent > limit_val)
        exceeded_by = round(spent - limit_val, 2) if (limit_val is not None and spent > limit_val) else 0.0

        if is_exceeded:
            over_budget_alerts.append(
                f"'{cat}' kategorisinde aylık bütçe limiti ({limit_val:,.2f} TL), "
                f"{exceeded_by:,.2f} TL aşılarak {spent:,.2f} TL olarak gerçekleşmiştir."
            )

        budget_vs_actual.append(
            {
                "category": cat,
                "spent_tl": round(spent, 2),
                "monthly_limit_tl": round(limit_val, 2) if limit_val is not None else None,
                "share_of_total_outflow_pct": round(share_of_expenses_pct, 2),
                "is_limit_exceeded": is_exceeded,
                "exceeded_amount_tl": exceeded_by,
            }
        )

    # Acil Durum Rezervi Analizi
    # Birincil acil durum hedefindeki mevcut birikimi veya toplam mevcut birikimi baz al
    primary_emergency_reserve_tl = (
        float(goals[0]["current_saved"])
        if goals
        else sum(float(g["current_saved"]) for g in goals)
    )
    total_saved_across_goals_tl = sum(float(g["current_saved"]) for g in goals)
    mandatory_monthly_burden_tl = fixed_expenses + monthly_debt_payments

    if mandatory_monthly_burden_tl > 0:
        emergency_months_covered = primary_emergency_reserve_tl / mandatory_monthly_burden_tl
    else:
        emergency_months_covered = 0.0

    if emergency_months_covered < 3.0:
        reserve_status = "KRİTİK / YETERSİZ (3 Ayın Altında)"
    elif emergency_months_covered <= 6.0:
        reserve_status = "YETERLİ / DENGELİ (3 - 6 Ay Aralığında)"
    else:
        reserve_status = "GÜÇLÜ (6 Ayın Üzerinde)"

    return {
        "data_origin": "KULLANICI_BUTCE_VERISI",
        "month_period": month_prefix,
        "cashflow_summary": {
            "total_income_tl": round(total_income, 2),
            "fixed_mandatory_expenses_tl": round(fixed_expenses, 2),
            "variable_discretionary_expenses_tl": round(variable_expenses, 2),
            "total_operating_expenses_tl": round(total_operating_expenses, 2),
            "monthly_debt_payments_tl": round(monthly_debt_payments, 2),
            "total_monthly_outflow_tl": round(total_outflow, 2),
            "net_monthly_savings_capacity_tl": round(net_monthly_savings_capacity, 2),
            "savings_rate_pct": round(savings_rate_pct, 2),
        },
        "emergency_reserve_analysis": {
            "current_emergency_reserve_tl": round(primary_emergency_reserve_tl, 2),
            "total_saved_all_goals_tl": round(total_saved_across_goals_tl, 2),
            "mandatory_monthly_burden_tl": round(mandatory_monthly_burden_tl, 2),
            "months_covered": round(emergency_months_covered, 2),
            "recommended_range_months": "3.0 - 6.0 ay",
            "target_3m_reserve_tl": round(mandatory_monthly_burden_tl * 3.0, 2),
            "target_6m_reserve_tl": round(mandatory_monthly_burden_tl * 6.0, 2),
            "status": reserve_status,
        },
        "budget_vs_actual": budget_vs_actual,
        "over_budget_alerts": over_budget_alerts,
        "savings_goals": goals,
        "debts": debts,
        "total_remaining_debt_tl": round(total_remaining_debt, 2),
        "transactions": transactions,
    }


def import_finance_csv(
    csv_file_path: Union[str, Path],
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Kullanıcının gelir/gider CSV dosyasını (tx_type, category, is_fixed, amount, tx_date, description)
    okuyarak finance_transactions tablosuna kaydeder.
    """
    path = Path(csv_file_path)
    if not path.exists():
        raise FileNotFoundError(f"Bütçe CSV dosyası bulunamadı: {path}")

    df = pd.read_csv(path)
    required_cols = {"tx_type", "category", "amount", "tx_date"}
    if not required_cols.issubset(set(df.columns)):
        raise ValueError(f"CSV dosyasında zorunlu sütunlar eksik: {required_cols}")

    rows_to_insert: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        rows_to_insert.append(
            {
                "tx_type": str(row["tx_type"]).strip().upper(),
                "category": str(row["category"]).strip(),
                "is_fixed": int(row.get("is_fixed", 0)),
                "amount": float(row["amount"]),
                "tx_date": str(row["tx_date"]).strip(),
                "description": str(row.get("description", "")).strip(),
            }
        )

    with get_connection(db_path) as conn:
        conn.executemany(
            """
            INSERT INTO finance_transactions (tx_type, category, is_fixed, amount, tx_date, description)
            VALUES (:tx_type, :category, :is_fixed, :amount, :tx_date, :description);
            """,
            rows_to_insert,
        )
        conn.commit()

    return {
        "data_origin": "KULLANICI_CSV_AKTARIMI",
        "file": str(path),
        "imported_count": len(rows_to_insert),
    }
