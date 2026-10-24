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
  Inbox,
  BarChart3,
  Eye,
  MailOpen,
  Mail,
  Activity,
  X,
  Monitor,
  Smartphone,
  Tablet,
  Search,
  Calculator,
  Globe2,
  TrendingUp,
  Users,
  Award,
  Megaphone,
  Save,
  UploadCloud,
  Check,
  Copy,
  Sliders,
  FileJson,
} from "lucide-react";
import {
  API_BASE_URL,
  adminFetch,
  apiFetch,
  clearAdminToken,
  getAdminToken,
  formatNumberTR,
  formatCurrencyTL,
} from "@/lib/api";
import { DEFAULT_LEGAL_TEXTS, LegalTextsMap } from "@/components/Footer";

export type AdminTabKey =
  | "overview"
  | "branding"
  | "bulletins"
  | "funds"
  | "research"
  | "survey"
  | "legal"
  | "inbox"
  | "telemetry"
  | "security";

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
  const [bFileData, setBFileData] = useState<string>("");
  const [bFileName, setBFileName] = useState<string>("");
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

  // BÖLÜM 2: Gelen Mesajlar (İletişim) state
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedMessageModal, setSelectedMessageModal] = useState<any | null>(
    null
  );
  const [inboxFeedback, setInboxFeedback] = useState<string | null>(null);

  // BÖLÜM 3: Platform İstatistikleri & Davranış Analizi (Telemetri) state
  const [telemetryData, setTelemetryData] = useState<any | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState<boolean>(false);

  // ANKET & AKADEMİK BULGULAR (TÜBİTAK 2209-A) state
  const [surveyAnalytics, setSurveyAnalytics] = useState<any | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<any[]>([]);
  const [loadingSurvey, setLoadingSurvey] = useState<boolean>(false);
  const [downloadingSurvey, setDownloadingSurvey] = useState<string | null>(null);
  const [copiedFinding, setCopiedFinding] = useState<number | null>(null);
  const [cleaningSurvey, setCleaningSurvey] = useState<boolean>(false);
  const [surveyCleanMsg, setSurveyCleanMsg] = useState<string | null>(null);

  // CANLI DUYURU BANDI & DİNAMİK EKONOMİK PARAMETRELER state
  const [announcementData, setAnnouncementData] = useState<any>({
    enabled: true,
    text: "🎓 TÜBİTAK 2209-A Finansal Okuryazarlık ve Fon Algı Anketi yayında! Testi çözün ve seviyenizi anında öğrenin.",
    badge: "TÜBİTAK 2209-A",
    bg_color: "indigo",
    link_url: "/survey",
  });
  const [savingAnnouncement, setSavingAnnouncement] = useState<boolean>(false);
  const [announcementMsg, setAnnouncementMsg] = useState<string | null>(null);

  const [economicData, setEconomicData] = useState<any>({
    annual_inflation_pct: 33.0,
    deposit_rate_pct: 40.0,
    default_stopaj_pct: 17.5,
    mgmt_fee_default_pct: 2.0,
  });
  const [savingEconomic, setSavingEconomic] = useState<boolean>(false);
  const [economicMsg, setEconomicMsg] = useState<string | null>(null);

  // SİSTEM SAĞLIĞI & FULL DB BACKUP / RESTORE state
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [downloadingDbBackup, setDownloadingDbBackup] = useState<boolean>(false);
  const [restoringDbBackup, setRestoringDbBackup] = useState<boolean>(false);
  const [backupRestoreMsg, setBackupRestoreMsg] = useState<string | null>(null);

  // SİBER GÜVENLİK & TRAFİK KALKANI state
  const [securityDashboard, setSecurityDashboard] = useState<any | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState<boolean>(false);
  const [securityFeedback, setSecurityFeedback] = useState<string | null>(null);

  const loadAllAdminData = async () => {
    try {
      await adminFetch("/api/admin/verify");
      setAuthChecked(true);
    } catch {
      router.replace("/admin/login");
      return;
    }

    const [
      syncRes,
      setRes,
      splashRes,
      legalRes,
      fRes,
      bRes,
      rRes,
      discRes,
      inboxRes,
      telemRes,
      surveyRes,
      surveyQRes,
      annRes,
      econRes,
      healthRes,
      secRes,
    ] = await Promise.all([
      apiFetch<any>("/api/public/sync-status").catch(() => null),
      apiFetch<any>("/api/public/settings").catch(() => null),
      apiFetch<any>("/api/public/splash-settings").catch(() => null),
      apiFetch<any>("/api/public/legal-texts").catch(() => null),
      apiFetch<any>("/api/funds").catch(() => null),
      apiFetch<any>("/api/bulletins").catch(() => null),
      adminFetch<any>("/api/admin/research/metrics").catch(() => null),
      adminFetch<any>("/api/admin/bulletins/discover").catch(() => null),
      adminFetch<any>("/api/admin/contact-messages").catch(() => null),
      adminFetch<any>("/api/admin/telemetry/dashboard").catch(() => null),
      apiFetch<any>("/api/survey/analytics").catch(() => null),
      apiFetch<any>("/api/survey/questions").catch(() => null),
      apiFetch<any>("/api/announcement").catch(() => null),
      apiFetch<any>("/api/settings/economic").catch(() => null),
      apiFetch<any>("/api/system/health-detail").catch(() => null),
      adminFetch<any>("/api/admin/security/dashboard").catch(() => null),
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
      if (
        Array.isArray(splashRes.splash_quotes) &&
        splashRes.splash_quotes.length > 0
      ) {
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
    if (inboxRes?.messages) {
      setContactMessages(inboxRes.messages);
      setUnreadCount(Number(inboxRes.unread_count || 0));
    }
    if (telemRes) setTelemetryData(telemRes);
    if (surveyRes) setSurveyAnalytics(surveyRes);
    if (surveyQRes?.questions) setSurveyQuestions(surveyQRes.questions);
    if (annRes) setAnnouncementData(annRes);
    if (econRes) setEconomicData(econRes);
    if (healthRes) setSystemHealth(healthRes);
    if (secRes) setSecurityDashboard(secRes);
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
    if (file.size > 1500 * 1024) {
      setBulletinMsg(
        `⚠️ PDF boyutu (${(file.size / (1024 * 1024)).toFixed(2)} MB) 1.5 MB (1500 KB) sınırını aşıyor! Neon 1 GB veritabanı kotasını korumak için lütfen yukarıdaki "🔗 Resmi KAP / TEFAS PDF Linki (Önerilen)" alanını kullanınız.`
      );
      e.target.value = "";
      return;
    }
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
      if (res.file_data) setBFileData(res.file_data);
      if (res.filename) setBFileName(res.filename);
      setBulletinMsg(
        `PDF başarıyla okundu ve Neon PostgreSQL için Base64 hazırlandı (${res.filename} • ${res.char_count} karakter sayfa etiketli metin ayrıştırıldı).`
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
          file_data: bFileData || null,
          file_name: bFileName || null,
        }),
      });
      setBulletinMsg(res.message);
      setDraftSummary(null);
      setBTitle("");
      setBRawText("");
      setBFileData("");
      setBFileName("");
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

  // --- BÖLÜM 2: Gelen Mesajlar (İletişim) İşlemleri ---
  const refreshInbox = async () => {
    const inboxRes = await adminFetch<any>("/api/admin/contact-messages").catch(
      () => null
    );
    if (inboxRes?.messages) {
      setContactMessages(inboxRes.messages);
      setUnreadCount(Number(inboxRes.unread_count || 0));
    }
  };

  const handleToggleMessageRead = async (msg: any) => {
    setInboxFeedback(null);
    const nextRead = !msg.is_read;
    try {
      await adminFetch(`/api/admin/contact-messages/${msg.id}/read`, {
        method: "PATCH",
        body: JSON.stringify({ is_read: nextRead }),
      });
      if (selectedMessageModal && selectedMessageModal.id === msg.id) {
        setSelectedMessageModal({ ...selectedMessageModal, is_read: nextRead });
      }
      await refreshInbox();
    } catch (err: any) {
      setInboxFeedback(`Durum güncellenemedi: ${err.message}`);
    }
  };

  const handleOpenMessageModal = async (msg: any) => {
    setSelectedMessageModal(msg);
    if (!msg.is_read) {
      try {
        await adminFetch(`/api/admin/contact-messages/${msg.id}/read`, {
          method: "PATCH",
          body: JSON.stringify({ is_read: true }),
        });
        setSelectedMessageModal({ ...msg, is_read: true });
        await refreshInbox();
      } catch {
        // ignore
      }
    }
  };

  const handleDeleteContactMessage = async (msgId: number) => {
    setInboxFeedback(null);
    try {
      await adminFetch(`/api/admin/contact-messages/${msgId}`, {
        method: "DELETE",
      });
      if (selectedMessageModal && selectedMessageModal.id === msgId) {
        setSelectedMessageModal(null);
      }
      setInboxFeedback(`#${msgId} numaralı iletişim mesajı kalıcı olarak silindi.`);
      await refreshInbox();
    } catch (err: any) {
      setInboxFeedback(`Silme hatası: ${err.message}`);
    }
  };

  // --- BÖLÜM 3: Telemetri ve Kullanıcı Davranış Analizi Yenileme ---
  const [downloadingExport, setDownloadingExport] = useState<string | null>(null);

  const handleRefreshTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const telemRes = await adminFetch<any>("/api/admin/telemetry/dashboard");
      if (telemRes) setTelemetryData(telemRes);
    } catch {
      // ignore
    } finally {
      setLoadingTelemetry(false);
    }
  };

  const handleDownloadExport = async (format: "xlsx" | "csv") => {
    setDownloadingExport(format);
    try {
      const token = getAdminToken() || "";
      const url = `${API_BASE_URL}/api/admin/telemetry/export?format=${format}&token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("İndirme başarısız (HTTP " + res.status + ")");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `tubitak2209a_telemetri_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      alert(`İndirme hatası: ${e.message}`);
    } finally {
      setDownloadingExport(null);
    }
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    setAnnouncementMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/announcement", {
        method: "POST",
        body: JSON.stringify(announcementData),
      });
      setAnnouncementData(res);
      setAnnouncementMsg("Duyuru bandı ayarları başarıyla kaydedildi.");
    } catch (e: any) {
      setAnnouncementMsg(`Hata: ${e.message}`);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleSaveEconomic = async () => {
    setSavingEconomic(true);
    setEconomicMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/settings/economic", {
        method: "POST",
        body: JSON.stringify(economicData),
      });
      setEconomicData(res);
      setEconomicMsg("Dinamik ekonomik parametreler başarıyla güncellendi.");
    } catch (e: any) {
      setEconomicMsg(`Hata: ${e.message}`);
    } finally {
      setSavingEconomic(false);
    }
  };

  const handleDownloadFullDbBackup = async () => {
    setDownloadingDbBackup(true);
    setBackupRestoreMsg(null);
    try {
      const token = getAdminToken() || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/system/backup?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error("Yedek indirme başarısız");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `fon_guven_tam_yedek_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      setBackupRestoreMsg("Tüm veritabanı (fonlar, fiyatlar, bültenler, mesajlar, anketler) başarıyla JSON olarak bilgisayarınıza indirildi.");
    } catch (e: any) {
      setBackupRestoreMsg(`Yedekleme hatası: ${e.message}`);
    } finally {
      setDownloadingDbBackup(false);
    }
  };

  const handleRestoreFullDbBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoringDbBackup(true);
    setBackupRestoreMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getAdminToken() || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/system/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      const data = await res.json();
      setBackupRestoreMsg(`Geri yükleme başarılı! Geri yüklenen tablolar: ${JSON.stringify(data.restored_tables)}`);
      await loadAllAdminData();
    } catch (e: any) {
      setBackupRestoreMsg(`Geri yükleme hatası: ${e.message}`);
    } finally {
      setRestoringDbBackup(false);
      e.target.value = "";
    }
  };

  const handleDownloadSurveyExport = async (format: "xlsx" | "csv") => {
    setDownloadingSurvey(format);
    try {
      const token = getAdminToken() || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/survey/export?format=${format}&token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error("Anket indirme başarısız");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `tubitak_anket_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      alert(`İndirme hatası: ${e.message}`);
    } finally {
      setDownloadingSurvey(null);
    }
  };

  const handleRefreshSurvey = async () => {
    setLoadingSurvey(true);
    try {
      const [an, q] = await Promise.all([
        apiFetch<any>("/api/survey/analytics"),
        apiFetch<any>("/api/survey/questions"),
      ]);
      if (an) setSurveyAnalytics(an);
      if (q?.questions) setSurveyQuestions(q.questions);
    } catch {}
    finally {
      setLoadingSurvey(false);
    }
  };

  const handleCleanSuspiciousSurvey = async () => {
    setCleaningSurvey(true);
    setSurveyCleanMsg(null);
    try {
      const res = await adminFetch<any>("/api/admin/survey/clean-suspicious", {
        method: "POST",
      });
      setSurveyCleanMsg(
        res.message || "Şüpheli (<8 sn) ve mükerrer anket yanıtları temizlendi."
      );
      await handleRefreshSurvey();
    } catch (e: any) {
      setSurveyCleanMsg(`Temizleme hatası: ${e.message}`);
    } finally {
      setCleaningSurvey(false);
    }
  };

  // --- SİBER GÜVENLİK & TRAFİK KALKANI İŞLEMLERİ ---
  const handleRefreshSecurity = async () => {
    setLoadingSecurity(true);
    setSecurityFeedback(null);
    try {
      const secRes = await adminFetch<any>("/api/admin/security/dashboard");
      if (secRes) setSecurityDashboard(secRes);
    } catch (e: any) {
      setSecurityFeedback(`Hata: ${e.message}`);
    } finally {
      setLoadingSecurity(false);
    }
  };

  const handleClearServerCache = async () => {
    setSecurityFeedback(null);
    try {
      const res = await adminFetch<any>("/api/admin/security/clear-cache", {
        method: "POST",
      });
      setSecurityFeedback(res.message || "5 dakikalık sunucu önbelleği temizlendi.");
      await handleRefreshSecurity();
    } catch (e: any) {
      setSecurityFeedback(`Hata: ${e.message}`);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    setSecurityFeedback(null);
    try {
      const res = await adminFetch<any>("/api/admin/security/unblock", {
        method: "POST",
        body: JSON.stringify({ ip_address: ip }),
      });
      setSecurityFeedback(res.message || `${ip} kilidi kaldırıldı.`);
      await handleRefreshSecurity();
    } catch (e: any) {
      setSecurityFeedback(`Hata: ${e.message}`);
    }
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
              Sistem, Otomatik Senkronizasyon, Bülten Keşif, İletişim ve Telemetri Yönetimi
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

        {/* 10 Sekme Menüsü */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            {
              key: "overview" as AdminTabKey,
              label: "1. Genel Durum & Senkronizasyon",
              icon: RefreshCw,
            },
            {
              key: "security" as AdminTabKey,
              label: "🛡️ Siber Güvenlik & Trafik Kalkanı",
              icon: ShieldCheck,
            },
            {
              key: "survey" as AdminTabKey,
              label: "📊 Anket Sonuçları (TÜBİTAK 2209-A)",
              icon: Award,
            },
            {
              key: "inbox" as AdminTabKey,
              label: `📩 Gelen Mesajlar${
                unreadCount > 0 ? ` (${unreadCount} Yeni)` : ""
              }`,
              icon: Inbox,
            },
            {
              key: "telemetry" as AdminTabKey,
              label: "📈 Detaylı Fon/Modül İstatistikleri",
              icon: BarChart3,
            },
            {
              key: "bulletins" as AdminTabKey,
              label: "Bülten Keşfet & PDF Giriş Merkezi",
              icon: FileText,
            },
            {
              key: "funds" as AdminTabKey,
              label: "TEFAS Fon Havuzu & Rastgele 5 Fon Keşfet",
              icon: Database,
            },
            {
              key: "branding" as AdminTabKey,
              label: "Site Ayarları, Karşılama Ekranı & Söz Yönetimi",
              icon: Settings,
            },
            {
              key: "research" as AdminTabKey,
              label: "TÜBİTAK 2209-A Araştırma & Metodoloji",
              icon: GraduationCap,
            },
            {
              key: "legal" as AdminTabKey,
              label: "Yasal Metinler & Sözleşmeler",
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

        {/* 💾 Bulut Veritabanı Kota Durumu (Neon PostgreSQL 1 GB Kota Koruması) */}
        {(() => {
          const quota =
            syncData?.db_quota ||
            systemHealth?.db_quota ||
            securityDashboard?.db_quota || {
              used_mb: 24.0,
              max_mb: 1024,
              used_pct: 2.34,
              free_pct: 97.66,
            };
          return (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  💾 Bulut Veritabanı Kota Durumu (Neon PostgreSQL)
                </span>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {quota.used_mb} MB / {quota.max_mb} MB Kullanıldı
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                    %{quota.free_pct} Boş
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, Math.min(100, quota.used_pct || 2.5))}%` }}
                />
              </div>
            </div>
          );
        })()}
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

          {/* SİSTEM SAĞLIĞI & VERİTABANI YEDEKLEME (JSON BACKUP / RESTORE) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Sistem Sağlığı &amp; Tam Yedekleme (Render Koruma Motoru)
                </div>
                <h3 className="text-base font-bold">
                  Veritabanı Sağlık Durumu &amp; Tek Tıkla Full JSON Yedek / Geri Yükleme
                </h3>
                <p className="text-xs text-slate-500">
                  Render Ephemeral Filesystem sıfırlanmalarına karşı tüm fonları, bültenleri, anketleri ve mesajları tek tıkla bilgisayarınıza indirin veya geri yükleyin.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadFullDbBackup}
                  disabled={downloadingDbBackup}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadingDbBackup ? "Paketleniyor..." : "💾 Tüm Veritabanını Yedek İndir (JSON)"}
                </button>

                <label className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                  {restoringDbBackup ? "Yükleniyor..." : "📤 Yedekten Geri Yükle (Restore JSON)"}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFullDbBackup}
                    disabled={restoringDbBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {backupRestoreMsg && (
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{backupRestoreMsg}</span>
              </div>
            )}

            {systemHealth && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Takip Edilen Fon</div>
                  <div className="text-lg font-bold text-blue-600">{systemHealth.database?.funds_count || 0} Fon</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Gerçek Fiyat Kaydı</div>
                  <div className="text-lg font-bold text-indigo-600 font-mono">
                    {Number(systemHealth.database?.prices_count || 0).toLocaleString("tr-TR")}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">KAP Bülteni</div>
                  <div className="text-lg font-bold text-amber-600">{systemHealth.database?.bulletins_count || 0} Adet</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Resmi Kanıt Kartı</div>
                  <div className="text-lg font-bold text-emerald-600">{systemHealth.database?.evidence_count || 0} Kart</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Anket Katılımcısı</div>
                  <div className="text-lg font-bold text-purple-600">{systemHealth.database?.survey_responses_count || 0} Kişi</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">TEFAS API Servisi</div>
                  <div className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ÇEVRİMİÇİ
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CANLI DUYURU BANDI & DİNAMİK EKONOMİK PARAMETRELER (2 SÜTUNLU KART) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol: Canlı Duyuru Bandı Yönetimi */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full mb-1">
                    <Megaphone className="w-3.5 h-3.5" />
                    Canlı Bilgi &amp; Duyuru Bandı
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Sitenin En Üstünde Görünecek Duyuru Çubuğu
                  </h4>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={announcementData.enabled}
                    onChange={(e) => setAnnouncementData({ ...announcementData, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Duyuru Bandını Sitede Aktif Olarak Göster</span>
                </label>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Duyuru Metni:
                  </label>
                  <input
                    type="text"
                    value={announcementData.text}
                    onChange={(e) => setAnnouncementData({ ...announcementData, text: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Rozet Metni:
                    </label>
                    <input
                      type="text"
                      value={announcementData.badge}
                      onChange={(e) => setAnnouncementData({ ...announcementData, badge: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Yönlendirme Linki:
                    </label>
                    <input
                      type="text"
                      value={announcementData.link_url}
                      onChange={(e) => setAnnouncementData({ ...announcementData, link_url: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>

                {announcementMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                    {announcementMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveAnnouncement}
                  disabled={savingAnnouncement}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingAnnouncement ? "Kaydediliyor..." : "Duyuruyu Yayınla"}
                </button>
              </div>
            </div>

            {/* Sağ: Dinamik Ekonomik Parametreler & Simülatör Kontrolü */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full mb-1">
                  <Sliders className="w-3.5 h-3.5" />
                  Reel Getiri Simülatörü Kontrolü
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Dinamik Makroekonomik Katsayılar
                </h4>
                <p className="text-xs text-slate-500">
                  Reel Getiri hesaplamasında varsayılan olarak kullanılan TÜFE, Mevduat ve Stopaj parametrelerini doğrudan güncelleyin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Yıllık TÜFE Enflasyon (%):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={economicData.annual_inflation_pct}
                    onChange={(e) => setEconomicData({ ...economicData, annual_inflation_pct: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Mevduat / TLREF Yıllık Faiz (%):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={economicData.deposit_rate_pct}
                    onChange={(e) => setEconomicData({ ...economicData, deposit_rate_pct: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Varsayılan Stopaj Vergisi (%):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={economicData.default_stopaj_pct}
                    onChange={(e) => setEconomicData({ ...economicData, default_stopaj_pct: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Varsayılan Fon Yönetim Ücreti (%):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={economicData.mgmt_fee_default_pct}
                    onChange={(e) => setEconomicData({ ...economicData, mgmt_fee_default_pct: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              {economicMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                  {economicMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveEconomic}
                disabled={savingEconomic}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {savingEconomic ? "Kaydediliyor..." : "Ekonomik Parametreleri Kaydet"}
              </button>
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
                <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  🔗 Resmi KAP / TEFAS PDF Linki (Önerilen - Veritabanında Yer Kaplamaz):
                </label>
                <input
                  type="url"
                  placeholder="https://www.kap.org.tr/tr/YatirimFonlari"
                  value={bOriginalUrl}
                  onChange={(e) => setBOriginalUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-slate-800 text-xs font-medium"
                />
              </div>
            </div>

            {/* 1. Seçenek: Önerilen Harici Link Bilgisi + 2. Seçenek: Maks 1.5 MB PDF Yükleme */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold">
                  Belge İçeriği (Önerilen: Yukarıya Resmi KAP/TEFAS Linki Girin veya Maks. 1.5 MB PDF Yükleyin):
                </label>
                <label className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {extractingPdf
                      ? "PDF Ayrıştırılıyor..."
                      : "Bilgisayardan PDF Yükle (Maks. 1.5 MB)"}
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

      {/* SEKME 6: ANKET & AKADEMİK BULGULAR (TÜBİTAK 2209-A) */}
      {activeTab === "survey" && (
        <div className="space-y-6">
          {/* Üst Başlık & Aksiyon Çubuğu */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full mb-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                TÜBİTAK 2209-A Üniversite Öğrencileri Araştırma Projeleri Destekleme Programı
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Yatırımcı Okuryazarlık ve Algı Anketi & Akademik Bulgular Komuta Merkezi
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Ziyaretçilerin fon güvencesi, stopaj, yönetim ücreti ve getiri hesaplama konusundaki test yanıtları ile algı puanlarının bilimsel analizi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCleanSuspiciousSurvey}
                disabled={cleaningSurvey}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {cleaningSurvey
                  ? "Temizleniyor..."
                  : "🧹 Şüpheli / Mükerrer Yanıtları Temizle"}
              </button>
              <button
                type="button"
                onClick={handleRefreshSurvey}
                disabled={loadingSurvey}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSurvey ? "animate-spin" : ""}`} />
                Yenile
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSurveyExport("xlsx")}
                disabled={downloadingSurvey === "xlsx"}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {downloadingSurvey === "xlsx" ? "İndiriliyor..." : "Excel (.xlsx) İndir"}
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSurveyExport("csv")}
                disabled={downloadingSurvey === "csv"}
                className="px-3 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingSurvey === "csv" ? "İndiriliyor..." : "CSV İndir"}
              </button>
            </div>
          </div>

          {surveyCleanMsg && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-800 dark:text-indigo-200">
              {surveyCleanMsg}
            </div>
          )}

          {/* KPI Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Toplam Katılımcı Sayısı</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold font-mono mt-1 text-slate-900 dark:text-slate-100">
                {surveyAnalytics?.total_responses || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Doğrulanmış tam anket formu
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Ortalama Okuryazarlık Puanı</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                {surveyAnalytics?.average_score != null
                  ? Number(surveyAnalytics.average_score).toFixed(1)
                  : "0.0"}{" "}
                <span className="text-sm font-normal text-slate-400">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                8 bilgi sorusu üzerinden hesaplanmıştır
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Ortalama Şeffaflık Algı Puanı</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
                {surveyAnalytics?.average_perception != null
                  ? Number(surveyAnalytics.average_perception).toFixed(2)
                  : "0.00"}{" "}
                <span className="text-sm font-normal text-slate-400">/ 5.00</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                6 Likert algı sorusu ortalaması
              </div>
            </div>
          </div>

          {/* TÜBİTAK Bilimsel Araştırma Bulgu Cümlesi Üretici */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  TÜBİTAK 2209-A Bilimsel Araştırma Raporu Bulgu Cümlesi Üretici
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Veritabanındaki anket yanıtlarından dinamik olarak türetilen ve doğrudan akademik raporda veya sunumlarda kullanılabilecek bulgu cümleleri.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {surveyAnalytics?.academic_findings &&
              surveyAnalytics.academic_findings.length > 0 ? (
                surveyAnalytics.academic_findings.map((f: string, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{f}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(f);
                        setCopiedFinding(i);
                        setTimeout(() => setCopiedFinding(null), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {copiedFinding === i ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic p-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  Henüz yeterli anket yanıtı toplanmadı. Katılımcı sayısı arttıkça akademik bulgular otomatik hesaplanacaktır.
                </div>
              )}
            </div>
          </div>

          {/* Soru Bazlı Başarı & Hata Analizi */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Soru Bazlı Başarı & Hata Oranı Analizi
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Yatırımcıların en çok hangi konularda yanılgıya düştüğünü tespit etmek için soru bazında başarı ve hata oranları.
              </p>
            </div>

            <div className="space-y-3">
              {surveyAnalytics?.questions_analytics &&
              surveyAnalytics.questions_analytics.length > 0 ? (
                surveyAnalytics.questions_analytics.map((q: any) => {
                  const success = Number(q.success_rate || 0);
                  const error = Number(q.error_rate || 0);
                  const isHighError = error > 50;

                  return (
                    <div
                      key={q.question_id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          <span className="font-mono text-slate-400 mr-1.5">
                            #{q.question_id}
                          </span>
                          {q.title}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                          <span className="text-emerald-600 font-bold">
                            Doğru: %{success.toFixed(1)}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span
                            className={`font-bold ${
                              isHighError ? "text-rose-600" : "text-slate-500"
                            }`}
                          >
                            Hata: %{error.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* İki renkli Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, success))}%` }}
                        />
                        <div
                          className="h-full bg-rose-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, error))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          Kategori: {q.category}
                        </span>
                        <span>
                          Toplam Cevap: {q.total_answers} ({q.correct_answers} doğru)
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-500 italic p-4 text-center">
                  Henüz soru yanıt verisi bulunmamaktadır.
                </div>
              )}
            </div>
          </div>

          {/* Demografik Kırılımlar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Eğitim Seviyesine Göre */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Eğitim Seviyesine Göre Okuryazarlık Puanı
              </h5>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {surveyAnalytics?.demographics?.education_breakdown &&
                Object.keys(surveyAnalytics.demographics.education_breakdown).length > 0 ? (
                  Object.entries(surveyAnalytics.demographics.education_breakdown).map(
                    ([edu, stat]: [string, any]) => (
                      <div
                        key={edu}
                        className="py-2 flex items-center justify-between"
                      >
                        <span className="text-slate-600 dark:text-slate-400">
                          {edu}
                        </span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-[11px] text-slate-400">
                            {stat.count} kişi
                          </span>
                          <span className="font-bold text-emerald-600">
                            {Number(stat.avg_score || 0).toFixed(1)} / 100
                          </span>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="py-3 text-slate-400 italic">Veri bulunmuyor.</div>
                )}
              </div>
            </div>

            {/* Yatırım Deneyimine Göre */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Yatırım Deneyimine Göre Okuryazarlık Puanı
              </h5>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {surveyAnalytics?.demographics?.experience_breakdown &&
                Object.keys(surveyAnalytics.demographics.experience_breakdown).length > 0 ? (
                  Object.entries(surveyAnalytics.demographics.experience_breakdown).map(
                    ([exp, stat]: [string, any]) => (
                      <div
                        key={exp}
                        className="py-2 flex items-center justify-between"
                      >
                        <span className="text-slate-600 dark:text-slate-400">
                          {exp}
                        </span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-[11px] text-slate-400">
                            {stat.count} kişi
                          </span>
                          <span className="font-bold text-emerald-600">
                            {Number(stat.avg_score || 0).toFixed(1)} / 100
                          </span>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="py-3 text-slate-400 italic">Veri bulunmuyor.</div>
                )}
              </div>
            </div>
          </div>

          {/* Hızlı Nabız Yoklaması (Floating Quick Poll) Canlı İstatistikleri */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Sağ Alt Yüzen Mini-Anket (Hızlı Nabız) Canlı Sonuçları
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  &quot;Banka iflas ederse TEFAS fon param batar mı?&quot; sorusuna sağ alt widget üzerinden verilen anlık yanıtlar.
                </p>
              </div>
              <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                Toplam Oy: {surveyAnalytics?.quick_poll_stats?.total_votes || 0}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">
                  A) Hayır, Takasbank&apos;ta adıma saklanır (Doğru)
                </div>
                <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
                  %{surveyAnalytics?.quick_poll_stats?.option_percentages?.A != null
                    ? Number(surveyAnalytics.quick_poll_stats.option_percentages.A).toFixed(1)
                    : "0.0"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {surveyAnalytics?.quick_poll_stats?.option_counts?.A || 0} oy
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs">
                <div className="font-bold text-rose-800 dark:text-rose-300">
                  B) Evet, banka batarsa para da batar
                </div>
                <div className="text-lg font-bold font-mono text-rose-600 mt-1">
                  %{surveyAnalytics?.quick_poll_stats?.option_percentages?.B != null
                    ? Number(surveyAnalytics.quick_poll_stats.option_percentages.B).toFixed(1)
                    : "0.0"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {surveyAnalytics?.quick_poll_stats?.option_counts?.B || 0} oy
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs">
                <div className="font-bold text-amber-800 dark:text-amber-300">
                  C) Yalnızca TMSF limiti kadar ödenir
                </div>
                <div className="text-lg font-bold font-mono text-amber-600 mt-1">
                  %{surveyAnalytics?.quick_poll_stats?.option_percentages?.C != null
                    ? Number(surveyAnalytics.quick_poll_stats.option_percentages.C).toFixed(1)
                    : "0.0"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {surveyAnalytics?.quick_poll_stats?.option_counts?.C || 0} oy
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 7: YASAL METİNLER & SÖZLEŞMELER (SPK, KULLANIM KOŞULLARI, KVKK, TÜBİTAK ONAMI, METODOLOJİ — GÖREV 4) */}
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

      {/* SEKME 7: GELEN MESAJLAR (İLETİŞİM & GERİ BİLDİRİM) */}
      {activeTab === "inbox" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-1.5">
                <Inbox className="w-3.5 h-3.5" />
                Akademik İş Birliği, Veri Hatası & Kullanıcı Geri Bildirim Kutusu
              </div>
              <h3 className="text-base font-bold">
                Gelen İletişim Mesajları (`contact_messages`)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                `/contact` sayfasından KVKK açık rıza onayıyla gönderilen tüm mesajları buradan okuyabilir, okundu/okunmadı olarak işaretleyebilir veya silebilirsiniz.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                Toplam: {contactMessages.length} • Okunmamış: {unreadCount}
              </span>
              <button
                type="button"
                onClick={refreshInbox}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Yenile
              </button>
            </div>
          </div>

          {inboxFeedback && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 font-medium">
              {inboxFeedback}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <th className="p-3 font-bold">Durum</th>
                  <th className="p-3 font-bold">Tarih</th>
                  <th className="p-3 font-bold">Ad Soyad</th>
                  <th className="p-3 font-bold">İletişim (E-posta / Tel)</th>
                  <th className="p-3 font-bold">Konu</th>
                  <th className="p-3 font-bold">Mesaj Özeti</th>
                  <th className="p-3 font-bold">KVKK Onayı</th>
                  <th className="p-3 font-bold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {contactMessages.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      Henüz gelen iletişim mesajı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  contactMessages.map((msg) => (
                    <tr
                      key={msg.id}
                      className={`transition-colors ${
                        msg.is_read
                          ? "bg-white dark:bg-slate-900"
                          : "bg-blue-50/40 dark:bg-blue-950/20 font-medium"
                      }`}
                    >
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            msg.is_read
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {msg.is_read ? (
                            <>
                              <MailOpen className="w-3 h-3" /> Okundu
                            </>
                          ) : (
                            <>
                              <Mail className="w-3 h-3" /> Yeni
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {msg.created_at}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {msg.full_name}
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800 dark:text-slate-200">
                          {msg.email}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {msg.phone}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                          {msg.subject}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-600 dark:text-slate-300">
                        {msg.message}
                      </td>
                      <td className="p-3">
                        {msg.kvkk_approved ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            ✓ Onaylı (6698 KVKK)
                          </span>
                        ) : (
                          <span className="text-rose-500 text-[11px]">Hayır</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenMessageModal(msg)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Detay Gör
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMessageRead(msg)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold"
                        >
                          {msg.is_read ? "Okunmadı Yap" : "Okundu Yap"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContactMessage(msg.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mesaj Detay Modalı */}
          {selectedMessageModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {selectedMessageModal.subject}
                    </span>
                    <h4 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
                      {selectedMessageModal.full_name}
                    </h4>
                    <div className="text-xs text-slate-500 font-mono">
                      Gönderim Tarihi: {selectedMessageModal.created_at}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMessageModal(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      E-posta Adresi
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedMessageModal.email}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Cep Telefonu
                    </div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedMessageModal.phone}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {selectedMessageModal.message}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ 6698 Sayılı KVKK Açık Rıza Onayı Alınmıştır
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleMessageRead(selectedMessageModal)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      {selectedMessageModal.is_read
                        ? "Okunmadı Olarak İşaretle"
                        : "Okundu Olarak İşaretle"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteContactMessage(selectedMessageModal.id)
                      }
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                    >
                      Mesajı Sil
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMessageModal(null)}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEKME 8: PLATFORM İSTATİSTİKLERİ & KULLANICI DAVRANIŞ ANALİZİ (TELEMETRİ ENGINE) */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          {/* Üst Özet Kartları */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full mb-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  BÖLÜM 3 • Ultra Detaylı Kullanıcı Davranışı ve Fon Telemetri Sistemi
                </div>
                <h3 className="text-base font-bold">
                  Platform İstatistikleri, Fon Etkileşim Matrisi & Canlı Kullanıcı Akışı
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kullanıcıların KVKK uyumlu (anonim oturumlarla) hangi modülde ne kadar vakit geçirdiği, hangi fonları incelediği, karşılaştırdığı ve sepete eklediği gerçek zamanlı olarak raporlanır.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadExport("xlsx")}
                  disabled={downloadingExport !== null}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {downloadingExport === "xlsx"
                    ? "İndiriliyor..."
                    : "📥 Tüm Akademik Verileri İndir (Excel)"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadExport("csv")}
                  disabled={downloadingExport !== null}
                  className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadingExport === "csv"
                    ? "İndiriliyor..."
                    : "📥 Ham Olay Verilerini İndir (CSV)"}
                </button>
                <button
                  type="button"
                  onClick={handleRefreshTelemetry}
                  disabled={loadingTelemetry}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      loadingTelemetry ? "animate-spin" : ""
                    }`}
                  />
                  {loadingTelemetry ? "Yenileniyor..." : "Canlı Verileri Yenile"}
                </button>
              </div>
            </div>

            {telemetryData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Toplam Etkileşim / Olay
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {telemetryData.summary.total_events}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                    {telemetryData.summary.unique_sessions} Tekil Anonim Oturum
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Toplam Platformda Kalma Süresi
                  </div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {telemetryData.summary.total_duration_minutes} dk
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    ({telemetryData.summary.total_duration_seconds} saniye)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Toplam Fon İnceleme & Sorgu
                  </div>
                  <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                    {telemetryData.summary.total_fund_interactions}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {telemetryData.summary.total_comparisons} İkili Karşılaştırma
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Sepet Simülasyonu & Bülten Okuma
                  </div>
                  <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                    {telemetryData.summary.total_basket_simulations} Sepet /{" "}
                    {telemetryData.summary.total_bulletin_interactions} Bülten
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Aktif Senaryo & Belge Analizi
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* A. GENEL TRAFİK & ZİYARETÇİ ANALİZİ (WEB ANALYTICS & CİHAZ DAĞILIMI) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-1">
                <Users className="w-3.5 h-3.5" />
                Web Analitiği & Ziyaretçi Profili
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Genel Trafik, Donanım & Oturum Terk Analizi
              </h4>
              <p className="text-xs text-slate-500">
                Anonim tekil ziyaretçiler, sayfa görüntüleme sayıları, cihaz/tarayıcı/ekran dağılımı ve hemen çıkma oranları.
              </p>
            </div>

            {/* 4 Trafik KPI Kartı */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-semibold">
                  Toplam Tekil Ziyaretçi
                </div>
                <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {telemetryData?.traffic_stats?.total_visitors ?? telemetryData?.summary?.unique_sessions ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Anonim Tekil Kullanıcı
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-semibold">
                  Toplam Sayfa Görüntüleme
                </div>
                <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                  {telemetryData?.traffic_stats?.total_pageviews ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Pageviews (Toplam Hit)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-semibold">
                  Son 24 Saatlik Aktif Ziyaretçi
                </div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {telemetryData?.traffic_stats?.active_visitors_last_24h ?? 0}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  Canlı ve Aktif Oturumlar
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-semibold">
                  Hemen Çıkma Oranı (Bounce Rate)
                </div>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  %{formatNumberTR(telemetryData?.traffic_stats?.bounce_rate_pct ?? 0, 1)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Tek Sayfada Kalan Oturumlar
                </div>
              </div>
            </div>

            {/* 4'lü Donanım ve Tarayıcı Dağılım Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cihaz Dağılımı */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Monitor className="w-3.5 h-3.5 text-blue-600" />
                  Cihaz Dağılımı
                </div>
                <div className="space-y-2">
                  {(telemetryData?.traffic_stats?.device_breakdown || []).map((d: any) => (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                        <span className="font-bold font-mono">%{d.pct} ({d.count})</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, d.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* İşletim Sistemi */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  İşletim Sistemi (OS)
                </div>
                <div className="space-y-2">
                  {(telemetryData?.traffic_stats?.os_breakdown || []).map((o: any) => (
                    <div key={o.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">{o.name}</span>
                        <span className="font-bold font-mono">%{o.pct} ({o.count})</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, o.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarayıcı Dağılımı */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Globe2 className="w-3.5 h-3.5 text-purple-600" />
                  Tarayıcı (Browser)
                </div>
                <div className="space-y-2">
                  {(telemetryData?.traffic_stats?.browser_breakdown || []).map((b: any) => (
                    <div key={b.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">{b.name}</span>
                        <span className="font-bold font-mono">%{b.pct} ({b.count})</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, b.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ekran Çözünürlüğü */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  Ekran Çözünürlüğü
                </div>
                <div className="space-y-2">
                  {(telemetryData?.traffic_stats?.screen_breakdown || []).map((s: any) => (
                    <div key={s.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">{s.name}</span>
                        <span className="font-bold font-mono text-[11px]">%{s.pct} ({s.count})</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, s.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Saatlik ve Haftalık Yoğunluk */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 24 Saatlik Yoğunluk Bar Haritası */}
              <div className="lg:col-span-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Saatlik Yoğunluk Dağılımı (00:00 - 23:00)
                  </span>
                  <span className="text-[11px] text-slate-500">24 Saatlik Sayfa Hitleri</span>
                </div>
                <div className="h-28 flex items-end gap-1 sm:gap-1.5 pt-3">
                  {(() => {
                    const hours: number[] = telemetryData?.traffic_stats?.hourly_distribution || Array(24).fill(0);
                    const maxH = Math.max(1, ...hours);
                    return hours.map((cnt: number, h: number) => {
                      const hPct = Math.max(8, Math.round((cnt / maxH) * 100));
                      return (
                        <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-7 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {String(h).padStart(2, "0")}:00 • {cnt} hit
                          </div>
                          <div
                            className={`w-full rounded-t transition-all ${
                              cnt > 0 ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                            }`}
                            style={{ height: `${hPct}%` }}
                          />
                          <span className="text-[8px] sm:text-[9px] font-mono text-slate-400">
                            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Haftalık Gün Dağılımı */}
              <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Haftalık Gün Yoğunluğu
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(() => {
                    const weekly = telemetryData?.traffic_stats?.weekly_distribution || [];
                    const maxW = Math.max(1, ...weekly.map((w: any) => w.count || 0));
                    return weekly.map((w: any) => (
                      <div key={w.day} className="flex items-center gap-2 text-xs">
                        <span className="w-8 text-[11px] font-semibold text-slate-500">{w.day}</span>
                        <div className="flex-1 h-3 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded"
                            style={{ width: `${Math.min(100, Math.max(4, Math.round((w.count / maxW) * 100)))}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono font-bold text-[11px]">{w.count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Kullanıcı Akışı & Sayfa Terk Analizi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Giriş Sayfaları (Landing Pages) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  En Çok Giriş Yapılan Sayfalar (Landing)
                </div>
                <div className="space-y-1.5">
                  {(telemetryData?.traffic_stats?.top_landing_pages || []).map((lp: any) => (
                    <div key={lp.page} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-blue-600 dark:text-blue-400 text-[11px] truncate max-w-[150px]">
                        {lp.page}
                      </span>
                      <span className="font-mono font-bold">{lp.count} ({lp.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Çıkış Sayfaları (Exit Pages) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  En Çok Terk Edilen Sayfalar (Exit)
                </div>
                <div className="space-y-1.5">
                  {(telemetryData?.traffic_stats?.top_exit_pages || []).map((ep: any) => (
                    <div key={ep.page} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-rose-600 dark:text-rose-400 text-[11px] truncate max-w-[150px]">
                        {ep.page}
                      </span>
                      <span className="font-mono font-bold">{ep.count} ({ep.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* En Sık İzlenen Rotalar (Top Flows) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Sık İzlenen Ziyaretçi Rotaları (Flows)
                </div>
                <div className="space-y-1.5">
                  {(telemetryData?.traffic_stats?.top_flows || []).map((f: any) => (
                    <div key={f.flow} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[170px]" title={f.flow}>
                        {f.flow}
                      </span>
                      <span className="font-mono font-bold text-emerald-600">{f.count} kez</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* B. REEL GETİRİ SİMÜLATÖRÜ & FİNANSAL SÖZLÜK ETKİLEŞİM ANALİZİ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol: Reel Getiri Simülatörü */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full mb-1">
                  <Calculator className="w-3.5 h-3.5" />
                  Reel Getiri Simülatörü Etkileşimi
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Enflasyon, Stopaj & Küresel Benchmark Kullanım Analizi
                </h4>
                <p className="text-xs text-slate-500">
                  Kullanıcıların simülatörü açma oranı, hesaplama sıklığı ve en çok karşılaştırdığı alternatif yatırım araçları.
                </p>
              </div>

              {/* 3 KPI */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Simülatör Açılma</div>
                  <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                    {telemetryData?.real_return_stats?.total_opens || 0} kez
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Hesaplama / Simüle</div>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                    {telemetryData?.real_return_stats?.total_simulations || 0} kez
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Ort. Test Tutarı</div>
                  <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono truncate">
                    {formatCurrencyTL(telemetryData?.real_return_stats?.avg_investment_tl || 100000)}
                  </div>
                </div>
              </div>

              {/* Karşılaştırılan Alternatif Yatırım Araçları Popülerliği */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  En Çok Tercih Edilen Alternatif Yatırım Araçları (Benchmark Popülerliği)
                </div>
                <div className="space-y-2">
                  {(telemetryData?.real_return_stats?.benchmark_popularity || []).map((b: any) => (
                    <div key={b.benchmark_key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{b.benchmark_label}</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          {b.count} seçim (%{b.pct})
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, b.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sağ: Finansal Sözlük & SPK Mevzuatı */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full mb-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Finansal Sözlük & SPK Mevzuatı Etkileşimi
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sözlük Okunma, Arama & Kategori İlgi Dağılımı
                </h4>
                <p className="text-xs text-slate-500">
                  Kullanıcıların en çok incelediği finansal kavramlar, SPK maddeleri ve anlık arama sorguları.
                </p>
              </div>

              {/* 2 KPI */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Toplam Terim Okunma</div>
                  <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                    {telemetryData?.glossary_stats?.total_reads || 0} kez
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Toplam Arama Sorgusu</div>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                    {telemetryData?.glossary_stats?.total_searches || 0} sorgu
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* En Çok Okunan Terimler */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    En Çok Okunan Terimler
                  </div>
                  <div className="space-y-1">
                    {(telemetryData?.glossary_stats?.top_terms || []).slice(0, 5).map((t: any, idx: number) => (
                      <div key={t.term_id} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-800/40">
                        <span className="truncate max-w-[130px] font-medium text-slate-800 dark:text-slate-200">
                          {idx + 1}. {t.term_title}
                        </span>
                        <span className="font-mono font-bold text-amber-600">{t.count} kez</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* En Sık Aratılan Kelimeler */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Sık Aranan Kelimeler
                  </div>
                  <div className="space-y-1">
                    {(telemetryData?.glossary_stats?.top_searches || []).slice(0, 5).map((s: any) => (
                      <div key={s.query} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-800/40">
                        <span className="font-mono text-blue-600 text-[11px] truncate max-w-[130px]">
                          &ldquo;{s.query}&rdquo;
                        </span>
                        <span className="font-mono font-bold">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kategori Bazında İlgi Dağılımı */}
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kategori Bazında İlgi Dağılımı
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(telemetryData?.glossary_stats?.category_breakdown || []).map((cat: any) => (
                    <div key={cat.category_name} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
                      <div className="text-slate-500 text-[11px] truncate">{cat.category_name}</div>
                      <div className="flex justify-between font-bold mt-0.5">
                        <span className="text-amber-600">%{cat.pct}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{cat.count} okuma</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 1. Modül ve Sayfa Bazlı İstatistikler */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Modül ve Sayfa Bazlı İstatistikler (Hit & Sayfada Kalma Süresi)
              </h4>
              <p className="text-xs text-slate-500">
                Ana Sayfa, Güven & Kanıt Merkezi, Şeffaflık Kontrolü, Bültenler, Performans Analizi, Sanal Sepet ve İletişim modüllerinin toplam görüntülenme ve ortalama inceleme süreleri.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <th className="p-3 font-bold">Modül / Sayfa Adı</th>
                    <th className="p-3 font-bold">Yol (Route)</th>
                    <th className="p-3 font-bold text-right">
                      Toplam Görüntülenme / Hit
                    </th>
                    <th className="p-3 font-bold text-right">Tekil Oturum</th>
                    <th className="p-3 font-bold text-right">
                      Toplam Geçirilen Süre
                    </th>
                    <th className="p-3 font-bold text-right">
                      Ortalama Kalma Süresi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(telemetryData?.module_stats || []).map((m: any) => (
                    <tr key={m.module_key}>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {m.module_label}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {m.route_path}
                      </td>
                      <td className="p-3 text-right font-bold">
                        {m.total_views} kez
                      </td>
                      <td className="p-3 text-right">{m.unique_sessions}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        {m.total_duration_minutes} dk ({m.total_duration_seconds} sn)
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {m.avg_duration_seconds} sn
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Fon Bazlı Ayrı Ayrı Detaylı İstatistikler ("Fon Etkileşim Matrisi") */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Fon Bazlı Ayrı Ayrı Detaylı İstatistikler (&ldquo;Fon Etkileşim Matrisi&rdquo;)
              </h4>
              <p className="text-xs text-slate-500">
                Takip edilen her bir fon (`AFT`, `TTE`, `YAY`, `TI2`, `IPB`, `MAC`, `TTA` vb.) için ayrı ayrı modül bazında sorgulanma sayıları, sanal sepete eklenme sıklığı, ortalama sepet ağırlığı (%) ve fon üzerinde geçirilen süre.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <th className="p-3 font-bold">Fon Kodu</th>
                    <th className="p-3 font-bold">Fon Ünvanı & Türü</th>
                    <th className="p-3 font-bold text-right">
                      Toplam İncelenme
                    </th>
                    <th className="p-3 font-bold text-right">
                      Güven & Kanıt (`/evidence`)
                    </th>
                    <th className="p-3 font-bold text-right">
                      Şeffaflık Sorgusu (`/transparency`)
                    </th>
                    <th className="p-3 font-bold text-right">
                      Performans & Grafik (`/analytics`)
                    </th>
                    <th className="p-3 font-bold text-right">
                      Sanal Sepet Eklenme & Ort. Ağırlık %
                    </th>
                    <th className="p-3 font-bold text-right">
                      Reel Getiri Testi
                    </th>
                    <th className="p-3 font-bold text-right">
                      Fon Üzerinde Geçirilen Süre
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(telemetryData?.fund_matrix || []).map((f: any) => (
                    <tr key={f.fund_code}>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs">
                          {f.fund_code}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {f.fund_title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {f.fund_type}
                        </div>
                      </td>
                      <td className="p-3 text-right font-extrabold text-blue-600 dark:text-blue-400">
                        {f.total_inspections}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {f.evidence_views}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {f.transparency_queries}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {f.analytics_queries}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold">{f.basket_additions} kez</span>{" "}
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                          (Ort. %{formatNumberTR(f.avg_basket_weight_pct, 1)})
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                        {f.real_return_tests || 0} kez
                      </td>
                      <td className="p-3 text-right font-mono">
                        <span className="font-bold">
                          {f.total_duration_seconds} sn
                        </span>{" "}
                        <span className="text-[11px] text-slate-500">
                          (Ort. {f.avg_duration_seconds} sn)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Karşılaştırma & Çapraz Analiz İstatistikleri */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* En Çok Karşılaştırılan İkili Fon Çiftleri Liderlik Tablosu */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  3A. En Çok Karşılaştırılan İkili Fon Çiftleri (Top Pairings)
                </h4>
                <p className="text-xs text-slate-500">
                  Kullanıcıların 100 bazlı performans analizinde en sık yan yana karşılaştırdığı fon ikilileri.
                </p>
              </div>

              <div className="space-y-3">
                {(telemetryData?.comparison_stats?.top_pairings || []).map(
                  (pair: any, idx: number) => (
                    <div
                      key={pair.pair_label}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {pair.pair_label}
                          </span>
                        </div>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {pair.compare_count} karşılaştırma (%{pair.share_pct})
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(8, pair.share_pct))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* En Çok Sorgulanan Tarih Aralıkları */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  3B. En Çok Sorgulanan Tarih Aralıkları Dağılımı
                </h4>
                <p className="text-xs text-slate-500">
                  Performans ve sepet analizlerinde kullanıcıların tercih ettiği dönem periyotları (`1 Ay`, `3 Ay`, `6 Ay`, `1 Yıl`, `Özel Tarih`).
                </p>
              </div>

              <div className="space-y-3">
                {(
                  telemetryData?.comparison_stats?.date_range_breakdown || []
                ).map((rng: any) => (
                  <div
                    key={rng.range_label}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {rng.range_label}
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {rng.query_count} sorgu (%{rng.share_pct})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(6, rng.share_pct))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Bülten & Rapor İstatistikleri */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                4. Bülten & Rapor Okunma İstatistikleri
              </h4>
              <p className="text-xs text-slate-500">
                En çok okunan/incelenen KAP bültenleri, resmi kaynak PDF tıklama sayıları ve bülten üzerinde geçirilen süreler.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <th className="p-3 font-bold">Fon</th>
                    <th className="p-3 font-bold">Bülten / Rapor Başlığı</th>
                    <th className="p-3 font-bold">Kurum</th>
                    <th className="p-3 font-bold text-right">
                      Özet Açılma Sayısı
                    </th>
                    <th className="p-3 font-bold text-right">
                      Resmi Kaynak / PDF Tıklama
                    </th>
                    <th className="p-3 font-bold text-right">
                      Ortalama Okuma Süresi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(telemetryData?.bulletin_stats || []).map((b: any) => (
                    <tr key={b.bulletin_id}>
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {b.fund_code || "GENEL"}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {b.title}
                      </td>
                      <td className="p-3 text-slate-500">{b.institution}</td>
                      <td className="p-3 text-right font-bold">
                        {b.open_count} kez
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {b.source_click_count} tıklama
                      </td>
                      <td className="p-3 text-right font-mono">
                        {b.avg_duration_seconds} sn (Top.{" "}
                        {b.total_duration_seconds} sn)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Zaman Serisi ve Canlı Akış (Live Activity Feed - Son 50 Anonim Hareket) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sol: Günlük Etkileşim Trendi */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  5A. Günlük Etkileşim Zaman Serisi
                </h4>
                <p className="text-xs text-slate-500">
                  Tarih bazında toplam etkileşim, fon sorgusu ve sepet simülasyonu dağılımı.
                </p>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {(telemetryData?.daily_trend || []).map((dt: any) => (
                  <div
                    key={dt.date}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="font-mono text-slate-700 dark:text-slate-200">
                        {dt.date}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {dt.total_events} etkileşim
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Sayfa: {dt.page_views}</span>
                      <span>Fon Analizi: {dt.fund_queries}</span>
                      <span>Sepet: {dt.basket_simulations}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sağ: Canlı Akış (Live Activity Feed - Son 50 Anonim Kullanıcı Hareketi) */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    5B. Canlı Akış (Son 50 Anonim Kullanıcı Hareketi)
                  </h4>
                  <p className="text-xs text-slate-500">
                    KVKK uyumlu anonim oturumların platform üzerindeki gerçek zamanlı işlem geçmişi.
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {(telemetryData?.live_feed || []).map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {ev.description_tr}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Oturum: {ev.session_id} • Tür: {ev.event_type} •{" "}
                        {ev.created_at}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] whitespace-nowrap shrink-0">
                      {ev.relative_time_tr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME: SİBER GÜVENLİK & TRAFİK KALKANI (NEON POSTGRESQL + POOL + CACHE + WAF) */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/60 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  AKTİF KORUMA • NEON POSTGRESQL + BAĞLANTI HAVUZU + 5 DK CACHE
                </div>
                <h3 className="text-xl font-extrabold">
                  🛡️ Siber Güvenlik, Yüksek Trafik Kalkanı & Veritabanı Havuzu
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl">
                  1.000+ eşzamanlı kullanıcı (yüksek trafik) yüküne karşı PostgreSQL Connection Pool, 5 dakikalık In-Memory Cache, Rate Limiting (DDoS/Bot Koruması), Brute-Force Kilidi (5 hatalı girişte 15 dk IP bloklama) ve XSS/SQLi filtreleme merkezi.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleClearServerCache}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  5 Dk Önbelleği (Cache) Temizle
                </button>
                <button
                  onClick={handleRefreshSecurity}
                  disabled={loadingSecurity}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSecurity ? "animate-spin" : ""}`} />
                  Canlı Kalkan Verilerini Yenile
                </button>
              </div>
            </div>

            {securityFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold">
                {securityFeedback}
              </div>
            )}
          </div>

          {/* 4 Ana Kalkan Kartı */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
                <span>Neon PostgreSQL Bağlantı Havuzu</span>
                <Database className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {securityDashboard?.database_pool?.engine || "Neon PostgreSQL Pool"}
              </div>
              <div className="text-[11px] text-slate-500">
                Maks. Havuz: <strong>{securityDashboard?.database_pool?.max_connections ?? 15}</strong> bağlantı • Aktif: <strong>{securityDashboard?.database_pool?.total_connections ?? 1}</strong> • Boşta: <strong>{securityDashboard?.database_pool?.idle_connections ?? 1}</strong>
              </div>
              <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                Kayıt: {securityDashboard?.database_pool?.total_funds ?? 60} Fon / {formatNumberTR(securityDashboard?.database_pool?.total_prices ?? 15185)} Fiyat
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
                <span>5 Dakikalık In-Memory Cache</span>
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                %{securityDashboard?.cache?.hit_ratio_pct ?? 95} İsabet Oranı
              </div>
              <div className="text-[11px] text-slate-500">
                Cache Hit: <strong>{securityDashboard?.cache?.hits ?? 0}</strong> • Miss: <strong>{securityDashboard?.cache?.misses ?? 0}</strong> • Aktif Anahtar: <strong>{securityDashboard?.cache?.active_keys ?? 0}</strong>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                TTL: 300 Saniye (1.000+ Anlık Ziyaretçi Koruması)
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
                <span>Rate Limiting & DDoS Kalkanı</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {securityDashboard?.rate_limiter?.max_requests_per_minute ?? 120} İstek / Dk
              </div>
              <div className="text-[11px] text-slate-500">
                Form/Anket: <strong>{securityDashboard?.rate_limiter?.mutation_max_per_minute ?? 25} istek/dk</strong> • Engellenen Bot/Flood: <strong>{securityDashboard?.summary?.rate_limit_blocks ?? 0}</strong>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Durum: {securityDashboard?.rate_limiter?.status || "ACTIVE"}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
                <span>Brute-Force & XSS/SQLi Filtresi</span>
                <ShieldCheck className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                5 Deneme → 15 Dk Kilit
              </div>
              <div className="text-[11px] text-slate-500">
                Aktif Kilitli IP: <strong>{(securityDashboard?.brute_force?.active_locks || []).length}</strong> • Engellenen Payload: <strong>{securityDashboard?.summary?.sanitized_payloads ?? 0}</strong>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Parameterized SQL ($1, $2) + XSS Sanitizer Aktif
              </div>
            </div>
          </div>

          {/* Aktif Brute-Force IP Kilitleri & HTTP Güvenlik Başlıkları */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  🔒 Aktif Brute-Force Kilitli IP Adresleri (Admin Login Koruması)
                </h4>
                <p className="text-xs text-slate-500">
                  Arka arkaya 5 kez hatalı şifre giren IP adresleri otomatik olarak 15 dakika boyunca kilitlenir.
                </p>
              </div>

              {(securityDashboard?.brute_force?.active_locks || []).length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  Şu anda kilitli IP adresi bulunmuyor. Tüm yönetici girişleri güvenli.
                </div>
              ) : (
                <div className="space-y-2">
                  {(securityDashboard?.brute_force?.active_locks || []).map((lk: any) => (
                    <div
                      key={lk.ip}
                      className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                          {lk.ip}
                        </span>
                        <span className="ml-2 text-slate-500">
                          ({lk.failures} başarısız deneme • Kalan kilit: {lk.remaining_seconds} sn)
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnblockIp(lk.ip)}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
                      >
                        Kilidi Kaldır
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  🌐 Aktif HTTP Güvenlik Başlıkları (Next.js & API Security Headers)
                </h4>
                <p className="text-xs text-slate-500">
                  Clickjacking, MIME-sniffing ve XSS saldırılarına karşı tüm yanıtlara uygulanan güvenlik başlıkları.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {Object.entries(
                  securityDashboard?.security_headers || {
                    "X-Frame-Options": "DENY",
                    "X-Content-Type-Options": "nosniff",
                    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
                    "X-XSS-Protection": "1; mode=block",
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
                  }
                ).map(([headerKey, headerVal]) => (
                  <div
                    key={headerKey}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {headerKey}
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      {String(headerVal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Canlı Siber Güvenlik Kayıtları (security_logs tablosu) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  📋 Canlı Siber Güvenlik Denetim Kayıtları (Neon PostgreSQL `security_logs` Tablosu)
                </h4>
                <p className="text-xs text-slate-500">
                  Başarılı/başarısız admin girişleri, rate-limit bloklamaları, XSS/SQLi temizleme olayları ve sistem kalkanı logları.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Toplam {securityDashboard?.summary?.total_events ?? (securityDashboard?.recent_logs || []).length} Kayıt
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="p-3">Tarih / Saat</th>
                    <th className="p-3">Olay Türü</th>
                    <th className="p-3">Önem Derecesi</th>
                    <th className="p-3">IP Adresi</th>
                    <th className="p-3">Endpoint</th>
                    <th className="p-3">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(securityDashboard?.recent_logs || []).map((lg: any) => (
                    <tr key={lg.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {String(lg.created_at || "").slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {lg.event_type}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lg.severity === "CRITICAL" || lg.severity === "HIGH"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : lg.severity === "WARN" || lg.severity === "MEDIUM"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {lg.severity}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        {lg.ip_address}
                      </td>
                      <td className="p-3 font-mono text-blue-600 dark:text-blue-400">
                        {lg.endpoint}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {lg.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

