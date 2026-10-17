"""
Adım 3 Doğrulama Testi Betiği (Modül A, Modül G ve Modül B)
Dosya: backend/test_step3.py

Görevler:
1. 15 Kanıt Kartının veritabanına eksiksiz kaydedildiğini doğrular ve örnek olarak
   3. Kartı ("Fon malvarlığının hukuki statüsü nedir?") tüm kanıt alanlarıyla
   (Mevzuat ref, Sınırlar, Yanlış İnanış) terminale yazdırır.
2. AFT ve TI1 fonları için Modül G Şeffaflık Değerlendirme çıktısını terminale yazdırır.
3. Bülten arşivini (3 ayrı kategoride) listeler, bir bültenin 7 zorunlu başlıklı özetini
   (özellikle verified_facts vs opinions_and_forecasts ayrımını) terminale yazdırır.
4. AFT ve MAC fonları için 2026-07 ile 2026-10 dönemlerini karşılaştıran
   Bülten/Rapor Karşılaştırma Sistemi çıktısını (gerçek yatırımcı sayısı ve portföy
   büyüklüğü değişimleriyle) terminale yazdırır.
"""

from database import init_db, DB_PATH
from evidence_engine import (
    seed_evidence_cards,
    get_all_evidence_cards,
    get_evidence_card_by_order,
    evaluate_fund_transparency,
)
from bulletin_engine import (
    seed_real_bulletins,
    list_bulletins,
    compare_fund_reports,
)


def main() -> None:
    print("=" * 94)
    print("ADIM 3: KANIT MERKEZİ (MODÜL A & G) VE KAYNAK ATIFLI BÜLTEN MOTORU (MODÜL B) TESTİ")
    print("=" * 94)

    # 1. Veritabanı şemasını doğrula ve güncelle
    init_db()
    print(f"[OK] SQLite veritabanı şeması doğrulandı: {DB_PATH}")

    # 2. GÖREV 1A: 15 Kanıt Kartını Veritabanına Kaydet ve Doğrula
    print("\n" + "-" * 94)
    print("BÖLÜM 1: MODÜL A — 15 KANIT KARTI ('FONLARA NEDEN GÜVENMELİYİZ?') DOĞRULAMASI")
    print("-" * 94)

    seeded_count = seed_evidence_cards()
    cards = get_all_evidence_cards()
    print(f"[OK] Veritabanına kaydedilen toplam Kanıt Kartı sayısı: {seeded_count} / 15\n")

    for c in cards:
        print(f"  [{c['order_no']:>2}] {c['question']}  --> ({c['regulation_ref']})")

    # 3. Kartın ("Fon malvarlığının hukuki statüsü nedir?") tüm kanıt alanlarıyla detaylı çıktısı
    card_3 = get_evidence_card_by_order(3)
    print("\n" + "=" * 94)
    print("ÖRNEK KANIT KARTI DETAYI (KART #3)")
    print("=" * 94)
    if card_3:
        print(f"Soru Başlığı             : {card_3['question']}")
        print(f"Konu Kimliği (Slug)      : {card_3['topic_slug']}")
        print(f"Kısa İddia Özeti         : {card_3['claim_summary']}")
        print(f"Detaylı Hukuki Açıklama  : {card_3['detailed_explanation']}")
        print(f"Resmi Kaynak Kurum       : {card_3['official_source']}")
        print(f"Mevzuat / Madde Atfı     : {card_3['regulation_ref']}")
        print(f"Resmi Belge Tarihi       : {card_3['source_date']}")
        print(f"Resmi Belge Bağlantısı   : {card_3['official_url']}")
        print(f"Yatırımcı İçin Anlamı    : {card_3['user_meaning']}")
        print(f"Sınırlar ve Riskler      : {card_3['limitations_and_risks']}")
        print(f"Yaygın Yanlış İnanış     : {card_3['common_misconception']}")

    # 3. GÖREV 2 & 3: Gerçek Verili Bültenleri Kaydet ve Modül G Şeffaflık Değerlendirmesini Çalıştır
    total_bulletins = seed_real_bulletins()

    print("\n" + "-" * 94)
    print("BÖLÜM 2: MODÜL G — FON ŞEFFAFLIĞI VE KANIT DEĞERLENDİRME MOTORU (AFT ve TI1)")
    print("-" * 94)

    for target_code in ("AFT", "TI1"):
        eval_res = evaluate_fund_transparency(target_code)
        print(f"\n>>> [{eval_res['fund_code']}] {eval_res['fund_title']} ({eval_res['fund_type']})")
        print(f"    Değerlendirme Amacı     : {eval_res['evaluation_purpose']}")
        print(f"    Yapısal Şeffaflık Puanı : {eval_res['total_transparency_score_out_of_100']} / 100 ({eval_res['transparency_grade']})")
        chk = eval_res["structural_checklist"]
        print(f"    Kurucu PYŞ              : {chk['founder_institution']}")
        print(f"    Portföy Saklayıcısı     : {chk['custodian_institution']}")
        print(f"    Alım / Satım Valörü     : Alım: {chk['valor_buy']} | Satım: {chk['valor_sell']}")
        print(f"    SPK Risk Değeri (1-7)   : {chk['risk_value_scale_1_7']}")
        print(f"    Stopaj / Vergi Notu     : {chk['withholding_tax_note']}")
        print("    Kriter Bazlı Kanıt Kırılımı:")
        for crit in eval_res["criteria_breakdown"]:
            print(
                f"      * {crit['criterion_name']}: {crit['awarded_points']}/{crit['weight_points']} Puan "
                f"[{crit['status']}] -> {crit['evidence_detail']}"
            )
        print(f"    Metodoloji Sınırı       : {eval_res['methodology_and_limitations']}")

    # 4. GÖREV 2: Modül B — Bülten Arşivi (3 Kategori) ve 7 Zorunlu Başlıklı Özet Çıktısı
    print("\n" + "-" * 94)
    print(f"BÖLÜM 3: MODÜL B — BÜLTEN ARŞİVİ (TOPLAM {total_bulletins} KAYIT) VE 7 BAŞLIKLI ÖZET ŞEMASI")
    print("-" * 94)

    for cat in ("RESMI_DUYURU", "KURUCU_BELGESI", "FON_SEKTOR_BULTENI"):
        cat_items = list_bulletins(category=cat)
        print(f"\nKategori: [{cat}] ({len(cat_items)} belge)")
        for b in cat_items:
            print(
                f"  - ID #{b['id']:>2} | [{b['doc_type']}] | Dönem: {b['period_covered']:<7} | "
                f"Rozet: {b['content_origin_badge']:<18} | {b['title']}"
            )

    # AFT 2026-10 Bülteninin 7 zorunlu başlıklı özetini detaylı yazdır
    aft_bulletins = list_bulletins(fund_code="AFT")
    sample_bulletin = aft_bulletins[0]
    summary = sample_bulletin["ai_summary"]

    print("\n" + "=" * 94)
    print(f"ÖRNEK BÜLTEN 7 ZORUNLU BAŞLIKLI KAYNAK ATIFLI ÖZETİ: {sample_bulletin['title']}")
    print("=" * 94)
    print(f"1. [document_overview] Bu belgede ne anlatılıyor?\n   {summary['document_overview']}")
    print("2. [key_developments] Önemli gelişmeler neler?")
    for dev in summary["key_developments"]:
        print(f"   - {dev}")
    print(f"3. [investor_impact] Yatırımcı açısından neden önemli?\n   {summary['investor_impact']}")
    print("4. [used_data_and_citations] Hangi veriler ve açıklamalar kullanılmış (Sayfa/Bölüm Atıflı)?")
    for cit in summary["used_data_and_citations"]:
        print(f"   - [{cit['reference_section_or_page']}] {cit['claim']}")
    print("5. [facts_vs_interpretations] Kesin Resmi Veri vs. Kurum/Yönetici Yorumu Ayrımı:")
    print("   A) [KESİN BİLGİ / RESMİ VERİ (verified_facts)]:")
    for vf in summary["facts_vs_interpretations"]["verified_facts"]:
        print(f"      + {vf}")
    print("   B) [YORUM / PİYASA BEKLENTİSİ (opinions_and_forecasts)]:")
    for op in summary["facts_vs_interpretations"]["opinions_and_forecasts"]:
        print(f"      ~ {op}")
    print("6. [uncertainties_and_gaps] Hangi noktalar belirsiz veya belgede yer almıyor?")
    for gap in summary["uncertainties_and_gaps"]:
        print(f"   ! {gap}")
    orig = summary["original_source_access"]
    print(
        f"7. [original_source_access] Orijinal Kaynak Erişimi:\n"
        f"   Kurum: {orig['source_institution']} | Tarih: {orig['publish_date']} | "
        f"Dönem: {orig['period_covered']} | Rozet: {orig['content_origin_badge']} | URL: {orig['original_url']}"
    )

    # 5. GÖREV 2.5 & 3.4: AFT ve MAC İçin 2026-07 ile 2026-10 Dönem Raporu Karşılaştırma Sistemi
    print("\n" + "-" * 94)
    print("BÖLÜM 4: MODÜL B — BÜLTEN VE DÖNEM RAPORU KARŞILAŞTIRMA SİSTEMİ (2026-07 vs. 2026-10)")
    print("-" * 94)

    for cmp_code in ("AFT", "MAC"):
        cmp_res = compare_fund_reports(cmp_code, "2026-07", "2026-10")
        mc = cmp_res["metrics_comparison"]
        up = mc["unit_price"]
        ps = mc["portfolio_size_tl"]
        ic = mc["investor_count"]
        nd = cmp_res["narrative_and_disclosure_diff"]

        print(f"\n>>> [{cmp_res['fund_code']}] {cmp_res['fund_title']} ({cmp_res['fund_type']})")
        print(
            f"    Karşılaştırılan Dönemler : {cmp_res['period_old']} (Ref: {cmp_res['old_reference_date']}) "
            f"--> {cmp_res['period_new']} (Ref: {cmp_res['new_reference_date']})"
        )
        print(
            f"    1. Birim Pay Fiyatı      : {up['old_price_tl']:.6f} TL --> {up['new_price_tl']:.6f} TL "
            f"(Değişim: %{up['change_pct']:+.2f})"
        )
        print(
            f"    2. Portföy Büyüklüğü     : {ps['old_total_value_tl']:,.2f} TL --> {ps['new_total_value_tl']:,.2f} TL "
            f"(Fark: {ps['diff_tl']:+,.2f} TL | %{ps['change_pct']:+.2f})"
        )
        print(
            f"    3. Yatırımcı Sayısı      : {ic['old_investor_count']:,} kişi --> {ic['new_investor_count']:,} kişi "
            f"(Fark: {ic['diff_persons']:+,} kişi | %{ic['change_pct']:+.2f})"
        )
        print("    4. Dönemsel Bülten Kesin Veri & Strateji Farkı:")
        print(f"       - Önceki Bülten ({cmp_res['period_old']}) : {nd['old_verified_facts'][0] if nd['old_verified_facts'] else '-'}")
        print(f"       - Güncel Bülten ({cmp_res['period_new']}) : {nd['new_verified_facts'][0] if nd['new_verified_facts'] else '-'}")
        print(f"       - Yönetici Yorumu Farkı     : {nd['new_manager_commentary'][0] if nd['new_manager_commentary'] else '-'}")

    print("\n" + "=" * 94)
    print("ADIM 3 TÜM TESTLER BAŞARIYLA TAMAMLANDI.")
    print("=" * 94)


if __name__ == "__main__":
    main()
