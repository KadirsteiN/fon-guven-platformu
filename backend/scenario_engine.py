"""
Modül F — Finansal Senaryo ve Stres Testi Simülatörü
Dosya: backend/scenario_engine.py

Kurallar (PROJECT_RULES.md):
- Kural 2 (Örnek/Simülasyon Ayrımı): Tüm senaryo çıktılarında is_assumption=True ve
  scenario_badge='VARSAYIM VE SENARYO SİMÜLASYONU (Garanti Edilen Getiri Değildir)'
  etiketleri zorunludur.
- Kural 5 (Hesaplama Şeffaflığı): Kişisel bütçe (Modül E) ve sanal fon sepeti (Modül D)
  verileri birleştirilerek 6 senaryonun tamamı doğrulanabilir Python fonksiyonlarıyla
  hesaplanır.
"""

import math
from pathlib import Path
from typing import Dict, Any, List, Optional

from database import get_connection
from personal_finance_engine import get_financial_health_report
from basket_engine import load_basket, simulate_virtual_basket

SCENARIO_BADGE = "VARSAYIM VE SENARYO SİMÜLASYONU (Garanti Edilen Getiri Değildir)"


def _months_to_reach_target(
    current_saved: float,
    target_amount: float,
    monthly_contribution: float,
    annual_return_pct: float = 0.0,
    max_months: int = 240,
) -> Optional[int]:
    """
    Mevcut birikim, aylık düzenli katkı ve yıllık bileşik getiri varsayımı altında
    hedefe kaç ayda ulaşıldığını hesaplar. Ulaşılamıyorsa None döndürür.
    """
    if current_saved >= target_amount:
        return 0
    monthly_rate = (annual_return_pct / 100.0) / 12.0
    balance = current_saved
    for m in range(1, max_months + 1):
        balance = balance * (1.0 + monthly_rate) + monthly_contribution
        if balance >= target_amount:
            return m
    return None


def simulate_cashflow_change(
    income_change_pct: float = 10.0,
    expense_change_pct: float = 0.0,
    goal_id: int = 1,
    month_prefix: str = "2026-10",
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Senaryo 1 & 2 — Gelir ve Gider Değişimi Etkisi:
    Gelir %X değişirse ve/veya giderler %Y değişirse aylık birikim kapasitesinin
    nasıl değiştiğini ve seçilen birikim hedefine ulaşma süresinin kaç ay kısaldığını
    veya geciktiğini hesaplar.
    """
    report = get_financial_health_report(month_prefix=month_prefix, db_path=db_path)
    cf = report["cashflow_summary"]
    goals = report["savings_goals"]

    target_goal = next((g for g in goals if int(g["id"]) == goal_id), goals[0] if goals else None)
    if not target_goal:
        raise ValueError("Kişisel bütçede tanımlı birikim hedefi bulunamadı.")

    base_income = cf["total_income_tl"]
    base_expenses = cf["total_operating_expenses_tl"]
    debt_payments = cf["monthly_debt_payments_tl"]
    base_savings = cf["net_monthly_savings_capacity_tl"]

    new_income = base_income * (1.0 + income_change_pct / 100.0)
    new_expenses = base_expenses * (1.0 + expense_change_pct / 100.0)
    new_outflow = new_expenses + debt_payments
    new_savings = new_income - new_outflow
    new_savings_rate_pct = (new_savings / new_income) * 100.0 if new_income > 0 else 0.0

    remaining_to_goal = max(0.0, float(target_goal["target_amount"]) - float(target_goal["current_saved"]))

    base_months = (
        math.ceil(remaining_to_goal / base_savings) if base_savings > 0 else None
    )
    new_months = (
        math.ceil(remaining_to_goal / new_savings) if new_savings > 0 else None
    )

    months_diff = (
        (new_months - base_months)
        if (base_months is not None and new_months is not None)
        else None
    )

    return {
        "scenario_type": "CASHFLOW_CHANGE (Senaryo 1 & 2: Gelir ve Gider Değişimi Etkisi)",
        "is_assumption": True,
        "scenario_badge": SCENARIO_BADGE,
        "assumption_parameters": {
            "income_change_pct": income_change_pct,
            "expense_change_pct": expense_change_pct,
            "reference_month": month_prefix,
            "target_goal_name": target_goal["goal_name"],
        },
        "baseline": {
            "monthly_income_tl": round(base_income, 2),
            "monthly_operating_expenses_tl": round(base_expenses, 2),
            "monthly_debt_payments_tl": round(debt_payments, 2),
            "net_monthly_savings_tl": round(base_savings, 2),
            "savings_rate_pct": cf["savings_rate_pct"],
            "months_to_goal_zero_return": base_months,
        },
        "simulated": {
            "monthly_income_tl": round(new_income, 2),
            "monthly_operating_expenses_tl": round(new_expenses, 2),
            "monthly_debt_payments_tl": round(debt_payments, 2),
            "net_monthly_savings_tl": round(new_savings, 2),
            "monthly_savings_diff_tl": round(new_savings - base_savings, 2),
            "savings_rate_pct": round(new_savings_rate_pct, 2),
            "months_to_goal_zero_return": new_months,
            "months_difference": months_diff,
        },
        "interpretation": (
            f"Gelir %{income_change_pct:+.1f} ve giderler %{expense_change_pct:+.1f} değiştiğinde "
            f"aylık net birikim kapasitesi {base_savings:,.2f} TL'den {new_savings:,.2f} TL'ye "
            f"({new_savings - base_savings:+,.2f} TL/ay) değişmektedir. "
            f"'{target_goal['goal_name']}' hedefine ({target_goal['target_amount']:,.2f} TL) ulaşma süresi "
            f"{base_months} aydan {new_months} aya ({months_diff:+d} ay) gelmektedir."
            if (base_months is not None and new_months is not None and months_diff is not None)
            else "Yeni nakit akışı senaryosunda aylık tasarruf kapasitesi negatife düştüğü için hedefe ulaşılamamaktadır."
        ),
    }


def simulate_goal_projection(
    goal_id: int = 1,
    monthly_contribution_tl: Optional[float] = None,
    pessimistic_annual_rate_pct: float = 15.0,
    base_annual_rate_pct: float = 30.0,
    optimistic_annual_rate_pct: float = 45.0,
    projection_months: int = 24,
    month_prefix: str = "2026-10",
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Senaryo 3 & 6 — Düzenli Aylık Katkı ve 3 Alternatif Getiri Projeksiyonu:
    Mevcut birikim + aylık düzenli yatırım katkısı ile Kötümser, Baz/Beklenen ve İyimser
    getiri varsayımları altında hedefin kaçıncı ayda tamamlandığını ve aylık birikim
    büyüme serisini hesaplar.
    """
    report = get_financial_health_report(month_prefix=month_prefix, db_path=db_path)
    goals = report["savings_goals"]
    target_goal = next((g for g in goals if int(g["id"]) == goal_id), goals[0] if goals else None)
    if not target_goal:
        raise ValueError("Kişisel bütçede tanımlı birikim hedefi bulunamadı.")

    monthly_contrib = (
        float(monthly_contribution_tl)
        if monthly_contribution_tl is not None
        else float(report["cashflow_summary"]["net_monthly_savings_capacity_tl"])
    )
    current_saved = float(target_goal["current_saved"])
    target_amount = float(target_goal["target_amount"])

    months_no_return = _months_to_reach_target(current_saved, target_amount, monthly_contrib, 0.0)
    months_pessimistic = _months_to_reach_target(
        current_saved, target_amount, monthly_contrib, pessimistic_annual_rate_pct
    )
    months_base = _months_to_reach_target(
        current_saved, target_amount, monthly_contrib, base_annual_rate_pct
    )
    months_optimistic = _months_to_reach_target(
        current_saved, target_amount, monthly_contrib, optimistic_annual_rate_pct
    )

    # Grafik için aylık büyüme serisi
    r_pess = (pessimistic_annual_rate_pct / 100.0) / 12.0
    r_base = (base_annual_rate_pct / 100.0) / 12.0
    r_opt = (optimistic_annual_rate_pct / 100.0) / 12.0

    bal_zero = current_saved
    bal_pess = current_saved
    bal_base = current_saved
    bal_opt = current_saved

    monthly_series: List[Dict[str, Any]] = [
        {
            "month_index": 0,
            "principal_only_tl": round(bal_zero, 2),
            "pessimistic_tl": round(bal_pess, 2),
            "base_expected_tl": round(bal_base, 2),
            "optimistic_tl": round(bal_opt, 2),
            "target_amount_tl": round(target_amount, 2),
        }
    ]

    for m in range(1, projection_months + 1):
        bal_zero = bal_zero + monthly_contrib
        bal_pess = bal_pess * (1.0 + r_pess) + monthly_contrib
        bal_base = bal_base * (1.0 + r_base) + monthly_contrib
        bal_opt = bal_opt * (1.0 + r_opt) + monthly_contrib
        monthly_series.append(
            {
                "month_index": m,
                "principal_only_tl": round(bal_zero, 2),
                "pessimistic_tl": round(bal_pess, 2),
                "base_expected_tl": round(bal_base, 2),
                "optimistic_tl": round(bal_opt, 2),
                "target_amount_tl": round(target_amount, 2),
            }
        )

    return {
        "scenario_type": "GOAL_PROJECTION (Senaryo 3 & 6: Düzenli Aylık Katkı ve Alternatif Getiri Projeksiyonu)",
        "is_assumption": True,
        "scenario_badge": SCENARIO_BADGE,
        "assumption_parameters": {
            "goal_name": target_goal["goal_name"],
            "current_saved_tl": round(current_saved, 2),
            "target_amount_tl": round(target_amount, 2),
            "monthly_contribution_tl": round(monthly_contrib, 2),
            "pessimistic_annual_rate_pct": pessimistic_annual_rate_pct,
            "base_annual_rate_pct": base_annual_rate_pct,
            "optimistic_annual_rate_pct": optimistic_annual_rate_pct,
            "projection_months": projection_months,
        },
        "months_to_reach_goal": {
            "zero_return_months": months_no_return,
            "pessimistic_months": months_pessimistic,
            "base_expected_months": months_base,
            "optimistic_months": months_optimistic,
        },
        "end_of_projection_balances_tl": monthly_series[-1],
        "monthly_projection_series": monthly_series,
    }


def simulate_unexpected_expense(
    shock_expense_tl: float = 35000.0,
    shock_description: str = "Beklenmedik Sağlık / Ev Tadilatı Harcaması",
    month_prefix: str = "2026-10",
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Senaryo 4 — Beklenmedik Gider Şok Testi:
    Beklenmedik tek seferlik bir giderin (örn: 35.000 TL) acil durum nakit rezervini
    kaç aya düşürdüğünü ve yeniden eski rezerv seviyesine dönmenin kaç ay süreceğini hesaplar.
    """
    report = get_financial_health_report(month_prefix=month_prefix, db_path=db_path)
    er = report["emergency_reserve_analysis"]
    cf = report["cashflow_summary"]

    pre_reserve = er["current_emergency_reserve_tl"]
    mandatory_burden = er["mandatory_monthly_burden_tl"]
    monthly_savings = cf["net_monthly_savings_capacity_tl"]

    post_reserve = max(0.0, pre_reserve - shock_expense_tl)
    uncovered_deficit = max(0.0, shock_expense_tl - pre_reserve)

    pre_months = er["months_covered"]
    post_months = (post_reserve / mandatory_burden) if mandatory_burden > 0 else 0.0

    recovery_months = (
        round(shock_expense_tl / monthly_savings, 1) if monthly_savings > 0 else None
    )

    if post_months < 1.5:
        post_status = "ACİL ALARM (1.5 Ayın Altına Düştü)"
    elif post_months < 3.0:
        post_status = "UYARI: Önerilen 3 Aylık Sınırın Altına Geriledi"
    else:
        post_status = "GÜVENLİ: Şoka Rağmen 3 Aylık Zorunlu Gider Karşılanıyor"

    return {
        "scenario_type": "UNEXPECTED_EXPENSE_SHOCK (Senaryo 4: Beklenmedik Gider Şok Testi)",
        "is_assumption": True,
        "scenario_badge": SCENARIO_BADGE,
        "assumption_parameters": {
            "shock_expense_tl": round(shock_expense_tl, 2),
            "shock_description": shock_description,
            "mandatory_monthly_burden_tl": round(mandatory_burden, 2),
        },
        "pre_shock": {
            "emergency_reserve_tl": round(pre_reserve, 2),
            "months_covered": round(pre_months, 2),
            "status": er["status"],
        },
        "post_shock": {
            "emergency_reserve_tl": round(post_reserve, 2),
            "uncovered_cash_deficit_tl": round(uncovered_deficit, 2),
            "months_covered": round(post_months, 2),
            "months_lost": round(pre_months - post_months, 2),
            "status": post_status,
            "months_to_replenish_from_savings": recovery_months,
        },
    }


def simulate_portfolio_shock(
    basket_id: Optional[int] = None,
    custom_shocks_pct: Optional[List[float]] = None,
    month_prefix: str = "2026-10",
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Senaryo 5 — Yatırım Sepeti Değer Kaybı (Stres Testi):
    Kullanıcının Sanal Yatırım Sepetinin belirli oranlarda (-%10, -%20, -%30) ve
    o sepetin gerçek tarihsel Maksimum Düşüşü (Max Drawdown %) oranında değer
    kaybetmesi durumunda sepet değerinin, toplam net varlığın ve hedefe ulaşma
    süresinin nasıl etkilendiğini hesaplar.
    """
    if custom_shocks_pct is None:
        custom_shocks_pct = [-10.0, -20.0, -30.0]

    report = get_financial_health_report(month_prefix=month_prefix, db_path=db_path)
    cf = report["cashflow_summary"]
    goals = report["savings_goals"]
    primary_goal = goals[0] if goals else None

    # Kayıtlı sepeti bul veya varsayılan sepeti yükle
    with get_connection(db_path) as conn:
        if basket_id is None:
            b_row = conn.execute(
                "SELECT id FROM virtual_baskets ORDER BY id DESC LIMIT 1;"
            ).fetchone()
            basket_id = int(b_row["id"]) if b_row else None

    if basket_id is not None:
        loaded = load_basket(basket_id=basket_id, run_simulation=True, db_path=db_path)
        basket_name = loaded["basket_name"]
        sim = loaded["simulation"]
    else:
        basket_name = "Varsayılan 40.000 TL Dengeli Sepet"
        sim = simulate_virtual_basket(
            allocations=[
                {"fund_code": "AFT", "amount_tl": 10000.0},
                {"fund_code": "TTA", "amount_tl": 12000.0},
                {"fund_code": "TI1", "amount_tl": 10000.0},
                {"fund_code": "MAC", "amount_tl": 8000.0},
            ],
            start_date="2026-01-03",
            end_date="2026-10-16",
            db_path=db_path,
        )

    current_portfolio_value = float(sim["total_final_value_tl"])
    historical_max_dd_pct = -abs(float(sim["basket_max_drawdown_pct"]))
    other_liquid_savings = float(report["emergency_reserve_analysis"]["current_emergency_reserve_tl"])
    total_pre_shock_wealth = current_portfolio_value + other_liquid_savings
    monthly_savings = float(cf["net_monthly_savings_capacity_tl"])
    target_amount = float(primary_goal["target_amount"]) if primary_goal else 250000.0

    all_shocks = [
        {"label": f"Tarihsel Gerçek Max Drawdown ({historical_max_dd_pct:.2f}%)", "shock_pct": historical_max_dd_pct},
    ] + [
        {"label": f"Varsayımsal Piyasa Şoku ({s:.0f}%)", "shock_pct": float(s)}
        for s in custom_shocks_pct
    ]

    stress_results: List[Dict[str, Any]] = []
    base_months_to_target = _months_to_reach_target(
        total_pre_shock_wealth, target_amount, monthly_savings, 0.0
    )

    for item in all_shocks:
        s_pct = item["shock_pct"]
        loss_tl = current_portfolio_value * (abs(s_pct) / 100.0)
        shocked_portfolio_tl = current_portfolio_value - loss_tl
        shocked_total_wealth_tl = shocked_portfolio_tl + other_liquid_savings
        shocked_months_to_target = _months_to_reach_target(
            shocked_total_wealth_tl, target_amount, monthly_savings, 0.0
        )
        delay_months = (
            (shocked_months_to_target - base_months_to_target)
            if (shocked_months_to_target is not None and base_months_to_target is not None)
            else None
        )

        stress_results.append(
            {
                "scenario_label": item["label"],
                "shock_pct": round(s_pct, 2),
                "portfolio_value_before_tl": round(current_portfolio_value, 2),
                "portfolio_loss_tl": round(-loss_tl, 2),
                "portfolio_value_after_tl": round(shocked_portfolio_tl, 2),
                "total_wealth_after_tl": round(shocked_total_wealth_tl, 2),
                "months_to_goal_after_shock": shocked_months_to_target,
                "goal_delay_months": delay_months,
            }
        )

    return {
        "scenario_type": "PORTFOLIO_STRESS_TEST (Senaryo 5: Yatırım Sepeti Değer Kaybı Stres Testi)",
        "is_assumption": True,
        "scenario_badge": SCENARIO_BADGE,
        "basket_name": basket_name,
        "current_portfolio_value_tl": round(current_portfolio_value, 2),
        "other_liquid_savings_tl": round(other_liquid_savings, 2),
        "total_pre_shock_wealth_tl": round(total_pre_shock_wealth, 2),
        "historical_max_drawdown_pct": round(historical_max_dd_pct, 2),
        "baseline_months_to_goal": base_months_to_target,
        "stress_test_table": stress_results,
    }


def run_scenario_simulation(
    scenario_type: str = "ALL",
    params: Optional[Dict[str, Any]] = None,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    FastAPI uç noktası için tekil veya birleşik senaryo çalıştırıcı.
    scenario_type: 'CASHFLOW', 'GOAL_PROJECTION', 'UNEXPECTED_EXPENSE', 'PORTFOLIO_SHOCK' veya 'ALL'.
    """
    p = params or {}
    s_type = scenario_type.strip().upper()

    if s_type == "CASHFLOW":
        return simulate_cashflow_change(
            income_change_pct=float(p.get("income_change_pct", 15.0)),
            expense_change_pct=float(p.get("expense_change_pct", -10.0)),
            goal_id=int(p.get("goal_id", 1)),
            month_prefix=str(p.get("month_prefix", "2026-10")),
            db_path=db_path,
        )
    if s_type == "GOAL_PROJECTION":
        return simulate_goal_projection(
            goal_id=int(p.get("goal_id", 1)),
            monthly_contribution_tl=p.get("monthly_contribution_tl"),
            pessimistic_annual_rate_pct=float(p.get("pessimistic_annual_rate_pct", 15.0)),
            base_annual_rate_pct=float(p.get("base_annual_rate_pct", 30.0)),
            optimistic_annual_rate_pct=float(p.get("optimistic_annual_rate_pct", 45.0)),
            projection_months=int(p.get("projection_months", 24)),
            month_prefix=str(p.get("month_prefix", "2026-10")),
            db_path=db_path,
        )
    if s_type == "UNEXPECTED_EXPENSE":
        return simulate_unexpected_expense(
            shock_expense_tl=float(p.get("shock_expense_tl", 35000.0)),
            shock_description=str(p.get("shock_description", "Beklenmedik Sağlık / Tadilat Gideri")),
            month_prefix=str(p.get("month_prefix", "2026-10")),
            db_path=db_path,
        )
    if s_type == "PORTFOLIO_SHOCK":
        return simulate_portfolio_shock(
            basket_id=p.get("basket_id"),
            custom_shocks_pct=p.get("custom_shocks_pct"),
            month_prefix=str(p.get("month_prefix", "2026-10")),
            db_path=db_path,
        )

    # Varsayılan: Tüm 6 senaryoyu kapsayan tam paket
    return {
        "is_assumption": True,
        "scenario_badge": SCENARIO_BADGE,
        "cashflow_income_increase_scenario": simulate_cashflow_change(
            income_change_pct=15.0, expense_change_pct=0.0, db_path=db_path
        ),
        "cashflow_expense_increase_scenario": simulate_cashflow_change(
            income_change_pct=0.0, expense_change_pct=20.0, db_path=db_path
        ),
        "goal_projection_3_scenarios": simulate_goal_projection(db_path=db_path),
        "unexpected_expense_shock": simulate_unexpected_expense(
            shock_expense_tl=35000.0, db_path=db_path
        ),
        "portfolio_stress_test": simulate_portfolio_shock(db_path=db_path),
    }
