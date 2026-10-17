"""
Modül H — Doğrulanabilir Finansal Bilgi ve Karar Asistanı
Dosya: backend/assistant_engine.py

Kurallar (PROJECT_RULES.md):
- Kural 1, 4 & 5: Asistan sayısal verileri ASLA tahmin etmez; doğrudan diğer motorları
  (evidence_engine, bulletin_engine, analytics_engine, basket_engine,
  personal_finance_engine, scenario_engine) çağırarak gerçek hesaplama sonuçlarını
  bağlama alır.
- Çıktı şeması zorunlu olarak şu 6 alanı içerir:
  1. answer_summary
  2. official_legal_evidence (Resmi Bilgi)
  3. verified_historical_metrics (Tarihsel Veri)
  4. personal_budget_and_scenarios (Kişisel Senaryo)
  5. ai_interpretation_vs_assumptions (Varsayım / Yorum Ayrımı)
  6. data_limitations_warning (Veri Sınırları ve Uyarılar)
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import requests

from evidence_engine import (
    get_all_evidence_cards,
    evaluate_fund_transparency,
)
from bulletin_engine import (
    list_bulletins,
    compare_fund_reports,
)
from analytics_engine import (
    analyze_fund_performance,
    compare_funds_normalized,
)
from personal_finance_engine import get_financial_health_report
from scenario_engine import (
    simulate_cashflow_change,
    simulate_goal_projection,
    simulate_portfolio_shock,
)

from database import get_connection


def _get_known_funds(db_path: Optional[Path] = None) -> List[str]:
    with get_connection(db_path) as conn:
        rows = conn.execute("SELECT fund_code FROM funds ORDER BY fund_code ASC;").fetchall()
    return [r["fund_code"] for r in rows] or ["AFT", "MAC", "TTA", "IPB", "TI1"]


def _detect_funds_in_query(
    query: str,
    context_fund_codes: Optional[List[str]] = None,
    db_path: Optional[Path] = None,
) -> List[str]:
    """Kullanıcı sorusu içinde geçen veya bağlamda verilen fon kodlarını tespit eder."""
    known = set(_get_known_funds(db_path))
    found: List[str] = []
    if context_fund_codes:
        for c in context_fund_codes:
            cu = c.strip().upper()
            if cu in known and cu not in found:
                found.append(cu)

    q_upper = query.upper()
    for code in sorted(known):
        if re.search(rf"\b{code}\b", q_upper) and code not in found:
            found.append(code)
    return found


def ask_financial_assistant(
    user_query: str,
    context_fund_codes: Optional[List[str]] = None,
    start_date: str = "2026-01-03",
    end_date: str = "2026-10-16",
    month_prefix: str = "2026-10",
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Doğrulanabilir Finansal Bilgi ve Karar Asistanı:
    Kullanıcının sorusunu analiz eder, ilgili motorları (Modül A..G) gerçek verilerle
    çalıştırır ve kesin veriler ile varsayım/yorumları birbirinden ayıran 6 bölümlü
    yapısal yanıt üretir.
    """
    q_lower = user_query.lower()
    detected_funds = _detect_funds_in_query(user_query, context_fund_codes)

    official_legal_evidence: List[Dict[str, Any]] = []
    verified_historical_metrics: Dict[str, Any] = {}
    personal_budget_and_scenarios: Dict[str, Any] = {}
    summary_parts: List[str] = []

    all_cards = get_all_evidence_cards(db_path=db_path)

    # 1. Hukuki Güven / Haklar / Varlık Ayrılığı / Saklama Soruları (Tip 1)
    if any(
        kw in q_lower
        for kw in (
            "güven", "batar", "iflas", "haciz", "hak", "saklama", "takasbank",
            "spk", "nasıl çalışır", "malvarlığı", "varlık ayrılığı", "yanlış",
        )
    ):
        matched_cards = [
            c for c in all_cards if c["order_no"] in (1, 2, 3, 5, 6, 8, 15)
        ]
        for c in matched_cards[:3]:
            official_legal_evidence.append(
                {
                    "question": c["question"],
                    "claim_summary": c["claim_summary"],
                    "official_source": c["official_source"],
                    "regulation_ref": c["regulation_ref"],
                    "source_date": c["source_date"],
                    "user_meaning": c["user_meaning"],
                    "limitations_and_risks": c["limitations_and_risks"],
                }
            )
        summary_parts.append(
            "6362 sayılı Sermaye Piyasası Kanunu Madde 52 ve 53 uyarınca yatırım fonu malvarlığı, "
            "portföy yönetim şirketinin (PYŞ) ve saklayıcı kuruluşun malvarlığından tamamen ayrıdır; "
            "şirket iflas etse dahi fon varlıkları haczedilemez ve iflas masasına dahil edilemez. "
            "Varlıklar Takasbank/Portföy Saklayıcısı nezdinde saklanır ve katılma paylarınız MKK'da "
            "adınıza kaydi olarak izlenir."
        )

    # 2. Tekil veya Çoklu Fon Risk, Şeffaflık ve Performans Karşılaştırma Soruları (Tip 2 & Tip 3)
    if detected_funds or any(
        kw in q_lower for kw in ("performans", "getiri", "risk", "volatilite", "drawdown", "karşılaştır", "fark")
    ):
        target_funds = detected_funds if detected_funds else ["AFT", "TTA", "TI1"]

        if len(target_funds) >= 2:
            comp = compare_funds_normalized(
                fund_codes=target_funds,
                requested_start_date=start_date,
                requested_end_date=end_date,
                db_path=db_path,
            )
            verified_historical_metrics["comparison_summary"] = {
                "period": f"{comp['actual_start_date']} -> {comp['actual_end_date']} ({comp['common_trading_days_count']} işlem günü)",
                "date_warning": comp["date_warning"],
                "funds": [
                    {
                        "fund_code": f["fund_code"],
                        "fund_title": f["fund_title"],
                        "start_price": f["start_price"],
                        "end_price": f["end_price"],
                        "return_pct": f["return_pct"],
                        "normalized_100_end": f["normalized_base_100_end"],
                        "max_drawdown_pct": f["max_drawdown_pct"],
                        "annualized_volatility_pct": f["annualized_volatility_pct"],
                    }
                    for f in comp["funds_summary"]
                ],
            }
            perf_clauses = [
                f"{f['fund_code']} getirisi %{f['return_pct']:+.2f} (100 bazlı bitiş: {f['normalized_base_100_end']:.2f}, "
                f"Max Drawdown: -%{f['max_drawdown_pct']:.2f}, Yıllık Volatilite: %{f['annualized_volatility_pct']:.2f})"
                for f in comp["funds_summary"]
            ]
            summary_parts.append(
                f"Gerçek TEFAS kayıtlarına göre ({comp['actual_start_date']} -> {comp['actual_end_date']}, "
                f"{comp['common_trading_days_count']} ortak işlem günü): " + "; ".join(perf_clauses) + "."
            )
        else:
            code = target_funds[0]
            perf = analyze_fund_performance(
                fund_code=code,
                requested_start_date=start_date,
                requested_end_date=end_date,
                db_path=db_path,
            )
            transp = evaluate_fund_transparency(fund_code=code, db_path=db_path)
            verified_historical_metrics["single_fund_performance"] = perf
            verified_historical_metrics["transparency_evaluation"] = transp
            summary_parts.append(
                f"[{code}] ({perf['fund_title']}) fonu {perf['actual_start_date']} -> {perf['actual_end_date']} "
                f"döneminde ({perf['trading_days_count']} işlem günü) %{perf['return_pct']:+.2f} brüt getiri, "
                f"-%{perf['max_drawdown_pct']:.2f} maksimum düşüş (Max Drawdown) ve "
                f"%{perf['annualized_volatility_pct']:.2f} yıllıklandırılmış volatilite kaydetmiştir. "
                f"SPK Risk Değeri: {transp['structural_checklist']['risk_value_scale_1_7']}, "
                f"Alım/Satım Valörü: {transp['structural_checklist']['valor_buy']} / {transp['structural_checklist']['valor_sell']}."
            )

        # Risk ile ilgili kanıt kartını da ekle
        risk_card = next((c for c in all_cards if c["order_no"] == 10), None)
        if risk_card and not official_legal_evidence:
            official_legal_evidence.append(
                {
                    "question": risk_card["question"],
                    "claim_summary": risk_card["claim_summary"],
                    "official_source": risk_card["official_source"],
                    "regulation_ref": risk_card["regulation_ref"],
                    "source_date": risk_card["source_date"],
                    "user_meaning": risk_card["user_meaning"],
                    "limitations_and_risks": risk_card["limitations_and_risks"],
                }
            )

    # 3. Bülten ve Dönem Raporu Soruları (Tip 4)
    if any(kw in q_lower for kw in ("bülten", "rapor", "duyuru", "izahname", "bu ay", "dönem")):
        b_fund = detected_funds[0] if detected_funds else "AFT"
        bulletins = list_bulletins(fund_code=b_fund, db_path=db_path)
        period_cmp = compare_fund_reports(b_fund, "2026-07", "2026-10", db_path=db_path)
        verified_historical_metrics["bulletin_highlights"] = {
            "latest_bulletin_title": bulletins[0]["title"] if bulletins else None,
            "latest_bulletin_summary": bulletins[0]["ai_summary"] if bulletins else None,
            "period_comparison_2026_07_vs_2026_10": period_cmp,
        }
        mc = period_cmp["metrics_comparison"]
        summary_parts.append(
            f"[{b_fund}] bülten ve dönem karşılaştırmasına göre (2026-07-31 -> 2026-10-16): "
            f"Birim pay fiyatı %{mc['unit_price']['change_pct']:+.2f} değişimle "
            f"{mc['unit_price']['new_price_tl']:.6f} TL'ye, portföy büyüklüğü "
            f"%{mc['portfolio_size_tl']['change_pct']:+.2f} değişimle "
            f"{mc['portfolio_size_tl']['new_total_value_tl']:,.2f} TL'ye, yatırımcı sayısı ise "
            f"{mc['investor_count']['diff_persons']:+,} kişi (%{mc['investor_count']['change_pct']:+.2f}) "
            f"değişimle {mc['investor_count']['new_investor_count']:,} kişiye ulaşmıştır."
        )

    # 4. Kişisel Bütçe, Giderler ve Senaryo / Tasarruf Soruları (Tip 5 & Tip 6)
    if any(
        kw in q_lower
        for kw in (
            "bütçe", "gider", "harcama", "tasarruf", "birikim", "hedef",
            "senaryo", "acil durum", "rezerv", "maaş", "gelir", "stres",
        )
    ):
        fin_report = get_financial_health_report(month_prefix=month_prefix, db_path=db_path)
        cf = fin_report["cashflow_summary"]
        er = fin_report["emergency_reserve_analysis"]
        top_expenses = fin_report["budget_vs_actual"][:3]

        goal_proj = simulate_goal_projection(month_prefix=month_prefix, db_path=db_path)
        expense_cut_sim = simulate_cashflow_change(
            income_change_pct=0.0, expense_change_pct=-10.0, month_prefix=month_prefix, db_path=db_path
        )
        stress_sim = simulate_portfolio_shock(month_prefix=month_prefix, db_path=db_path)

        personal_budget_and_scenarios = {
            "cashflow_summary": cf,
            "emergency_reserve_analysis": er,
            "top_expense_categories": top_expenses,
            "over_budget_alerts": fin_report["over_budget_alerts"],
            "scenario_expense_reduction_10pct": expense_cut_sim,
            "scenario_goal_projection": {
                "assumption_parameters": goal_proj["assumption_parameters"],
                "months_to_reach_goal": goal_proj["months_to_reach_goal"],
            },
            "scenario_portfolio_stress_test": {
                "historical_max_drawdown_pct": stress_sim["historical_max_drawdown_pct"],
                "stress_test_table": stress_sim["stress_test_table"],
            },
        }

        top_exp_str = ", ".join(
            f"{e['category']} ({e['spent_tl']:,.2f} TL - Toplam çıkışın %{e['share_of_total_outflow_pct']:.1f}'i)"
            for e in top_expenses
        )
        m_goal = goal_proj["months_to_reach_goal"]
        summary_parts.append(
            f"Kişisel bütçe analizine göre ({month_prefix}): Aylık toplam geliriniz {cf['total_income_tl']:,.2f} TL, "
            f"toplam gider ve borç ödemeniz {cf['total_monthly_outflow_tl']:,.2f} TL, aylık net yatırım/tasarruf "
            f"kapasiteniz {cf['net_monthly_savings_capacity_tl']:,.2f} TL (Tasarruf Oranı: %{cf['savings_rate_pct']:.2f}). "
            f"Birikiminizi en çok etkileyen ilk 3 gider kalemi: {top_exp_str}. "
            f"Bütçe aşımı uyarısı: {' '.join(fin_report['over_budget_alerts']) if fin_report['over_budget_alerts'] else 'Yok'}. "
            f"250.000 TL birikim hedefinize mevcut {cf['net_monthly_savings_capacity_tl']:,.2f} TL/ay katkıyla; "
            f"%0 getiriyle {m_goal['zero_return_months']} ayda, %15 kötümser getiriyle {m_goal['pessimistic_months']} ayda, "
            f"%30 baz getiriyle {m_goal['base_expected_months']} ayda, %45 iyimser getiriyle {m_goal['optimistic_months']} ayda ulaşılmaktadır."
        )

    # Eğer çok genel bir soru sorulduysa temel kanıt + bütçe özetini birleştir
    if not summary_parts:
        card_1 = all_cards[0]
        official_legal_evidence.append(
            {
                "question": card_1["question"],
                "claim_summary": card_1["claim_summary"],
                "official_source": card_1["official_source"],
                "regulation_ref": card_1["regulation_ref"],
                "source_date": card_1["source_date"],
                "user_meaning": card_1["user_meaning"],
                "limitations_and_risks": card_1["limitations_and_risks"],
            }
        )
        summary_parts.append(card_1["claim_summary"] + " " + card_1["user_meaning"])

    final_summary = " ".join(summary_parts)

    # Ortamda GEMINI_API_KEY varsa doğrulanmış motor verilerini Gemini ile sentezle (temperature=0)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key:
        try:
            context_json = json.dumps(
                {
                    "official_legal_evidence": official_legal_evidence,
                    "verified_historical_metrics": verified_historical_metrics,
                    "personal_budget_and_scenarios": personal_budget_and_scenarios,
                },
                ensure_ascii=False,
            )
            prompt = (
                "Sen doğrulanabilir finansal karar asistanısın. Aşağıdaki doğrulanmış motor verilerini "
                "kullanarak kullanıcının sorusunu Türkçe, net ve kanıt odaklı olarak yanıtla. "
                "Asla bağlamda olmayan bir sayı uydurma.\n"
                f"Kullanıcı Sorusu: {user_query}\n"
                f"Doğrulanmış Motor Verileri: {context_json}"
            )
            resp = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.0},
                },
                timeout=15,
            )
            if resp.status_code == 200:
                cands = resp.json().get("candidates", [])
                if cands:
                    final_summary = cands[0]["content"]["parts"][0]["text"].strip()
        except Exception:
            pass

    return {
        "user_query": user_query,
        "detected_fund_codes": detected_funds,
        "answer_summary": final_summary,
        "official_legal_evidence": official_legal_evidence,
        "verified_historical_metrics": verified_historical_metrics,
        "personal_budget_and_scenarios": personal_budget_and_scenarios,
        "ai_interpretation_vs_assumptions": {
            "verified_data_note": (
                "official_legal_evidence bölümündeki bilgiler 6362 sayılı SPKn ve SPK Tebliğlerine; "
                "verified_historical_metrics bölümündeki tüm fiyat, getiri, volatilite, Max Drawdown, "
                "portföy büyüklüğü ve yatırımcı sayısı verileri ise SQLite veritabanındaki gerçek "
                "TEFAS kayıtlarına dayanmaktadır."
            ),
            "assumptions_and_commentary_note": (
                "personal_budget_and_scenarios içindeki projeksiyonlar (Kötümser %15, Baz %30, İyimser %45) "
                "ve gelir/gider değişim simülasyonları birer varsayımdır; bültenlerdeki yönetici "
                "beklentileri ise kurum görüşü olup kesinleşmiş resmi veri değildir."
            ),
        },
        "data_limitations_warning": (
            "Geçmiş dönem TEFAS getirileri gelecekteki performansı garanti etmez. Tüm fon getiri "
            "hesaplamaları TEFAS günlük brüt fiyatları üzerinden yapılmış olup fon türüne göre "
            "uygulanan stopaj vergisi (GVK Geçici Md. 67), T+1/T+2/T+3 valör süreleri ve olası "
            "işlem komisyonları net getiriye dahil edilmemiştir."
        ),
    }
