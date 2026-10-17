"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Scale,
  Lock,
  GraduationCap,
  Calculator,
  X,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface LegalTextsMap {
  legal_disclaimer_spk: string;
  legal_terms_of_service: string;
  legal_privacy_kvkk: string;
  legal_tubitak_consent: string;
  legal_methodology: string;
}

export const DEFAULT_LEGAL_TEXTS: LegalTextsMap = {
  legal_disclaimer_spk:
    "YASAL UYARI (SPK MEVZUATI UYARINCA): Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında değildir. Yatırım danışmanlığı hizmeti; aracı kurumlar, portföy yönetim şirketleri, mevduat kabul etmeyen bankalar ile müşteri arasında imzalanacak yatırım danışmanlığı sözleşmesi çerçevesinde sunulmaktadır. Bu platformda yer alan fon analizleri, grafikler, sanal sepet simülasyonları ve bülten özetleri yalnızca finansal okuryazarlık, eğitim ve TÜBİTAK 2209-A akademik araştırma projesi kapsamında sunulmakta olup, herhangi bir yatırım aracının alım-satım önerisi veya getiri vaadi olarak değerlendirilemez. Geçmiş dönem performansları gelecek dönem getirilerinin garantisi değildir. Veriler resmi kaynaklardan (TEFAS, Takasbank, KAP) derlenmiş olup, teknik gecikmelerden veya kaynak kaynaklı hatalardan platform sorumlu tutulamaz.",
  legal_terms_of_service:
    "KULLANIM KOŞULLARI VE AKADEMİK KARAR DESTEK ÇERÇEVESİ:\n\n1. Amaç ve Kapsam: Fon Güven & Şeffaflık Platformu, TÜBİTAK 2209-A Üniversite Öğrencileri Araştırma Projeleri Destekleme Programı kapsamında geliştirilmiş, kâr amacı gütmeyen, akademik araştırma ve finansal okuryazarlık odaklı bir karar destek sistemidir.\n\n2. Yatırım Danışmanlığı Niteliği Taşımama (6362 Sayılı SPKn): Platformda sunulan hiçbir veri, kanıt kartı, şeffaflık puanı, bülten özeti, 100 bazlı performans karşılaştırması veya sanal sepet simülasyonu 6362 sayılı Sermaye Piyasası Kanunu ve ilgili SPK Tebliğleri kapsamında 'Yatırım Danışmanlığı' veya 'Portföy Yöneticiliği' faaliyeti teşkil etmez.\n\n3. Brüt Birim Pay Fiyatı ve Vergi/Komisyon Sorumluluğu: Platformdaki tüm tarihsel getiri ve sanal sepet hesaplamaları TEFAS'ta ilan edilen günlük brüt birim pay fiyatları üzerinden gerçekleştirilir. Fon yönetim ücreti günlük fiyata dahil olmakla birlikte; fon türüne göre değişen stopaj vergisi kesintileri, alım-satım valör süreleri (T+1, T+2, T+3), aracı kurum/banka komisyonları ve piyasa likidite koşulları kullanıcı sorumluluğundadır.\n\n4. Fikri Mülkiyet ve Kullanım Sınırları: Platformun yazılım mimarisi, kanıt kartı kurgusu ve araştırma metodolojisi akademik telif hakları ile korunmaktadır; ticari amaçla izinsiz kopyalanamaz, çoğaltılamaz veya ücretli bir hizmet olarak satılamaz.",
  legal_privacy_kvkk:
    "6698 SAYILI KVKK VE GİZLİLİK POLİTİKASI BİLDİRİMİ:\n\n1. Veri İşleme İlkeleri: Platformumuz, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca 'veri minimizasyonu' ve 'mahremiyet odaklı tasarım (Privacy by Design)' ilkelerini benimser. Ziyaretçilerden ad, soyad, T.C. kimlik numarası, telefon veya banka hesap bilgisi talep edilmez.\n\n2. Üçüncü Şahıslarla Paylaşmama Garantisi: Kullanıcıların platform üzerinde oluşturduğu sanal sepet simülasyonları, bütçe/senaryo denemeleri ve anonim araştırma etkileşimleri hiçbir koşulda üçüncü şahıslara, finans kuruluşlarına, veri simsarlarına veya reklam ağlarına satılmaz ve aktarılmaz.\n\n3. Yerel ve Akademik Kullanım: Girilen tüm parametreler yalnızca yerel veritabanı üzerinde karar destek simülasyonlarının çalıştırılması ve anonimleştirilmiş akademik istatistiklerin üretilmesi amacıyla işlenir.\n\n4. Veri Sahibi Hakları (KVKK Md. 11): Kullanıcılar diledikleri zaman yerel kayıtlarının silinmesini talep etme ve veri işleme süreçleri hakkında şeffaf bilgi alma hakkına sahiptir.",
  legal_tubitak_consent:
    "TÜBİTAK 2209-A BİLGİLENDİRİLMİŞ GÖNÜLLÜ ONAM METNİ:\n\n1. Araştırmanın Konusu: Bu çalışma, 'Kişisel Finans, Yatırım Fonları, Finansal Şeffaflık ve Fonlara Güven Platformu' başlığı altında bireysel yatırımcıların resmi kanıt kartları (SPKn Md. 52-53, Takasbank saklama güvencesi, KAP/TEFAS doğrulaması) ve 100 bazlı şeffaf analiz araçları ile etkileşiminin finansal okuryazarlık ve fonlara duyulan kurumsal güven üzerindeki etkisini ölçmektedir.\n\n2. Anonimlik ve Katılımcı Kodları: Araştırma kapsamında toplanan Ön-Test / Son-Test güven puanları, modül kullanım süreleri ve incelenen fon/konu kayıtları tamamen anonim kimlik kodlarıyla (Örn: K-2209-01) saklanmaktadır. Hiçbir kayıt gerçek kişi kimliğiyle ilişkilendirilmez.\n\n3. Gönüllülük ve Akademik Kullanım Taahhüdü: Araştırmaya katılım tamamen gönüllülük esasına dayanır. Elde edilen anonim veriler yalnızca TÜBİTAK 2209-A proje sonuç raporu, akademik tez çalışmaları ve hakemli bilimsel yayınlarda toplu istatistiksel analiz (t-Testi / Wilcoxon) amacıyla kullanılacak olup başka hiçbir kurum veya amaçla paylaşılmayacaktır.",
  legal_methodology:
    "VERİ METODOLOJİSİ, MATEMATİKSEL FORMÜLLER VE ŞEFFAFLIK BİLDİRİMİ:\n\n1. 100 Bazlı Normalizasyon Formülü: Farklı birim pay fiyatlarına sahip fonların adil biçimde karşılaştırılabilmesi için seçilen başlangıç tarihindeki (t_0) fiyat 100 kabul edilir ve takip eden her işlem günü (t) için endeks değeri şu formülle hesaplanır:\n   Endeks_t = (Fiyat_t / Fiyat_0) * 100\n\n2. Tatil Günü ve Hafta Sonu Çözümleme Kuralı: Borsa İstanbul ve TEFAS resmi tatil veya hafta sonu günlerinde fon fiyatı oluşmadığından, kullanıcının seçtiği başlangıç/bitiş tarihi tatil gününe denk gelirse sistem otomatik olarak veritabanındaki en yakın geçerli işlem gününü (actual_start_date / actual_end_date) seçer ve kullanıcıya şeffaf uyarı kutusunda bildirir.\n\n3. Ağırlıklı Sanal Sepet Getirisi ve Risk Metrikleri: Sepetteki her bir fon için başlangıç TL tutarı o günkü birim pay fiyatına bölünerek alınan pay adedi (Pay_i = Tutar_i / Fiyat_{i,0}) bulunur. Günlük toplam sepet değeri sum(Pay_i * Fiyat_{i,t}) üzerinden hesaplanır. Maksimum Düşüş (Max Drawdown), dönem içi zirveden dibe en yüksek yüzdesel gerilemeyi; Yıllıklandırılmış Volatilite ise günlük yüzdesel getirilerin standart sapmasının karekök(252) işlem günü ile ölçeklendirilmiş değerini ifade eder.\n\n4. Fon Şeffaflık Değerlendirme Kriterleri: Fonların KAP bildirim bağlantısı, Takasbank saklama doğrulaması, portföy yönetim şirketi bilgisi, risk değeri beyanı ve izahname erişilebilirliği resmi mevzuat kriterlerine göre denetlenerek şeffaflık kontrol listesi oluşturulur.",
};

type ModalKey =
  | "legal_terms_of_service"
  | "legal_privacy_kvkk"
  | "legal_tubitak_consent"
  | "legal_methodology"
  | null;

const MODAL_META: Record<
  Exclude<ModalKey, null>,
  { title: string; subtitle: string; badge: string; icon: React.ElementType }
> = {
  legal_terms_of_service: {
    title: "Kullanım Koşulları ve Yasal Çerçeve",
    subtitle: "6362 Sayılı Sermaye Piyasası Kanunu ve Akademik Kullanım Esasları",
    badge: "KULLANIM KOŞULLARI",
    icon: Scale,
  },
  legal_privacy_kvkk: {
    title: "KVKK Aydınlatma Metni ve Gizlilik Politikası",
    subtitle: "6698 Sayılı Kişisel Verilerin Korunması Kanunu Uyarınca Veri Güvenliği",
    badge: "6698 SAYILI KVKK",
    icon: Lock,
  },
  legal_tubitak_consent: {
    title: "TÜBİTAK 2209-A Bilgilendirilmiş Gönüllü Onam Formu",
    subtitle: "Anonim Akademik Araştırma Etiği ve Veri Koruma Taahhütnamesi",
    badge: "TÜBİTAK 2209-A ETİK ONAM",
    icon: GraduationCap,
  },
  legal_methodology: {
    title: "Hesaplama Metodolojisi ve Şeffaflık Bildirimi",
    subtitle: "100 Bazlı Normalizasyon, Tatil Günü Çözümleme ve Sepet Simülasyon Formülleri",
    badge: "MATEMATİKSEL METODOLOJİ",
    icon: Calculator,
  },
};

export default function Footer() {
  const [legalTexts, setLegalTexts] =
    useState<LegalTextsMap>(DEFAULT_LEGAL_TEXTS);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  const loadLegalTexts = () => {
    apiFetch<Partial<LegalTextsMap>>("/api/public/legal-texts")
      .then((res) => {
        if (res) {
          setLegalTexts((prev) => ({
            legal_disclaimer_spk:
              res.legal_disclaimer_spk || prev.legal_disclaimer_spk,
            legal_terms_of_service:
              res.legal_terms_of_service || prev.legal_terms_of_service,
            legal_privacy_kvkk:
              res.legal_privacy_kvkk || prev.legal_privacy_kvkk,
            legal_tubitak_consent:
              res.legal_tubitak_consent || prev.legal_tubitak_consent,
            legal_methodology:
              res.legal_methodology || prev.legal_methodology,
          }));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadLegalTexts();
    const handleLegalUpdated = () => loadLegalTexts();
    window.addEventListener("legal-texts-updated", handleLegalUpdated);
    return () =>
      window.removeEventListener("legal-texts-updated", handleLegalUpdated);
  }, []);

  const currentModalMeta = activeModal ? MODAL_META[activeModal] : null;
  const CurrentModalIcon = currentModalMeta ? currentModalMeta.icon : Scale;

  return (
    <>
      <footer className="w-full bg-slate-900 dark:bg-slate-950 text-slate-300 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Yasal Uyarı & Sorumluluk Reddi (YTD) Kutusu */}
          <div className="p-5 rounded-2xl bg-slate-800/80 dark:bg-slate-900/90 border border-slate-700/80 shadow-inner space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm tracking-wide uppercase">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Yasal Uyarı & Sorumluluk Reddi (SPK Mevzuatı — YTD)</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300/95">
              {legalTexts.legal_disclaimer_spk}
            </p>
          </div>

          {/* Alt Telif Hakkı, TÜBİTAK 2209-A İbaresi ve Yasal Modal Bağlantıları */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-800/80 text-xs">
            <div className="text-slate-400 leading-relaxed">
              © 2026 Fon Güven & Şeffaflık Platformu — TÜBİTAK 2209-A Üniversite
              Öğrencileri Araştırma Projeleri Destekleme Programı Kapsamında
              Geliştirilmiştir.
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveModal("legal_terms_of_service")}
                className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold transition-colors inline-flex items-center gap-1.5 border border-slate-700/70"
              >
                <Scale className="w-3.5 h-3.5 text-blue-400" />
                <span>Kullanım Koşulları</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal("legal_privacy_kvkk")}
                className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold transition-colors inline-flex items-center gap-1.5 border border-slate-700/70"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>KVKK ve Gizlilik Politikası</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal("legal_tubitak_consent")}
                className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold transition-colors inline-flex items-center gap-1.5 border border-slate-700/70"
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>TÜBİTAK 2209-A Onam Formu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal("legal_methodology")}
                className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold transition-colors inline-flex items-center gap-1.5 border border-slate-700/70"
              >
                <Calculator className="w-3.5 h-3.5 text-purple-400" />
                <span>Hesaplama Metodolojisi</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Açılır Yasal Metin Penceresi (Modal / Dialog) */}
      {activeModal && currentModalMeta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Başlık */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CurrentModalIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 mb-1">
                    {currentModalMeta.badge}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {currentModalMeta.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentModalMeta.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal İçerik */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {legalTexts[activeModal]}
            </div>

            {/* Modal Alt Bilgi */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  6362 Sayılı SPKn, 6698 Sayılı KVKK ve TÜBİTAK 2209-A Araştırma
                  Etiğine Uygundur
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold self-end sm:self-auto"
              >
                Okudum, Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
