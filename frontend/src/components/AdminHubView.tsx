"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Settings,
  FileText,
  Database,
  Download,
  LogOut,
  CheckCircle2,
  Upload,
  Plus,
  Sparkles,
  Trash2,
  Clock,
  ShieldCheck,
  Compass,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FileSpreadsheet,
  GraduationCap,
  Shuffle,
  ExternalLink,
  Scale,
} from "lucide-react";
import {
  API_BASE_URL,
  adminFetch,
  apiFetch,
  clearAdminToken,
  getAdminToken,
  formatNumberTR,
} from "@/lib/api";
import { DEFAULT_LEGAL_TEXTS, LegalTextsMap } from "@/components/Footer";

export type AdminTabKey =
  | "overview"
  | "branding"
  | "bulletins"
  | "funds"
  | "research"
  | "legal";

export default function AdminHubView({
  initialTab = "overview",
}: {
  initialTab?: AdminTabKey;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);
  const [authChecked, setAuthChecked] = useState(false);

  // Genel Durum & Senkronizasyon state
  const [syncData, setSyncData] = useState<any>(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Site Ayarları & Logo state
  const [siteTitle, setSiteTitle] = useState("Fon Güven & Şeffaflık");
  const [siteSubtitle, setSiteSubtitle] = useState(
    "TÜBİTAK 2209-A Araştırma Platformu"
  );
  const [siteLogoUrl, setSiteLogoUrl] = useState("");
  const [brandingMsg, setBrandingMsg] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Karşılama Ekranı (Splash Screen) & Motive Edici Sözler state
  const [splashEnabled, setSplashEnabled] = useState<boolean>(true);
  const [splashDurationMs, setSplashDurationMs] = useState<number>(2200);
  const [splashQuotes, setSplashQuotes] = useState<string[]>([
    "Finansta en değerli sermaye doğru ve doğrulanabilir bilgidir.",
    "Yatırımlarınızı sloganlara değil, resmi kanıtlara dayandırın.",
    "Şeffaflık güveni, bilinçli çeşitlendirme ise geleceği korur.",
    "Geçmiş getiri bir teminat değildir; ancak finansal okuryazarlık kalıcı bir güçtür.",
    "Büyük birikimler, küçük ve disiplinli adımlarla inşa edilir.",
  ]);
  const [newQuoteText, setNewQuoteText] = useState<string>("");
  const [editingQuoteIdx, setEditingQuoteIdx] = useState<number | null>(null);
  const [editingQuoteText, setEditingQuoteText] = useState<string>("");
  const [savingSplash, setSavingSplash] = useState<boolean>(false);
  const [splashMsg, setSplashMsg] = useState<string | null>(null);

  // Yasal Metinler & Sözleşmeler state (GÖREV 4)
  const [legalTexts, setLegalTexts] =
    useState<LegalTextsMap>(DEFAULT_LEGAL_TEXTS);
  const [savingLegal, setSavingLegal] = useState<boolean>(false);
  const [legalMsg, setLegalMsg] = useState<string | null>(null);

  // Fon Havuzu & Rastgele 5 Fon Keşif state (GÖREV 4)
  const [fundsList, setFundsList] = useState<any[]>([]);
  const [newFundCode, setNewFundCode] = useState("");
  const [newFundType, setNewFundType] = useState("Hisse Senedi Yoğun Fon");
  const [addingFund, setAddingFund] = useState(false);
  const [addingRandomFive, setAddingRandomFive] = useState(false);
  const [randomFiveReport, setRandomFiveReport] = useState<any>(null);
  const [fundActionMsg, setFundActionMsg] = useState<string | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  // Bülten & PDF Giriş Merkezi + Otomatik Bülten Keşfet state (GÖREV 5)
  const [bulletinsList, setBulletinsList] = useState<any[]>([]);
  const [discoveredBulletins, setDiscoveredBulletins] = useState<any[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [showBulletinGuide, setShowBulletinGuide] = useState(true);
  const [bFundCode, setBFundCode] = useState("");
  const [bTitle, setBTitle] = useState("");
  const [bCategory, setBCategory] = useState("FON_SEKTOR_BULTENI");
  const [bDocType, setBDocType] = useState("AYLIK_FON_BULTENI");
  const [bSourceInst, setBSourceInst] = useState(
    "Kamuyu Aydınlatma Platformu (KAP)"
  );
  const [bPeriod, setBPeriod] = useState("2026-10");
  const [bPublishDate, setBPublishDate] = useState("2026-10-17");
  const [bOriginalUrl, setBOriginalUrl] = useState(
    "https://www.kap.org.tr/tr/YatirimFonlari"
  );
  const [bOriginBadge, setBOriginBadge] = useState("RESMI_BELGE_OZETI");
  const [bRawText, setBRawText] = useState("");
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftSummary, setDraftSummary] = useState<any>(null);
  const [publishingBulletin, setPublishingBulletin] = useState(false);
  const [bulletinMsg, setBulletinMsg] = useState<string | null>(null);

  // TÜBİTAK 2209-A Araştırma Verileri & Metodoloji state (GÖREV 6)
  const [researchData, setResearchData] = useState<any>(null);
  const [showResearchGuide, setShowResearchGuide] = useState(true);
  const [rParticipant, setRParticipant] = useState("K-2209-09");
  const [rModule, setRModule] = useState("Fonlara Güven & Kanıt Merkezi");
  const [rAction, setRAction] = useState("ON_TEST_SON_TEST_KARSILASTIRMA");
  const [rTopic, setRTopic] = useState(
    "SPKn Md. 53 Varlık Ayrılığı, Bülten Kanıt Özeti ve Sanal Sepet Deneyimi"
  );
  const [rDuration, setRDuration] = useState(210);
  const [rPreScore, setRPreScore] = useState(45);
  const [rPostScore, setRPostScore] = useState(92);
  const [rNotes, setRNotes] = useState("");
  const [researchFeedback, setResearchFeedback] = useState<string | null>(null);

  const loadAllAdminData = async () => {
    try {
      await adminFetch("/api/admin/verify");
      setAuthChecked(true);
    } catch {
      router.replace("/admin/login");
      return;
    }

    const [syncRes, setRes, splashRes, legalRes, fRes, bRes, rRes, discRes] =
      await Promise.all([
        apiFetch<any>("/api/public/sync-status").catch(() => null),
        apiFetch<any>("/api/public/settings").catch(() => null),
        apiFetch<any>("/api/public/splash-settings").catch(() => null),
        apiFetch<any>("/api/public/legal-texts").catch(() => null),
        apiFetch<any>("/api/funds").catch(() => null),
        apiFetch<any>("/api/bulletins").catch(() => null),
        adminFetch<any>("/api/admin/research/metrics").catch(() => null),
        adminFetch<any>("/api/admin/bulletins/discover").catch(() => null),
      ]);

    if (syncRes) setSyncData(syncRes);
    if (setRes) {
      setSiteTitle(setRes.site_title || "Fon Güven & Şeffaflık");
      setSiteSubtitle(
        setRes.site_subtitle || "TÜBİTAK 2209-A Araştırma Platformu"
      );
      setSiteLogoUrl(setRes.site_logo_url || "");
    }
    if (splashRes) {
      setSplashEnabled(splashRes.splash_enabled !== false);
      setSplashDurationMs(Number(splashRes.splash_duration_ms || 2200));
      if (Array.isArray(splashRes.splash_quotes) && splashRes.splash_quotes.length > 0) {
        setSplashQuotes(splashRes.splash_quotes);
      }
    }
    if (legalRes) {
      setLegalTexts((prev) => ({
        legal_disclaimer_spk:
          legalRes.legal_disclaimer_spk || prev.legal_disclaimer_spk,
        legal_terms_of_service:
          legalRes.legal_terms_of_service || prev.legal_terms_of_service,
        legal_privacy_kvkk:
          legalRes.legal_privacy_kvkk || prev.legal_privacy_kvkk,
        legal_tubitak_consent:
          legalRes.legal_tubitak_consent || prev.legal_tubitak_consent,
        legal_methodology:
          legalRes.legal_methodology || prev.legal_methodology,
      }));
    }
    if (fRes?.funds) setFundsList(fRes.funds);
    if (bRes?.bulletins) setBulletinsList(bRes.bulletins);
    if (rRes) setResearchData(rRes);
    if (discRes?.candidates) setDiscoveredBulletins(discRes.candidates);
  };

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/admin/login");
      return;
    }
    loadAllAdminData();
  }, []);

  const handleLogout = () => {
    clearAdminToken();
    router.push("/admin/login");
  };

  // --- Manuel Senkronizasyon ---
  const handleManualSync = async () => {
    setSyncingNow(true);
    setSyncFeedback(null);
    try {
      const res = await adminFetch<any>("/api/admin/funds/sync-now", {
        method: "POST",
      });
      setSyncFeedback(res.message || "Senkronizasyon tamamlandı.");
      const updatedSync = await apiFetch<any>("/api/public/sync-status");
      setSyncData(updatedSync);
      window.dispatchEvent(new Event("branding-updated"));
    } catch (err: any) {
      setSyncFeedback(`Hata: ${err.message}`);
    } finally {
      setSyncingNow(false);
    }
  };

  // --- Site Kimliği & Logo ---
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandingMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({
          site_title: siteTitle,
          site_subtitle: siteSubtitle,
          site_logo_url: siteLogoUrl,
        }),
      });
      setBrandingMsg("Site başlık ve kimlik ayarları kaydedildi ve yayınlandı!");
      if (res.settings) {
        setSiteTitle(res.settings.site_title);
        setSiteSubtitle(res.settings.site_subtitle);
        setSiteLogoUrl(res.settings.site_logo_url);
      }
      window.dispatchEvent(new Event("branding-updated"));
    } catch (err: any) {
      setBrandingMsg(`Hata: ${err.message}`);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setBrandingMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminFetch<any>("/api/admin/upload-logo", {
        method: "POST",
        body: fd,
      });
      setSiteLogoUrl(res.site_logo_url);
      setBrandingMsg(
        `Logo yüklendi (${res.site_logo_url}) ve sol üst menüde aktif edildi!`
      );
      window.dispatchEvent(new Event("branding-updated"));
    } catch (err: any) {
      setBrandingMsg(`Logo yükleme hatası: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  // --- GÖREV 3: Karşılama Ekranı (Splash Screen) & Motive Edici Sözler Yönetimi ---
  const handleAddQuote = () => {
    const trimmed = newQuoteText.trim();
    if (!trimmed) return;
    setSplashQuotes((prev) => [...prev, trimmed]);
    setNewQuoteText("");
    setSplashMsg(
      "Yeni söz listeye eklendi. Kalıcı olması için 'Değişiklikleri Kaydet' butonuna tıklayın."
    );
  };

  const handleStartEditQuote = (idx: number) => {
    setEditingQuoteIdx(idx);
    setEditingQuoteText(splashQuotes[idx] || "");
  };

  const handleSaveEditedQuote = (idx: number) => {
    const trimmed = editingQuoteText.trim();
    if (!trimmed) return;
    setSplashQuotes((prev) =>
      prev.map((q, i) => (i === idx ? trimmed : q))
    );
    setEditingQuoteIdx(null);
    setEditingQuoteText("");
    setSplashMsg(
      "Söz güncellendi. Kalıcı olması için 'Değişiklikleri Kaydet' butonuna tıklayın."
    );
  };

  const handleDeleteQuote = (idx: number) => {
    if (splashQuotes.length <= 1) {
      setSplashMsg("En az 1 adet motive edici söz listede kalmalıdır.");
      return;
    }
    setSplashQuotes((prev) => prev.filter((_, i) => i !== idx));
    if (editingQuoteIdx === idx) {
      setEditingQuoteIdx(null);
      setEditingQuoteText("");
    }
    setSplashMsg(
      "Söz listeden çıkarıldı. Kalıcı olması için 'Değişiklikleri Kaydet' butonuna tıklayın."
    );
  };

  const handleSaveSplashSettings = async () => {
    setSavingSplash(true);
    setSplashMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/splash-settings", {
        method: "POST",
        body: JSON.stringify({
          splash_enabled: splashEnabled,
          splash_duration_ms: splashDurationMs,
          splash_quotes: splashQuotes,
        }),
      });
      if (res?.splash_settings) {
        setSplashEnabled(res.splash_settings.splash_enabled !== false);
        setSplashDurationMs(
          Number(res.splash_settings.splash_duration_ms || 2200)
        );
        if (Array.isArray(res.splash_settings.splash_quotes)) {
          setSplashQuotes(res.splash_settings.splash_quotes);
        }
      }
      setSplashMsg(
        "Karşılama ekranı ayarları ve motive edici sözler veritabanına (system_settings) kaydedildi ve canlı sitede aktif edildi!"
      );
    } catch (err: any) {
      setSplashMsg(`Hata: ${err.message}`);
    } finally {
      setSavingSplash(false);
    }
  };

  const handlePreviewSplash = () => {
    window.dispatchEvent(new Event("preview-splash-screen"));
  };

  // --- GÖREV 4: Yasal Metinler & Sözleşmeler Yönetimi ---
  const handleSaveLegalTexts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLegal(true);
    setLegalMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/legal-texts", {
        method: "POST",
        body: JSON.stringify(legalTexts),
      });
      if (res?.legal_texts) {
        setLegalTexts((prev) => ({
          ...prev,
          ...res.legal_texts,
        }));
      }
      setLegalMsg(
        "5 Yasal Metin (SPK Uyarısı, Kullanım Koşulları, KVKK, TÜBİTAK 2209-A Onamı, Metodoloji) başarıyla kaydedildi ve sitede yayınlandı!"
      );
      window.dispatchEvent(new Event("legal-texts-updated"));
    } catch (err: any) {
      setLegalMsg(`Hata: ${err.message}`);
    } finally {
      setSavingLegal(false);
    }
  };

  const handleResetLegalDefaults = () => {
    setLegalTexts(DEFAULT_LEGAL_TEXTS);
    setLegalMsg(
      "Varsayılan yasal metinler yüklendi. Kalıcı olması için 'Kaydet ve Yayınla' butonuna tıklayın."
    );
  };

  // --- GÖREV 5: Otomatik Bülten Keşfet & Forma Aktar ---
  const handleRefreshDiscovery = async () => {
    setLoadingDiscovery(true);
    try {
      const res = await adminFetch<any>("/api/admin/bulletins/discover");
      if (res?.candidates) setDiscoveredBulletins(res.candidates);
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const handleApplyCandidateToForm = (cand: any) => {
    setBFundCode(cand.fund_code || "");
    setBTitle(cand.title || "");
    setBCategory(cand.category || "FON_SEKTOR_BULTENI");
    setBDocType(cand.doc_type || "AYLIK_FON_BULTENI");
    setBSourceInst(
      cand.source_institution || "Kamuyu Aydınlatma Platformu (KAP)"
    );
    setBPeriod(cand.period_covered || "2026-10");
    setBPublishDate(cand.publish_date || "2026-10-16");
    setBOriginalUrl(cand.original_url || "https://www.kap.org.tr");
    setBOriginBadge(cand.content_origin_badge || "RESMI_BELGE_OZETI");
    setBRawText(cand.raw_text || "");
    setDraftSummary(cand.draft_summary || null);
    setBulletinMsg(
      `Otomatik keşfedilen bülten ("${cand.title}") tüm kaynak bilgileri ve 7 zorunlu başlıklı kanıt özetiyle birlikte forma aktarıldı! İnceleyip tek tıkla "Onayla ve Yayına Al" butonuna basabilirsiniz.`
    );
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPdf(true);
    setBulletinMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminFetch<any>("/api/admin/bulletins/extract-pdf", {
        method: "POST",
        body: fd,
      });
      setBRawText(res.extracted_text || "");
      setBulletinMsg(
        `PDF başarıyla okundu (${res.filename} • ${res.char_count} karakter sayfa etiketli metin ayrıştırıldı).`
      );
    } catch (err: any) {
      setBulletinMsg(`PDF okuma hatası: ${err.message}`);
    } finally {
      setExtractingPdf(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!bTitle.trim() || !bRawText.trim()) {
      setBulletinMsg("Lütfen Bülten Başlığı ve Belge Metni alanlarını doldurun.");
      return;
    }
    setGeneratingDraft(true);
    setBulletinMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/bulletins/draft", {
        method: "POST",
        body: JSON.stringify({
          fund_code: bFundCode || null,
          title: bTitle,
          category: bCategory,
          doc_type: bDocType,
          source_institution: bSourceInst,
          publish_date: bPublishDate,
          period_covered: bPeriod,
          original_url: bOriginalUrl,
          content_origin_badge: bOriginBadge,
          raw_text: bRawText,
        }),
      });
      setDraftSummary(res.draft_summary);
      setBulletinMsg(
        "7 Zorunlu Başlıklı Taslak Özet oluşturuldu! Aşağıdaki kutulardan inceleyip düzenledikten sonra 'Onayla ve Yayına Al' butonuna basabilirsiniz."
      );
    } catch (err: any) {
      setBulletinMsg(`Taslak oluşturma hatası: ${err.message}`);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handlePublishBulletin = async () => {
    if (!draftSummary) return;
    setPublishingBulletin(true);
    setBulletinMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/bulletins/publish", {
        method: "POST",
        body: JSON.stringify({
          fund_code: bFundCode || null,
          title: bTitle,
          category: bCategory,
          doc_type: bDocType,
          source_institution: bSourceInst,
          publish_date: bPublishDate,
          period_covered: bPeriod,
          original_url: bOriginalUrl,
          content_origin_badge: bOriginBadge,
          raw_text: bRawText,
          ai_summary: draftSummary,
        }),
      });
      setBulletinMsg(res.message);
      setDraftSummary(null);
      setBTitle("");
      setBRawText("");
      const [bRes, discRes] = await Promise.all([
        apiFetch<any>("/api/bulletins"),
        adminFetch<any>("/api/admin/bulletins/discover").catch(() => null),
      ]);
      if (bRes?.bulletins) setBulletinsList(bRes.bulletins);
      if (discRes?.candidates) setDiscoveredBulletins(discRes.candidates);
    } catch (err: any) {
      setBulletinMsg(`Yayınlama hatası: ${err.message}`);
    } finally {
      setPublishingBulletin(false);
    }
  };

  const handleDeleteBulletin = async (id: number) => {
    await adminFetch(`/api/admin/bulletins/${id}`, { method: "DELETE" });
    const bRes = await apiFetch<any>("/api/bulletins");
    if (bRes?.bulletins) setBulletinsList(bRes.bulletins);
  };

  // --- GÖREV 4: Tekil Fon Ekleme, Rastgele 5 Yeni Fon Keşfetme & CSV Yükleme ---
  const handleAddFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newFundCode.trim().toUpperCase();
    if (!code) return;
    setAddingFund(true);
    setFundActionMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/funds/add", {
        method: "POST",
        body: JSON.stringify({
          fund_code: code,
          fund_type: newFundType,
          total_days: 365,
        }),
      });
      setFundActionMsg(
        `[${res.fund_code}] ${res.fund_title || ""} fonu eklendi ve ${res.total_db_days} günlük gerçek TEFAS verisi kaydedildi!`
      );
      setNewFundCode("");
      const [fRes, sRes] = await Promise.all([
        apiFetch<any>("/api/funds"),
        apiFetch<any>("/api/public/sync-status"),
      ]);
      if (fRes?.funds) setFundsList(fRes.funds);
      if (sRes) setSyncData(sRes);
      window.dispatchEvent(new Event("branding-updated"));
    } catch (err: any) {
      setFundActionMsg(`Fon ekleme hatası: ${err.message}`);
    } finally {
      setAddingFund(false);
    }
  };

  const handleAddRandomFiveFunds = async () => {
    setAddingRandomFive(true);
    setFundActionMsg(null);
    setRandomFiveReport(null);
    try {
      const res = await adminFetch<any>("/api/admin/funds/add-random-five", {
        method: "POST",
      });
      setRandomFiveReport(res);
      const summaryText = (res.added_funds || [])
        .map((x: any) => `${x.fund_code} (${x.trading_days_count} işlem günü)`)
        .join(", ");
      setFundActionMsg(
        `Keşif havuzundan 5 yeni gerçek TEFAS fonu başarıyla eklendi: ${summaryText}. Toplam ${res.total_records_saved} yeni günlük fiyat kaydı veritabanına işlendi!`
      );
      const [fRes, sRes, bRes] = await Promise.all([
        apiFetch<any>("/api/funds"),
        apiFetch<any>("/api/public/sync-status"),
        apiFetch<any>("/api/bulletins"),
      ]);
      if (fRes?.funds) setFundsList(fRes.funds);
      if (sRes) setSyncData(sRes);
      if (bRes?.bulletins) setBulletinsList(bRes.bulletins);
      window.dispatchEvent(new Event("branding-updated"));
    } catch (err: any) {
      setFundActionMsg(`Rastgele 5 fon keşif hatası: ${err.message}`);
    } finally {
      setAddingRandomFive(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCsv(true);
    setFundActionMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminFetch<any>(
        `/api/admin/funds/upload-csv?default_fund_type=${encodeURIComponent(
          newFundType
        )}`,
        {
          method: "POST",
          body: fd,
        }
      );
      setFundActionMsg(
        `CSV başarıyla içe aktarıldı: ${res.funds_imported?.join(", ")} (${res.saved_count} kayıt).`
      );
      const fRes = await apiFetch<any>("/api/funds");
      if (fRes?.funds) setFundsList(fRes.funds);
    } catch (err: any) {
      setFundActionMsg(`CSV yükleme hatası: ${err.message}`);
    } finally {
      setUploadingCsv(false);
    }
  };

  // --- GÖREV 6: TÜBİTAK Araştırma Kaydı Ekleme & CSV / Excel İndirme ---
  const handleAddResearchRow = async (e: React.FormEvent) => {
    e.preventDefault();
    setResearchFeedback(null);
    await adminFetch("/api/admin/research/log", {
      method: "POST",
      body: JSON.stringify({
        participant_code: rParticipant,
        module_code: rModule,
        action_type: rAction,
        fund_or_topic: rTopic,
        duration_sec: rDuration,
        trust_score_pre: rPreScore,
        trust_score_post: rPostScore,
        notes:
          rNotes ||
          "Katılımcı ön-test ve son-test değerlendirmesi tamamlandı.",
      }),
    });
    setRNotes("");
    setResearchFeedback(
      `${rParticipant} kodlu katılımcının Ön-Test (${rPreScore}) / Son-Test (${rPostScore}) araştırma verisi SQLite 'research_logs' tablosuna kaydedildi.`
    );
    const rRes = await adminFetch<any>("/api/admin/research/metrics");
    setResearchData(rRes);
  };

  const handleDownloadResearchCsv = () => {
    const token = getAdminToken() || "";
    window.open(
      `${API_BASE_URL}/api/admin/research/export-csv?token=${encodeURIComponent(
        token
      )}`,
      "_blank"
    );
  };

  const handleDownloadResearchXlsx = () => {
    const token = getAdminToken() || "";
    window.open(
      `${API_BASE_URL}/api/admin/research/export-xlsx?token=${encodeURIComponent(
        token
      )}`,
      "_blank"
    );
  };

  if (!authChecked) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
        Yönetici oturumu doğrulanıyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Yönetici Başlığı & Sekmeler */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              TÜBİTAK 2209-A • Tam Yetkili Yönetici Kontrol Merkezi (Admin Hub)
            </span>
            <h2 className="text-xl font-bold">
              Sistem, Otomatik Senkronizasyon, Bülten Keşif ve Araştırma Yönetimi
            </h2>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 self-start"
          >
            <LogOut className="w-3.5 h-3.5" />
            Oturumu Kapat
          </button>
        </div>

        {/* 5 Sekme Menüsü */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            {
              key: "overview" as AdminTabKey,
              label: "1. Genel Durum & Senkronizasyon",
              icon: RefreshCw,
            },
            {
              key: "branding" as AdminTabKey,
              label: "2. Site Ayarları, Karşılama Ekranı & Söz Yönetimi",
              icon: Settings,
            },
            {
              key: "bulletins" as AdminTabKey,
              label: "3. Bülten Keşfet & PDF Giriş Merkezi",
              icon: FileText,
            },
            {
              key: "funds" as AdminTabKey,
              label: "4. TEFAS Fon Havuzu & Rastgele 5 Fon Keşfet",
              icon: Database,
            },
            {
              key: "research" as AdminTabKey,
              label: "5. TÜBİTAK 2209-A Araştırma & Metodoloji",
              icon: GraduationCap,
            },
            {
              key: "legal" as AdminTabKey,
              label: "6. Yasal Metinler & Sözleşmeler",
              icon: Scale,
            },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEKME 1: GENEL DURUM & APSCHEDULER SENKRONİZASYON */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>APScheduler Zamanlayıcı Durumu</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {syncData?.scheduler?.active
                  ? "AKTİF (Arka Planda Çalışıyor)"
                  : "PASİF"}
              </div>
              <div className="text-[11px] text-slate-500">
                Kural: {syncData?.scheduler?.cron_schedule}
              </div>
              {syncData?.scheduler?.next_scheduled_run && (
                <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                  Sonraki Çalışma: {syncData.scheduler.next_scheduled_run}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>TEFAS Veritabanı Kapsamı</span>
                <Database className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-bold">
                {syncData?.database_state?.tracked_funds_count || 0} Fon •{" "}
                {Number(
                  syncData?.database_state?.total_price_records || 0
                ).toLocaleString("tr-TR")}{" "}
                Kayıt
              </div>
              <div className="text-[11px] text-slate-500">
                Tarih Aralığı: {syncData?.database_state?.oldest_price_date}{" "}
                &rarr;{" "}
                <strong>{syncData?.database_state?.latest_price_date}</strong>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">
                  Anlık Manuel TEFAS Güncelleme
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Tüm fonların en son fiyat tarihini kontrol et ve eksik işlem
                  günlerini TEFAS&apos;tan hemen indir:
                </div>
              </div>
              <button
                onClick={handleManualSync}
                disabled={syncingNow}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncingNow ? "animate-spin" : ""}`}
                />
                {syncingNow
                  ? "TEFAS Sorgulanıyor..."
                  : "Tüm Fonları Şimdi Güncelle"}
              </button>
            </div>
          </div>

          {syncFeedback && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Senkronizasyon Log Tablosu (sync_logs) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold">
              Otomatik ve Manuel TEFAS Senkronizasyon Günlüğü (`sync_logs`)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-3">Log ID</th>
                    <th className="py-2 px-3">Tetikleyici Türü</th>
                    <th className="py-2 px-3">Durum</th>
                    <th className="py-2 px-3">Detay ve Rapor Özeti</th>
                    <th className="py-2 pl-3 text-right">Tarih / Saat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {syncData?.recent_sync_logs?.map((log: any) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-3 font-mono font-bold">
                        #{log.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400">
                        {log.sync_type}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            log.status === "ERROR"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {log.details_parsed?.message || log.details}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono text-slate-500">
                        {log.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 2: SİTE AYARLARI, LOGO & KARŞILAMA EKRANI / SÖZ YÖNETİMİ */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div>
              <h3 className="text-base font-bold">
                Site Kimliği, Başlık, Alt Başlık ve Logo Yönetimi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Burada yaptığınız değişiklikler `system_settings` tablosuna
                kaydedilir ve sol üst Sidebar ile üst Header çubuğunda anında
                güncellenir.
              </p>
            </div>

            {brandingMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                {brandingMsg}
              </div>
            )}

            <form onSubmit={handleSaveBranding} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Site Ana Başlığı (`site_title`):
                </label>
                <input
                  type="text"
                  required
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Site Alt Başlığı (`site_subtitle`):
                </label>
                <input
                  type="text"
                  required
                  value={siteSubtitle}
                  onChange={(e) => setSiteSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold">
                  Site Logosu (`.png`, `.jpg`, `.svg` — Boş bırakılırsa varsayılan
                  &apos;FG&apos; rozeti gösterilir):
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold cursor-pointer inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>
                      {uploadingLogo
                        ? "Yükleniyor..."
                        : "Bilgisayardan Logo Seç & Yükle"}
                    </span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.webp"
                      onChange={handleUploadLogo}
                      className="hidden"
                    />
                  </label>

                  {siteLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setSiteLogoUrl("")}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Logoyu Kaldır (&apos;FG&apos; Rozetine Dön)
                    </button>
                  )}
                </div>
                {siteLogoUrl && (
                  <div className="text-xs text-slate-500 font-mono">
                    Aktif Logo URL: {siteLogoUrl}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                Ayarları Kaydet ve Sitede Güncelle
              </button>
            </form>
          </div>

          {/* GÖREV 3: KARŞILAMA EKRANI (SPLASH SCREEN) & MOTİVE EDİCİ SÖZ YÖNETİMİ */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Karşılama Ekranı & Söz Yönetimi (Splash / Loading Screen)
                </div>
                <h3 className="text-base font-bold">
                  Site Açılış Ekranı, Gösterim Süresi ve Motive Edici Finans Sözleri
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kullanıcılar platformu ilk açtığında gösterilen karşılama ekranını açıp kapatabilir, ekranda kalma süresini ayarlayabilir ve ilham verici sözleri yönetebilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePreviewSplash}
                className="px-4 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 self-start shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Karşılama Ekranını Şimdi Önizle
              </button>
            </div>

            {splashMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{splashMsg}</span>
              </div>
            )}

            {/* 1. Açık/Kapalı Şalteri ve Gösterim Süresi Ayarı */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Açık / Kapalı Toggle */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Karşılama Ekranı Durumu (`splash_enabled`)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {splashEnabled
                      ? "Aktif — Site ilk açıldığında karşılama ekranı gösterilir."
                      : "Kapalı — Kullanıcılar doğrudan ana sayfaya yönlendirilir."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSplashEnabled((prev) => !prev)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                    splashEnabled
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {splashEnabled ? "AÇIK (Aktif)" : "KAPALI (Pasif)"}
                </button>
              </div>

              {/* Gösterim Süresi Ayarı */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Gösterim Süresi (`splash_duration_ms`)
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {(splashDurationMs / 1000).toFixed(1)} saniye ({splashDurationMs} ms)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: "1.5 sn (Hızlı)", ms: 1500 },
                    { label: "2.2 sn (Varsayılan)", ms: 2200 },
                    { label: "3.0 sn (Uzun)", ms: 3000 },
                    { label: "4.0 sn (Sunum)", ms: 4000 },
                  ].map((preset) => (
                    <button
                      key={preset.ms}
                      type="button"
                      onClick={() => setSplashDurationMs(preset.ms)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        splashDurationMs === preset.ms
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={500}
                    max={10000}
                    step={100}
                    value={splashDurationMs}
                    onChange={(e) =>
                      setSplashDurationMs(
                        Math.max(500, Math.min(10000, Number(e.target.value) || 2200))
                      )
                    }
                    className="w-24 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. Yeni Söz Ekle Kutusu */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                Yeni Motive Edici / İlham Verici Söz Ekle:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddQuote();
                    }
                  }}
                  placeholder="Örn: Uzun vadeli finansal güven, şeffaf veri ve sabırlı stratejiyle kurulur."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddQuote}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Söz Ekle
                </button>
              </div>
            </div>

            {/* 3. Mevcut Motive Edici Sözler Tablosu / Kartları */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kayıtlı Motive Edici Sözler Listesi ({splashQuotes.length} Adet)
                </span>
                <span className="text-[11px] text-slate-500">
                  Her açılışta bu listeden rastgele bir söz seçilerek gösterilir.
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {splashQuotes.map((quote, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    {editingQuoteIdx === idx ? (
                      <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={editingQuoteText}
                          onChange={(e) => setEditingQuoteText(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-blue-400 dark:border-blue-600 bg-slate-50 dark:bg-slate-800 text-xs"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEditedQuote(idx)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                          >
                            Tamam
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuoteIdx(null);
                              setEditingQuoteText("");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[11px] shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="italic font-medium leading-relaxed">
                            “{quote}”
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleStartEditQuote(idx)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-400"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuote(idx)}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Sil
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Değişiklikleri Kaydet Butonu */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500">
                Kaydettiğinizde ayarlar SQLite `system_settings` tablosuna işlenir ve `/api/public/splash-settings` üzerinden tüm kullanıcılarda anında aktif olur.
              </span>
              <button
                type="button"
                onClick={handleSaveSplashSettings}
                disabled={savingSplash}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {savingSplash
                  ? "Kaydediliyor..."
                  : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 3: OTOMATİK BÜLTEN KEŞFET, KILAVUZ VE PDF GİRİŞ MERKEZİ (GÖREV 5) */}
      {activeTab === "bulletins" && (
        <div className="space-y-6">
          {/* 1. BÖLÜM: Nasıl Bülten Girilir? (Adım Adım Kılavuz Kutusu — GÖREV 5.2) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-blue-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Nasıl Bülten Girilir? (Resmi Kaynak, Kategori ve Kanıt Ayrımı Kılavuzu)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    SPK duyuruları, KAP bildirimleri ve Aylık PYŞ Bültenlerinin
                    platforma eklenme standartları
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulletinGuide(!showBulletinGuide)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1"
              >
                {showBulletinGuide ? (
                  <>
                    Kılavuzu Gizle <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Kılavuzu Aç <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {showBulletinGuide && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-blue-200/60 dark:border-slate-800 text-xs">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-blue-700 dark:text-blue-400">
                    1. Resmi Belgeler Nereden Bulunur?
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                    <li>
                      <strong>KAP Fon Bildirimleri (`kap.org.tr`):</strong> Her
                      fonun aylık <em>Portföy Dağılım Raporu</em>,{" "}
                      <em>İzahname</em> ve <em>Yatırımcı Bilgi Formu (YBF)</em>{" "}
                      ay sonunu izleyen 6 iş günü içinde KAP&apos;ta yayımlanır.
                    </li>
                    <li>
                      <strong>SPK Bültenleri (`spk.gov.tr`):</strong> III-52.1
                      Tebliği değişiklikleri, Toplam Gider Oranı (TGO) sınırları
                      ve düzenleyici duyurular SPK Haftalık Bültenlerinde yer
                      alır.
                    </li>
                    <li>
                      <strong>TEFAS Resmi Verileri (`tefas.gov.tr`):</strong>{" "}
                      Günlük birim pay fiyatı, portföy büyüklüğü ve yatırımcı
                      sayısı değişimleri doğrudan TEFAS veritabanımızdan
                      çekilir.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-indigo-700 dark:text-indigo-400">
                    2. Hangi Kategori Ne Anlama Gelir?
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                    <li>
                      <strong>`FON_SEKTOR_BULTENI`:</strong> Portföy yönetim
                      şirketlerinin (PYŞ) aylık fon performans, varlık dağılımı
                      ve piyasa değerlendirme bültenleri.
                    </li>
                    <li>
                      <strong>`RESMI_DUYURU`:</strong> SPK bültenleri, Takasbank
                      / MKK saklama duyuruları ve resmi KAP özel durum
                      açıklamaları.
                    </li>
                    <li>
                      <strong>`KURUCU_BELGESI`:</strong> Fonun hukuki anayasası
                      olan <em>İzahname</em> ve özet kimlik belgesi olan{" "}
                      <em>Yatırımcı Bilgi Formu (YBF)</em>.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">
                    3. &ldquo;Kesin Veri vs. Şirket Yorumu&rdquo; Ayrımı Nedir?
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Bireysel yatırımcıyı pazarlama dilinden korumak için her
                    bültende şu iki bilgi kesin olarak ayrıştırılır:
                  </p>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
                    <li>
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        `KESİN_VERİ` (`verified_facts`):
                      </strong>{" "}
                      Denetlenmiş, resmi ve sayısal gerçekler (Örn:{" "}
                      <em>
                        &ldquo;Ekim sonu birim pay fiyatı 0,9067 TL, risk değeri
                        6/7&apos;dir&rdquo;
                      </em>
                      ).
                    </li>
                    <li>
                      <strong className="text-purple-700 dark:text-purple-400">
                        `YORUM_BEKLENTİ` (`opinions_and_forecasts`):
                      </strong>{" "}
                      Kurumun geleceğe dönük tahmini (Örn:{" "}
                      <em>
                        &ldquo;Yılın son çeyreğinde teknoloji hisselerinde
                        yükseliş bekliyoruz&rdquo;
                      </em>
                      ).
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* 2. BÖLÜM: Otomatik Bülten & Bildirim Tarayıcı (Bülten Keşfet Paneli — GÖREV 5.1) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 mb-1">
                  <Compass className="w-3.5 h-3.5" />
                  Canlı Veritabanı, KAP & SPK Tarama Motoru
                </span>
                <h3 className="text-base font-bold">
                  Otomatik Bülten & Bildirim Tarayıcı (Yayına Hazır Bülten Adaylarını Keşfet)
                </h3>
                <p className="text-xs text-slate-500">
                  Veritabanımızdaki fonların en güncel TEFAS performans, portföy
                  büyüklüğü ve yatırımcı değişimleri ile SPK/Takasbank
                  duyurularından otomatik oluşturulan adaylar:
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshDiscovery}
                disabled={loadingDiscovery}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loadingDiscovery ? "animate-spin" : ""
                  }`}
                />
                {loadingDiscovery
                  ? "Taranıyor..."
                  : "Bülten Adaylarını Yeniden Tara"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {discoveredBulletins.map((cand: any) => (
                <div
                  key={cand.candidate_id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        {cand.fund_code ? `FON: ${cand.fund_code}` : "GENEL DUYURU"}{" "}
                        • {cand.doc_type}
                      </span>
                      {cand.already_published ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Yayında Mevcut
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Yeni Aday (Yayına Hazır)
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                      {cand.title}
                    </div>
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      {cand.discovery_reason}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Kurum: {cand.source_institution} • Dönem:{" "}
                      {cand.period_covered}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700">
                    <a
                      href={cand.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
                    >
                      Resmi Link <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleApplyCandidateToForm(cand)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Bülteni Forma Aktar & Özeti Oluştur
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. BÖLÜM: Detaylı Bülten & PDF Belge Giriş ve 7 Başlıklı Düzenleme Formu */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold">
                Detaylı Bülten, KAP Bildirimi ve PDF Belge Giriş Formu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Yukarıdaki otomatik adaylardan birini aktarabilir, PDF
                yükleyebilir veya doğrudan metin girerek{" "}
                <strong>7 Zorunlu Başlıklı</strong> taslak özet oluşturup yayına
                alabilirsiniz.
              </p>
            </div>

            {bulletinMsg && (
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 font-medium">
                {bulletinMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Fon Kodu (Genel ise boş):
                </label>
                <select
                  value={bFundCode}
                  onChange={(e) => setBFundCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="">Genel Sektör / SPK Duyurusu</option>
                  {fundsList.map((f: any) => (
                    <option key={f.fund_code} value={f.fund_code}>
                      {f.fund_code} — {f.fund_title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Kategori:</label>
                <select
                  value={bCategory}
                  onChange={(e) => setBCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="FON_SEKTOR_BULTENI">FON_SEKTOR_BULTENI</option>
                  <option value="RESMI_DUYURU">RESMI_DUYURU</option>
                  <option value="KURUCU_BELGESI">KURUCU_BELGESI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Belge Türü:
                </label>
                <select
                  value={bDocType}
                  onChange={(e) => setBDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="AYLIK_FON_BULTENI">AYLIK_FON_BULTENI</option>
                  <option value="KAP_BILDIRIMI">KAP_BILDIRIMI</option>
                  <option value="SPK_BULTENI">SPK_BULTENI</option>
                  <option value="YATIRIMCI_BILGI_FORMU">
                    YATIRIMCI_BILGI_FORMU
                  </option>
                  <option value="IZAHNAME">IZAHNAME</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Kaynak Rozeti:
                </label>
                <select
                  value={bOriginBadge}
                  onChange={(e) => setBOriginBadge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="RESMI_BELGE_OZETI">RESMI_BELGE_OZETI</option>
                  <option value="DUZENLEYICI_DUYURU">DUZENLEYICI_DUYURU</option>
                  <option value="SEKTOR_RAPORU">SEKTOR_RAPORU</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Bülten Başlığı:
                </label>
                <input
                  type="text"
                  placeholder="Örn: AFT — 2026 Ekim Dönemi Portföy Dağılım ve Performans Raporu"
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Kaynak Kurum (SPK, KAP, PYŞ vb.):
                </label>
                <input
                  type="text"
                  value={bSourceInst}
                  onChange={(e) => setBSourceInst(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Kapsadığı Dönem (Örn: 2026-10, 2026-Q3):
                </label>
                <input
                  type="text"
                  value={bPeriod}
                  onChange={(e) => setBPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  Yayın Tarihi:
                </label>
                <input
                  type="date"
                  value={bPublishDate}
                  onChange={(e) => setBPublishDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  Orijinal Belge Bağlantısı (URL):
                </label>
                <input
                  type="url"
                  value={bOriginalUrl}
                  onChange={(e) => setBOriginalUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            {/* PDF Yükleme veya Doğrudan Metin Girişi */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold">
                  Belge İçeriği (PDF&apos;ten Otomatik Ayrıştır veya Doğrudan
                  Metin Gir):
                </label>
                <label className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {extractingPdf
                      ? "PDF Ayrıştırılıyor..."
                      : "PDF Belge Yükle (.pdf)"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={5}
                placeholder="[Sayfa 1] ÖZET: Belge özeti...&#10;[Sayfa 1] KESİN_VERİ: Dönem sonu birim pay fiyatı...&#10;[Sayfa 2] YORUM_BEKLENTİ: Portföy yönetimi beklentisi..."
                value={bRawText}
                onChange={(e) => setBRawText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateDraft}
              disabled={generatingDraft}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {generatingDraft
                ? "7 Başlıklı Taslak Üretiliyor..."
                : "Taslak Özet Oluştur (7 Zorunlu Başlık)"}
            </button>

            {/* 7 Zorunlu Başlıklı Taslak İnceleme & Düzenleme (Review & Edit) */}
            {draftSummary && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-indigo-500/50 space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    Taslak İnceleme ve Düzenleme Paneli (7 Zorunlu Başlık)
                  </h4>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200">
                    Yayına Hazır
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    1. Belge Özeti (`document_overview`):
                  </label>
                  <textarea
                    rows={2}
                    value={draftSummary.document_overview || ""}
                    onChange={(e) =>
                      setDraftSummary({
                        ...draftSummary,
                        document_overview: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    2. Önemli Gelişmeler (`key_developments` — her satır bir
                    madde):
                  </label>
                  <textarea
                    rows={3}
                    value={(draftSummary.key_developments || []).join("\n")}
                    onChange={(e) =>
                      setDraftSummary({
                        ...draftSummary,
                        key_developments: e.target.value
                          .split("\n")
                          .filter(Boolean),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    3. Yatırımcı Açısından Etkisi (`investor_impact`):
                  </label>
                  <textarea
                    rows={2}
                    value={draftSummary.investor_impact || ""}
                    onChange={(e) =>
                      setDraftSummary({
                        ...draftSummary,
                        investor_impact: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                      5A. Kesin Resmi Veriler (`verified_facts` — her satır bir
                      veri):
                    </label>
                    <textarea
                      rows={4}
                      value={(
                        draftSummary.facts_vs_interpretations?.verified_facts ||
                        []
                      ).join("\n")}
                      onChange={(e) =>
                        setDraftSummary({
                          ...draftSummary,
                          facts_vs_interpretations: {
                            ...draftSummary.facts_vs_interpretations,
                            verified_facts: e.target.value
                              .split("\n")
                              .filter(Boolean),
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 mb-1">
                      5B. Kurum / Yönetici Yorumları (`opinions_and_forecasts`):
                    </label>
                    <textarea
                      rows={4}
                      value={(
                        draftSummary.facts_vs_interpretations
                          ?.opinions_and_forecasts || []
                      ).join("\n")}
                      onChange={(e) =>
                        setDraftSummary({
                          ...draftSummary,
                          facts_vs_interpretations: {
                            ...draftSummary.facts_vs_interpretations,
                            opinions_and_forecasts: e.target.value
                              .split("\n")
                              .filter(Boolean),
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    6. Belirsizlikler ve Eksik Noktalar (`uncertainties_and_gaps`):
                  </label>
                  <textarea
                    rows={2}
                    value={(draftSummary.uncertainties_and_gaps || []).join(
                      "\n"
                    )}
                    onChange={(e) =>
                      setDraftSummary({
                        ...draftSummary,
                        uncertainties_and_gaps: e.target.value
                          .split("\n")
                          .filter(Boolean),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePublishBulletin}
                  disabled={publishingBulletin}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {publishingBulletin
                    ? "Yayına Alınıyor..."
                    : "Onayla ve Yayına Al"}
                </button>
              </div>
            )}
          </div>

          {/* Mevcut Bültenler Listesi */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base font-bold">
              Yayındaki Bültenler ve Resmi Raporlar ({bulletinsList.length} Kayıt)
            </h3>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {bulletinsList.map((b: any) => (
                <div
                  key={b.id}
                  className="py-2.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">
                      #{b.id} [{b.fund_code || "GENEL"}]
                    </span>
                    <span className="font-semibold">{b.title}</span>
                    <span className="text-slate-400 ml-2">
                      ({b.period_covered} • {b.publish_date})
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteBulletin(b.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                    title="Bülteni Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKME 4: TEFAS FON HAVUZU VE RASTGELE 5 YENİ FON KEŞFETME (GÖREV 4) */}
      {activeTab === "funds" && (
        <div className="space-y-6">
          {/* GÖREV 4: Rastgele 5 Yeni TEFAS Fonu Keşfet ve Ekle Kartı */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-700 to-slate-900 text-white shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25">
                  <Shuffle className="w-3.5 h-3.5" />
                  Otomatik TEFAS Fon Keşif Motoru (65+ Gerçek TEFAS Fon Havuzu)
                </span>
                <h3 className="text-lg sm:text-xl font-bold">
                  Rastgele 5 Yeni TEFAS Fonu Keşfet ve 1 Yıllık Verisini Çek
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 max-w-3xl">
                  Keşif havuzumuzda (`TEFAS_DISCOVERY_POOL`) bulunan ancak henüz
                  SQLite veritabanımıza eklenmemiş gerçek TEFAS fonları
                  arasından rastgele 5 tanesini seçer ve son 365 günlük gerçek
                  tarihsel fiyat, yatırımcı sayısı ve portföy büyüklüğü
                  verilerini TEFAS API&apos;den çekerek kaydeder.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRandomFiveFunds}
                disabled={addingRandomFive}
                className="px-5 py-3 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md shrink-0 transition-colors"
              >
                <Shuffle
                  className={`w-4 h-4 ${
                    addingRandomFive ? "animate-spin" : ""
                  }`}
                />
                {addingRandomFive
                  ? "5 Yeni Fon TEFAS'tan Çekiliyor..."
                  : "Rastgele 5 Yeni TEFAS Fonu Ekle (1 Yıllık Veri Çek)"}
              </button>
            </div>

            {randomFiveReport?.added_funds && (
              <div className="p-4 rounded-xl bg-white/10 border border-white/20 space-y-2.5 text-xs">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    Yeni Keşfedilen ve Veritabanına Eklenen 5 TEFAS Fonu (Toplam{" "}
                    {randomFiveReport.total_records_saved} Yeni İşlem Günü
                    Kaydı):
                  </span>
                  <span className="text-blue-200">
                    Kalan Keşif Havuzu:{" "}
                    {randomFiveReport.remaining_discovery_pool_count} Fon
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {randomFiveReport.added_funds.map((af: any) => (
                    <div
                      key={af.fund_code}
                      className="p-3 rounded-xl bg-slate-900/70 border border-white/15 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-amber-300">
                          {af.fund_code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-mono">
                          {af.trading_days_count} gün
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-white truncate">
                        {af.fund_title}
                      </div>
                      <div className="text-[10px] text-blue-200 truncate">
                        {af.fund_type}
                      </div>
                      <div className="text-[10px] font-mono text-slate-300">
                        {af.oldest_date} &rarr; {af.newest_date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Tekil Yeni Fon Ekleme */}
            <form
              onSubmit={handleAddFund}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Belirli Bir TEFAS Fon Kodunu Ekle (1 Yıllık Veri Çek)
              </h3>
              <p className="text-xs text-slate-500">
                İstediğiniz 3 harfli fon kodunu (örn: `TTE`, `BUY`, `HKH`,
                `OJT`) girin; arka planda `fetch_tefas_history_chunked` ile son
                365 günün gerçek TEFAS verisi indirilir.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  maxLength={5}
                  required
                  placeholder="Fon Kodu (Örn: TTE)"
                  value={newFundCode}
                  onChange={(e) => setNewFundCode(e.target.value.toUpperCase())}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase"
                />
                <select
                  value={newFundType}
                  onChange={(e) => setNewFundType(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="Hisse Senedi Yoğun Fon">
                    Hisse Senedi Yoğun Fon
                  </option>
                  <option value="Yabancı Hisse / Teknoloji Fonu">
                    Yabancı Hisse / Teknoloji Fonu
                  </option>
                  <option value="Kıymetli Madenler / Altın Fonu">
                    Kıymetli Madenler / Altın Fonu
                  </option>
                  <option value="Para Piyasası (TL) Fonu">
                    Para Piyasası (TL) Fonu
                  </option>
                  <option value="Değişken / Çoklu Varlık Fonu">
                    Değişken / Çoklu Varlık Fonu
                  </option>
                  <option value="Katılım Fonu">Katılım Fonu</option>
                  <option value="Eurobond / Borçlanma Araçları Fonu">
                    Eurobond / Borçlanma Araçları Fonu
                  </option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addingFund}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                {addingFund
                  ? "TEFAS'tan 1 Yıllık Veri Çekiliyor..."
                  : "Fon Ekle ve 1 Yıllık Verisini Çek"}
              </button>
            </form>

            {/* 2. Resmi CSV Yükleme ve Manuel Senkronizasyon */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                Resmi TEFAS CSV / Excel İçe Aktarma & Manuel Senkronizasyon
              </h3>
              <p className="text-xs text-slate-500">
                TEFAS Tarihsel Veriler ekranından indirilen resmi CSV/Excel
                dosyasını seçerek veya anlık senkronizasyon butonuyla havuzu
                güncelleyebilirsiniz.
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="flex-1 py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>
                    {uploadingCsv
                      ? "CSV Aktarılıyor..."
                      : "Resmi TEFAS CSV / Excel Dosyası Seç"}
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncingNow}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncingNow ? "animate-spin" : ""}`}
                  />
                  Tüm Fonları Şimdi Güncelle
                </button>
              </div>
            </div>
          </div>

          {fundActionMsg && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 font-medium">
              {fundActionMsg}
            </div>
          )}

          {/* Mevcut Fon Havuzu Tablosu */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base font-bold">
              Aktif TEFAS Fon Havuzu ({fundsList.length} Yatırım Fonu)
            </h3>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-3">Kod</th>
                    <th className="py-2 px-3">Resmi TEFAS Fon Ünvanı</th>
                    <th className="py-2 px-3">Kategori</th>
                    <th className="py-2 px-3 text-right">İşlem Günü</th>
                    <th className="py-2 px-3 text-right">İlk Tarih</th>
                    <th className="py-2 px-3 text-right">Son Tarih</th>
                    <th className="py-2 pl-3 text-right">Son Fiyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {fundsList.map((f: any) => (
                    <tr key={f.fund_code}>
                      <td className="py-2.5 pr-3 font-bold text-blue-600 dark:text-blue-400">
                        {f.fund_code}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {f.fund_title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {f.fund_type}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {f.total_days} gün
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {f.oldest?.date || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {f.newest?.date || "-"}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono font-bold">
                        {formatNumberTR(f.newest?.price, 6)} TL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 5: TÜBİTAK 2209-A ARAŞTIRMA KILAVUZU, VERİ METODOLOJİSİ VE DIŞA AKTARMA (GÖREV 6) */}
      {activeTab === "research" && (
        <div className="space-y-6">
          {/* Üst Başlık ve İndirme Butonları */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full mb-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                TÜBİTAK 2209-A Akademik Veri Toplama, Metodoloji ve İstatistik
                Merkezi
              </span>
              <h3 className="text-lg font-bold">
                Ön-Test / Müdahale / Son-Test Araştırma Metodolojisi ve Katılımcı
                Kayıtları
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Katılımcıların kanıt kartları, bültenler ve sanal sepet
                laboratuvarı etkileşim metrikleri ile Ön-Test / Son-Test güven
                skorları.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleDownloadResearchXlsx}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel Olarak İndir (.xlsx)
              </button>
              <button
                onClick={handleDownloadResearchCsv}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                SPSS / CSV Olarak İndir (.csv)
              </button>
            </div>
          </div>

          {/* GÖREV 6.1: TÜBİTAK 2209-A Kullanım ve Metodoloji Kılavuzu */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-emerald-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold">
                    TÜBİTAK 2209-A Bilimsel Araştırma Kılavuzu ve Veri Metodolojisi
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ön Test &rarr; Müdahale (Platform Deneyimi) &rarr; Son Test
                    Deneysel Kurgusu ve Değişkenlerin Akademik Anlamı
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResearchGuide(!showResearchGuide)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1"
              >
                {showResearchGuide ? (
                  <>
                    Rehberi Gizle <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Rehberi Aç <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {showResearchGuide && (
              <div className="space-y-5 pt-2 border-t border-emerald-200/60 dark:border-slate-800">
                {/* 3 Adımlı Deneysel Akış */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="font-bold text-blue-700 dark:text-blue-400">
                      Adım 1: Ön-Test (Pre-Test • 0-100 Puan)
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Katılımcıya platformu kullanmadan önce{" "}
                      <em>
                        &ldquo;Banka/PYŞ iflas ederse yatırım fonunuz ne olur?&rdquo;
                      </em>{" "}
                      ve{" "}
                      <em>
                        &ldquo;Fiyatı 1 TL olan fon, 1.000 TL olan fondan daha mı
                        ucuzdur?&rdquo;
                      </em>{" "}
                      gibi temel hukuki güvence ve finansal okuryazarlık soruları
                      yöneltilerek <strong>Ön-Test Güven/Bilgi Puanı</strong>{" "}
                      kaydedilir.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="font-bold text-indigo-700 dark:text-indigo-400">
                      Adım 2: Müdahale (Platform Etkileşimi)
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Katılımcı platformda <strong>15 Kanıt Kartını</strong>{" "}
                      (SPKn Md. 52-53 varlık ayrılığı),{" "}
                      <strong>7 Başlıklı Bülten Özetlerini</strong> (Kesin Veri
                      vs. Yorum ayrımı), <strong>100 Bazlı Performans Analizini</strong>{" "}
                      ve <strong>Sanal Sepet Laboratuvarını</strong> deneyimleyerek
                      resmi kaynaklarla etkileşime girer.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400">
                      Adım 3: Son-Test (Post-Test) & Hipotez Analizi
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Deneyim sonrasında katılımcının{" "}
                      <strong>Son-Test Puanı</strong> ölçülür. Ön-test ile
                      son-test arasındaki fark (`post - pre`), SPSS veya
                      Excel&apos;de <em>Bağımlı Örneklem t-Testi</em>{" "}
                      (Paired-Samples t-Test) / <em>Wilcoxon Testi</em> ile
                      analiz edilerek TÜBİTAK 2209-A sonuç raporuna aktarılır.
                    </p>
                  </div>
                </div>

                {/* Hangi Bilgi Neden Girilir / Toplanır? Tablosu */}
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
                    Hangi Bilgi Neden Girilir / Toplanır? (Değişken Tanım ve
                    Gerekçe Tablosu)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                          <th className="py-2.5 px-4 w-1/4">
                            Veri Alanı / Değişken
                          </th>
                          <th className="py-2.5 px-4 w-1/4">Ölçek / Format</th>
                          <th className="py-2.5 px-4">
                            Bilimsel Araştırmada Toplanma Amacı ve Hipotez
                            Karşılığı
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                            Katılımcı Kodu (Anonim ID)
                          </td>
                          <td className="py-3 px-4 font-mono">
                            Örn: K-2209-01, K-2209-02
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                            <strong>6698 Sayılı KVKK Uyumu ve Eşleştirme:</strong>{" "}
                            Katılımcıların ad, soyad veya TC kimlik numarası
                            gibi kişisel verileri asla tutulmaz. Anonim kod
                            sayesinde aynı bireyin <em>Ön-Test</em> ve{" "}
                            <em>Son-Test</em> skorları etik kurallara uygun
                            olarak eşleştirilir.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                            Ön Test / Son Test Puanları
                          </td>
                          <td className="py-3 px-4 font-mono">
                            0 – 100 Puan (Sürekli Değişken)
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                            <strong>
                              Hukuki Güvence ve Risk/Getiri Okuryazarlığı Ölçümü:
                            </strong>{" "}
                            Kullanıcının platformu kullanmadan önceki ve sonraki{" "}
                            <em>
                              &ldquo;Fon Hukuki Güvencesi (SPKn Md. 53 Varlık
                              Ayrılığı & Takasbank Saklama)&rdquo;
                            </em>{" "}
                            ve{" "}
                            <em>
                              &ldquo;100 Bazlı Birim Pay Fiyatı / Maksimum Düşüş
                              Okuryazarlığı&rdquo;
                            </em>{" "}
                            bilgisini nicel olarak ölçmek için girilir.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                            Modül Etkileşim Verileri & Süre
                          </td>
                          <td className="py-3 px-4 font-mono">
                            İncelenen Modül, Konu & Süre (sn)
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                            <strong>
                              Araştırma Hipotezini Doğrulama (Bağımsız Değişken):
                            </strong>{" "}
                            Katılımcının kaç kanıt kartı okuduğu, bülten
                            özetlerindeki <em>Kesin Veri vs. Yorum</em> ayrımını
                            inceleyip incelemediği ve sanal sepet kurup
                            kurmadığının güven artış puanı üzerindeki etkisini
                            (korelasyon / regresyon) kanıtlamak için kullanılır.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Özet KPI Kartları */}
          {researchData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">
                  Anonim Katılımcı & Etkileşim
                </div>
                <div className="text-xl font-bold mt-1">
                  {researchData.summary.unique_participants_count} Katılımcı (
                  {researchData.summary.total_interaction_records} Kayıt)
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">
                  Ön-Test Ortalama Güven Skoru
                </div>
                <div className="text-xl font-bold mt-1 font-mono">
                  {researchData.summary.avg_trust_score_pre_100} / 100
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">
                  Son-Test Ortalama Güven Skoru
                </div>
                <div className="text-xl font-bold mt-1 font-mono text-emerald-600">
                  {researchData.summary.avg_trust_score_post_100} / 100 (+
                  {researchData.summary.avg_trust_gain_points} Puan)
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">
                  Ortalama İnceleme Süresi
                </div>
                <div className="text-xl font-bold mt-1 font-mono">
                  {researchData.summary.avg_session_duration_sec} sn
                </div>
              </div>
            </div>
          )}

          {/* GÖREV 6.2: Araştırma Verisi Giriş Formu */}
          <form
            onSubmit={handleAddResearchRow}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div>
              <h4 className="text-sm font-bold">
                Yeni Katılımcı Test Sonucu ve Gözlem Kaydı Giriş Formu (`research_logs`)
              </h4>
              <p className="text-xs text-slate-500">
                Test yürütücüsü olarak katılımcının anonim kodunu, ön-test /
                son-test puanlarını, incelediği modülleri ve gözlem notunu
                buradan kaydedebilirsiniz.
              </p>
            </div>

            {researchFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                {researchFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1">
                  Anonim Katılımcı Kodu:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: K-2209-09"
                  value={rParticipant}
                  onChange={(e) => setRParticipant(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">
                  İncelenen Ana Modül / Odak Alanı:
                </label>
                <select
                  value={rModule}
                  onChange={(e) => setRModule(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="Fonlara Güven & Kanıt Merkezi">
                    Fonlara Güven & Kanıt Merkezi (15 Kanıt Kartı)
                  </option>
                  <option value="Fon Şeffaflık Kontrolü">
                    Fon Şeffaflık Kontrolü (Saklama & Valör)
                  </option>
                  <option value="Fon Bültenleri & Raporlar">
                    Fon Bültenleri & Raporlar (Kesin Veri vs Yorum)
                  </option>
                  <option value="Fon Performans Analizi">
                    Fon Performans Analizi (100 Bazlı Normalizasyon)
                  </option>
                  <option value="Sanal Sepet Laboratuvarı">
                    Sanal Sepet Laboratuvarı (Portföy Simülasyonu)
                  </option>
                  <option value="Tüm Platform Modülleri">
                    Tüm Platform Modülleri (Bütüncül Deneyim)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Etkileşim Türü:
                </label>
                <select
                  value={rAction}
                  onChange={(e) => setRAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="ON_TEST_SON_TEST_KARSILASTIRMA">
                    Ön-Test & Son-Test Tam Oturum
                  </option>
                  <option value="KANIT_KARTI_INCELEME">
                    15 Kanıt Kartı & Mevzuat Doğrulama
                  </option>
                  <option value="RESMI_VERI_YORUM_AYRIMI">
                    Bülten Özeti (Kesin Veri vs Yorum Ayrımı)
                  </option>
                  <option value="100_BAZLI_NORMALIZASYON">
                    100 Bazlı Performans & MDD Analizi
                  </option>
                  <option value="SANAL_SEPET_SIMULASYONU">
                    Sanal Sepet Kurulumu & Katkı Payı Testi
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Oturum Süresi (Saniye):
                </label>
                <input
                  type="number"
                  min={10}
                  value={rDuration}
                  onChange={(e) => setRDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1">
                  Ön-Test Puanı (0–100):
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={rPreScore}
                  onChange={(e) => setRPreScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-emerald-700 dark:text-emerald-400">
                  Son-Test Puanı (0–100):
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={rPostScore}
                  onChange={(e) => setRPostScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">
                  İncelenen Fonlar / Konu Başlığı:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: SPKn Md. 53 Varlık Ayrılığı, AFT vs TTA 100 Bazlı Kıyas"
                  value={rTopic}
                  onChange={(e) => setRTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 text-xs">
              <div className="flex-1">
                <label className="block font-bold mb-1">
                  Araştırmacı Gözlem Notu (`notes`):
                </label>
                <input
                  type="text"
                  placeholder="Örn: Katılımcı, banka iflasında fon malvarlığının haczedilemeyeceğini kanıt kartından doğruladı ve 40.000 TL sanal sepet kurdu."
                  value={rNotes}
                  onChange={(e) => setRNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                Katılımcı Test Kaydını Ekle
              </button>
            </div>
          </form>

          {/* Araştırma Verileri Tablosu */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">
                Kaydedilen Katılımcı Test ve Etkileşim Tablosu (
                {researchData?.logs?.length || 0} Kayıt)
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Tablo: SQLite `research_logs`
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-3">Katılımcı</th>
                    <th className="py-2 px-3">İncelenen Modül</th>
                    <th className="py-2 px-3">İncelenen Konu / Fon</th>
                    <th className="py-2 px-3 text-right">Süre (sn)</th>
                    <th className="py-2 px-3 text-right">Ön-Test</th>
                    <th className="py-2 px-3 text-right">Son-Test</th>
                    <th className="py-2 pl-3">Gözlem Notu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {researchData?.logs?.map((r: any) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {r.participant_code}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {r.module_code}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {r.fund_or_topic}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {r.duration_sec} sn
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {r.trust_score_pre}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {r.trust_score_post} (+
                        {(r.trust_score_post || 0) - (r.trust_score_pre || 0)})
                      </td>
                      <td className="py-2.5 pl-3 text-slate-500">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 6: YASAL METİNLER & SÖZLEŞMELER (SPK, KULLANIM KOŞULLARI, KVKK, TÜBİTAK ONAMI, METODOLOJİ — GÖREV 4) */}
      {activeTab === "legal" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-1.5">
                <Scale className="w-3.5 h-3.5" />
                SPK, 6362 Sayılı SPKn, 6698 Sayılı KVKK ve TÜBİTAK 2209-A Yasal Uyumluluk
              </div>
              <h3 className="text-base font-bold">
                Yasal Metinler, Feragatnameler ve Sözleşmeler Yönetimi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sitenin en altındaki Yasal Uyarı kutusunda (Footer) ve açılır sözleşme pencerelerinde (Modal) gösterilen 5 yasal metni kod değiştirmeden düzenleyip anında yayınlayabilirsiniz.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetLegalDefaults}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 self-start shrink-0"
            >
              Varsayılan Resmi Metinlere Sıfırla
            </button>
          </div>

          {legalMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{legalMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveLegalTexts} className="space-y-5">
            {/* 1. SPK Uyarısı */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                1. SPK Yasal Uyarı & Sorumluluk Reddi Metni (`legal_disclaimer_spk` — Footer&apos;da Sabit Gösterilir):
              </label>
              <textarea
                rows={4}
                required
                value={legalTexts.legal_disclaimer_spk}
                onChange={(e) =>
                  setLegalTexts((prev) => ({
                    ...prev,
                    legal_disclaimer_spk: e.target.value,
                  }))
                }
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed"
              />
            </div>

            {/* 2. Kullanım Koşulları */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                2. Kullanım Koşulları (`legal_terms_of_service` — Modal Penceresinde Gösterilir):
              </label>
              <textarea
                rows={6}
                required
                value={legalTexts.legal_terms_of_service}
                onChange={(e) =>
                  setLegalTexts((prev) => ({
                    ...prev,
                    legal_terms_of_service: e.target.value,
                  }))
                }
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed"
              />
            </div>

            {/* 3. KVKK ve Gizlilik Politikası */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                3. KVKK ve Gizlilik Politikası (`legal_privacy_kvkk` — 6698 Sayılı Kanun Uyumu Modalı):
              </label>
              <textarea
                rows={6}
                required
                value={legalTexts.legal_privacy_kvkk}
                onChange={(e) =>
                  setLegalTexts((prev) => ({
                    ...prev,
                    legal_privacy_kvkk: e.target.value,
                  }))
                }
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed"
              />
            </div>

            {/* 4. TÜBİTAK 2209-A Bilgilendirilmiş Onam Metni */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                4. TÜBİTAK 2209-A Bilgilendirilmiş Onam Metni (`legal_tubitak_consent` — Akademik Etik Modalı):
              </label>
              <textarea
                rows={6}
                required
                value={legalTexts.legal_tubitak_consent}
                onChange={(e) =>
                  setLegalTexts((prev) => ({
                    ...prev,
                    legal_tubitak_consent: e.target.value,
                  }))
                }
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed"
              />
            </div>

            {/* 5. Veri Metodolojisi & Şeffaflık Bildirimi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                5. Veri Metodolojisi & Şeffaflık Bildirimi (`legal_methodology` — Matematiksel Formüller Modalı):
              </label>
              <textarea
                rows={7}
                required
                value={legalTexts.legal_methodology}
                onChange={(e) =>
                  setLegalTexts((prev) => ({
                    ...prev,
                    legal_methodology: e.target.value,
                  }))
                }
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500">
                Kaydettiğinizde 5 yasal metin SQLite `system_settings` tablosuna işlenir ve `/api/public/legal-texts` üzerinden tüm ziyaretçilerde anında güncellenir.
              </span>
              <button
                type="submit"
                disabled={savingLegal}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {savingLegal ? "Kaydediliyor..." : "Kaydet ve Yayınla"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
