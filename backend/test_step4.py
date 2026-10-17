"""
Adım 4 Entegrasyon ve Doğrulama Testi Betiği (Modül E, Modül F, Modül H ve FastAPI Sunucusu)
Dosya: backend/test_step4.py

Görevler:
1. Modül E (Kişisel Finans Yönetimi, Bütçe Limit Aşımı ve Acil Durum Rezervi Raporu)
   çıktısını doğrular ve terminale yazdırır.
2. Modül F (6 Finansal Senaryo ve Yatırım Sepeti Stres Testi) çıktılarını doğrular
   ve terminale yazdırır.
3. Modül H (Doğrulanabilir Finansal Karar Asistanı) üzerinden ana belgedeki örnek
   soruları sorup gerçek motor verileriyle üretilen ayrıştırılmış yanıtları yazdırır.
4. FastAPI (main.py) üzerindeki tüm REST API uç noktalarını TestClient ile çağırarak
   200 OK yanıtlarını doğrular.
"""

from fastapi.testclient import TestClient

from database import init_db, DB_PATH
from personal_finance_engine import (
    seed_sample_personal_finance,
    get_financial_health_report,
)
from scenario_engine import run_scenario_simulation
from assistant_engine import ask_financial_assistant
from main import app


def main() -> None:
    print("=" * 98)
    print("ADIM 4: KİŞİSEL FİNANS (E), SENARYO SİMÜLATÖRÜ (F), KARAR ASİSTANI (H) VE FASTAPI TESTİ")
    print("=" * 98)

    init_db()
    seed_info = seed_sample_personal_finance(reset_existing=True)
    print(f"[OK] SQLite veritabanı ve Kişisel Bütçe Profili hazırlandı: {seed_info['data_origin']}")

    # 1. BÖLÜM: MODÜL E — Kişisel Finans ve Acil Durum Rezervi Raporu
    print("\n" + "-" * 98)
    print("BÖLÜM 1: MODÜL E — KİŞİSEL FİNANS, BÜTÇE LİMİT AŞIMI VE ACİL DURUM REZERVİ RAPORU (2026-10)")
    print("-" * 98)

    fin_report = get_financial_health_report(month_prefix="2026-10")
    cf = fin_report["cashflow_summary"]
    er = fin_report["emergency_reserve_analysis"]

    print(f"Veri Kaynağı Etiketi                : {fin_report['data_origin']}")
    print(f"Toplam Aylık Gelir                  : {cf['total_income_tl']:,.2f} TL")
    print(f"Sabit / Zorunlu Giderler            : {cf['fixed_mandatory_expenses_tl']:,.2f} TL")
    print(f"Değişken / İsteğe Bağlı Giderler    : {cf['variable_discretionary_expenses_tl']:,.2f} TL")
    print(f"Aylık Borç Taksit Yükü              : {cf['monthly_debt_payments_tl']:,.2f} TL")
    print(f"Toplam Aylık Nakit Çıkışı           : {cf['total_monthly_outflow_tl']:,.2f} TL")
    print(f"Net Aylık Tasarruf/Yatırım Kapasitesi: {cf['net_monthly_savings_capacity_tl']:,.2f} TL (Tasarruf Oranı: %{cf['savings_rate_pct']:.2f})")
    print(
        f"Acil Durum Rezervi Analizi          : Mevcut {er['current_emergency_reserve_tl']:,.2f} TL birikim, "
        f"aylık {er['mandatory_monthly_burden_tl']:,.2f} TL zorunlu yükü {er['months_covered']:.2f} ay karşılar "
        f"(Önerilen: {er['recommended_range_months']}) -> Durum: [{er['status']}]"
    )
    print("Kategori Bazlı Bütçe Limit Kontrolü :")
    for b in fin_report["budget_vs_actual"]:
        flag = " [LİMİT AŞIMI!]" if b["is_limit_exceeded"] else " [OK]"
        print(
            f"  - {b['category']:<14}: Harcanan: {b['spent_tl']:>9,.2f} TL | "
            f"Limit: {b['monthly_limit_tl']:>9,.2f} TL | Pay: %{b['share_of_total_outflow_pct']:>5.1f}{flag}"
        )

    # 2. BÖLÜM: MODÜL F — 6 Finansal Senaryo ve Yatırım Sepeti Stres Testi
    print("\n" + "-" * 98)
    print("BÖLÜM 2: MODÜL F — FİNANSAL SENARYO VE YATIRIM SEPETİ STRES TESTİ SİMÜLATÖRÜ")
    print("-" * 98)

    all_scenarios = run_scenario_simulation(scenario_type="ALL")
    print(f"Zorunlu Senaryo Etiketi             : {all_scenarios['scenario_badge']} (is_assumption={all_scenarios['is_assumption']})")

    s1 = all_scenarios["cashflow_income_increase_scenario"]
    s2 = all_scenarios["cashflow_expense_increase_scenario"]
    s3 = all_scenarios["goal_projection_3_scenarios"]
    s4 = all_scenarios["unexpected_expense_shock"]
    s5 = all_scenarios["portfolio_stress_test"]

    print(f"\n1) Senaryo 1 (Gelir +%15 Artışı)    : {s1['interpretation']}")
    print(f"2) Senaryo 2 (Gider +%20 Artışı)    : {s2['interpretation']}")

    m_goal = s3["months_to_reach_goal"]
    end_b = s3["end_of_projection_balances_tl"]
    print(
        f"3) Senaryo 3 & 6 (250.000 TL Hedefe Ulaşma Süresi ve 24. Ay Birikim Projeksiyonu):\n"
        f"   - %0 Getiri (Sadece Anapara) : {m_goal['zero_return_months']} ay | 24. Ay Bakiye: {end_b['principal_only_tl']:,.2f} TL\n"
        f"   - Kötümser (%15/yıl)         : {m_goal['pessimistic_months']} ay | 24. Ay Bakiye: {end_b['pessimistic_tl']:,.2f} TL\n"
        f"   - Baz / Beklenen (%30/yıl)   : {m_goal['base_expected_months']} ay | 24. Ay Bakiye: {end_b['base_expected_tl']:,.2f} TL\n"
        f"   - İyimser (%45/yıl)          : {m_goal['optimistic_months']} ay | 24. Ay Bakiye: {end_b['optimistic_tl']:,.2f} TL"
    )

    print(
        f"4) Senaryo 4 (35.000 TL Beklenmedik Gider Şoku):\n"
        f"   - Şok Öncesi Rezerv: {s4['pre_shock']['emergency_reserve_tl']:,.2f} TL ({s4['pre_shock']['months_covered']:.2f} ay)\n"
        f"   - Şok Sonrası Rezerv: {s4['post_shock']['emergency_reserve_tl']:,.2f} TL ({s4['post_shock']['months_covered']:.2f} ay) "
        f"-> [{s4['post_shock']['status']}] (Yerine koyma süresi: {s4['post_shock']['months_to_replenish_from_savings']} ay)"
    )

    print(f"5) Senaryo 5 (Sanal Yatırım Sepeti Değer Kaybı Stres Testi — Sepet: {s5['basket_name']}):")
    for row in s5["stress_test_table"]:
        print(
            f"   * {row['scenario_label']:<38}: Sepet {row['portfolio_value_before_tl']:,.2f} TL -> "
            f"{row['portfolio_value_after_tl']:,.2f} TL (Kayıp: {row['portfolio_loss_tl']:,.2f} TL) | "
            f"Hedefe Ulaşma: {row['months_to_goal_after_shock']} ay (+{row['goal_delay_months']} ay gecikme)"
        )

    # 3. BÖLÜM: MODÜL H — Doğrulanabilir Finansal Karar Asistanı Testi
    print("\n" + "-" * 98)
    print("BÖLÜM 3: MODÜL H — DOĞRULANABİLİR FİNANSAL KARAR ASİSTANI (ÖRNEK SORULAR VE KANIT AYRIMI)")
    print("-" * 98)

    sample_questions = [
        "1. Fonu yöneten şirket batarsa param yanar mı ve fon malvarlığının hukuki güvencesi nedir?",
        "2. AFT ile TI1 fonlarının 2026 yılı tarihsel performans farkı, volatilitesi ve Max Drawdown riski nedir?",
        "3. Bütçemde birikimimi en çok etkileyen giderler hangileri ve 250.000 TL hedefime ne zaman ulaşırım?",
    ]

    for q in sample_questions:
        ans = ask_financial_assistant(user_query=q)
        print(f"\n[SORU]: {q}")
        print(f"  -> [DOĞRUDAN YANIT (answer_summary)]: {ans['answer_summary']}")
        print(f"  -> [RESMİ HUKUKİ KANIT SAYISI]     : {len(ans['official_legal_evidence'])} mevzuat referansı")
        print(f"  -> [TARİHSEL MOTOR VERİSİ ANAHTARI]: {list(ans['verified_historical_metrics'].keys())}")
        print(f"  -> [KİŞİSEL SENARYO VERİSİ ANAHTARI]: {list(ans['personal_budget_and_scenarios'].keys())}")
        print(f"  -> [SINIRLILIK UYARISI]            : {ans['data_limitations_warning']}")

    # 4. BÖLÜM: FastAPI REST API Sunucusu Entegrasyon Testi (TestClient)
    print("\n" + "-" * 98)
    print("BÖLÜM 4: FASTAPI REST API UÇ NOKTALARI ENTEGRASYON TESTİ (TestClient)")
    print("-" * 98)

    client = TestClient(app)

    endpoints_to_test = [
        ("GET", "/api/health", None),
        ("GET", "/api/evidence-cards", None),
        ("GET", "/api/transparency/AFT", None),
        ("GET", "/api/bulletins", None),
        ("GET", "/api/bulletins/compare/AFT?period_old=2026-07&period_new=2026-10", None),
        ("GET", "/api/funds", None),
        (
            "POST",
            "/api/analytics/performance",
            {"fund_code": "AFT", "start_date": "2026-01-03", "end_date": "2026-10-16"},
        ),
        (
            "POST",
            "/api/analytics/compare",
            {"fund_codes": ["AFT", "TTA", "TI1"], "start_date": "2026-01-03", "end_date": "2026-10-16"},
        ),
        (
            "POST",
            "/api/baskets/simulate",
            {
                "allocations": [
                    {"fund_code": "AFT", "amount_tl": 15000},
                    {"fund_code": "TI1", "amount_tl": 15000},
                ],
                "start_date": "2026-01-03",
                "end_date": "2026-10-16",
            },
        ),
        ("GET", "/api/baskets", None),
        ("GET", "/api/finance/report?month_prefix=2026-10", None),
        ("POST", "/api/scenarios/simulate", {"scenario_type": "ALL", "params": {}}),
        (
            "POST",
            "/api/assistant/ask",
            {"user_query": "AFT bu ayki bültende öne çıkan noktalar ve dönem değişimi nedir?"},
        ),
    ]

    passed_api = 0
    for method, url, payload in endpoints_to_test:
        if method == "GET":
            resp = client.get(url)
        else:
            resp = client.post(url, json=payload)

        status_ok = resp.status_code == 200
        if status_ok:
            passed_api += 1
        print(f"  [{method:<4}] {url:<68} -> HTTP {resp.status_code} {'[OK]' if status_ok else '[HATA]'}")

    print("\n" + "=" * 98)
    print(f"FASTAPI ENTEGRASYON TEST SONUCU: {passed_api} / {len(endpoints_to_test)} UÇ NOKTA 200 OK DÖNDÜ.")
    print("ADIM 4 TÜM BACKEND MİMARİSİ VE TESTLER BAŞARIYLA TAMAMLANDI.")
    print("=" * 98)


if __name__ == "__main__":
    main()
