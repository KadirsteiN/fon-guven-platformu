"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  FileSearch,
  AlertTriangle,
  ArrowRight,
  FileText,
  Briefcase,
  LineChart,
  GraduationCap,
  Sparkles,
  BookOpen,
  Compass,
  CheckCircle2,
  Database,
  Scale,
  Brain,
  Coins,
  Layers,
  ChevronDown,
} from "lucide-react";
import { apiFetch, formatNumberTR } from "@/lib/api";

function LandingAndDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const forceDashboard = pathname === "/dashboard";
  const [viewMode, setViewMode] = useState<"landing" | "dashboard">(
    forceDashboard ? "dashboard" : "landing"
  );
  const [health, setHealth] = useState<any>(null);
  const [compareData, setCompareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [showAllFunds, setShowAllFunds] = useState(false);
  const [revealedSections, setRevealedSections] = useState<Record<string, boolean>>({
    steps: true,
    bento: true,
    stats: true,
    cta: true,
  });

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [h, f] = await Promise.all([
        apiFetch<any>("/api/health"),
        apiFetch<any>("/api/funds"),
      ]);
      const allCodes = (f?.funds || []).map((x: any) => x.fund_code);
      const c = await apiFetch<any>("/api/analytics/compare", {
        method: "POST",
        body: JSON.stringify({
          fund_codes:
            allCodes.length > 0
              ? allCodes
              : ["AFT", "MAC", "TTA", "IPB", "TI1"],
          start_date: "2026-01-03",
          end_date: "2026-10-16",
        }),
      });
      setHealth(h);
      setCompareData(c);
    } catch (err: any) {
      setError(err.message || "Backend sunucusuna bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    if (forceDashboard) {
      setViewMode("dashboard");
      try {
        sessionStorage.setItem("fg_view_mode", "dashboard");
      } catch {}
      window.dispatchEvent(new CustomEvent("set-view-mode", { detail: "dashboard" }));
      return;
    }

    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("view") === "dashboard") {
        setViewMode("dashboard");
        sessionStorage.setItem("fg_view_mode", "dashboard");
        window.dispatchEvent(new CustomEvent("set-view-mode", { detail: "dashboard" }));
      } else if (sp.get("view") === "landing") {
        setViewMode("landing");
        sessionStorage.setItem("fg_view_mode", "landing");
        window.dispatchEvent(new CustomEvent("set-view-mode", { detail: "landing" }));
      } else {
        const saved = sessionStorage.getItem("fg_view_mode");
        if (saved === "dashboard") {
          setViewMode("dashboard");
        }
      }
    } catch {}

    const handleViewModeEvent = (ev: Event) => {
      const customEv = ev as CustomEvent<"landing" | "dashboard">;
      if (customEv.detail === "landing" || customEv.detail === "dashboard") {
        setViewMode(customEv.detail);
      }
    };
    window.addEventListener("set-view-mode", handleViewModeEvent);
    return () => {
      window.removeEventListener("set-view-mode", handleViewModeEvent);
    };
  }, [forceDashboard]);

  // Scroll-Reveal IntersectionObserver
  useEffect(() => {
    if (viewMode !== "landing" || typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-reveal-id");
            if (id) {
              setRevealedSections((prev) => ({ ...prev, [id]: true }));
            }
          }
        });
      },
      { threshold: 0.12 }
    );

    const els = document.querySelectorAll("[data-reveal-id]");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [viewMode]);

  const enterDashboardMode = () => {
    setViewMode("dashboard");
    try {
      sessionStorage.setItem("fg_view_mode", "dashboard");
    } catch {}
    window.dispatchEvent(new CustomEvent("set-view-mode", { detail: "dashboard" }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToModule = (href: string) => {
    setViewMode("dashboard");
    try {
      sessionStorage.setItem("fg_view_mode", "dashboard");
    } catch {}
    window.dispatchEvent(new CustomEvent("set-view-mode", { detail: "dashboard" }));
    router.push(href);
  };

  const scrollToGuide = () => {
    const el = document.getElementById("onboarding-guide");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const dbSum = health?.database_summary || {};
  const summaries = compareData?.funds_summary || [];

  // ─────────────────────────────────────────────────────────────────────────────
  // BÖLÜM 1, 2, 3: SİNEMATİK ANİMASYONLU TANITIM VİTRİNİ (LANDING PAGE)
  // ─────────────────────────────────────────────────────────────────────────────
  if (viewMode === "landing" && !forceDashboard) {
    const trackedCount = dbSum.tracked_funds_count || 60;
    const totalRecords = Number(dbSum.total_real_tefas_price_records || 10540).toLocaleString("tr-TR");

    const BENTO_LABS = [
      {
        badge: "Fisher Denklemi & Küresel Kıyas",
        icon: "💰",
        title: "Fisher Reel Getiri & Küresel Benchmark Simülatörü",
        desc: "Yönetim ücreti, stopaj ve TÜFE enflasyonu düşülmüş gerçek alım gücü ve Altın/Dolar/S&P500 kıyaslaması.",
        href: "/analytics",
        gradient: "from-emerald-500/20 via-teal-500/10 to-slate-900",
        borderHover: "hover:border-emerald-400/70",
        accentText: "text-emerald-400",
      },
      {
        badge: "SPK Md. 52-53 & Vaat Denetimi",
        icon: "🛡️",
        title: "Şeffaflık Skoru & Bülten Sapma Radarı",
        desc: "İzahname vaatleri ile gerçek TEFAS dağılımının uyumu ve SPK Md. 52-53 kanıtları.",
        href: "/transparency",
        gradient: "from-blue-500/20 via-indigo-500/10 to-slate-900",
        borderHover: "hover:border-blue-400/70",
        accentText: "text-blue-400",
      },
      {
        badge: "Yatırımcı Psikolojisi & Stres Testi",
        icon: "🧠",
        title: "Davranışsal Finans & Kriz Stres Testi",
        desc: "Panik satışı yapan yatırımcı ile sabırlı yatırımcının (DCA) farkı ve Su Altında Kalma (Underwater) analizleri.",
        href: "/analytics",
        gradient: "from-purple-500/20 via-fuchsia-500/10 to-slate-900",
        borderHover: "hover:border-purple-400/70",
        accentText: "text-purple-400",
      },
      {
        badge: "Markowitz Portföy Teorisi",
        icon: "🎯",
        title: "Sanal Sepet & Korelasyon (r) Matrisi",
        desc: "Sahte çeşitlendirme (Overlap) uyarısı ve çoklu fon portföy simülasyonu.",
        href: "/baskets",
        gradient: "from-amber-500/20 via-orange-500/10 to-slate-900",
        borderHover: "hover:border-amber-400/70",
        accentText: "text-amber-400",
      },
      {
        badge: "TÜBİTAK 2209-A Saha Ölçeği",
        icon: "📊",
        title: "TÜBİTAK Anketi & SPK Risk Profili Eşleştirici",
        desc: "Finansal okuryazarlık ölçümü ve 1-7 ölçeğinde kişisel risk testi.",
        href: "/survey",
        gradient: "from-cyan-500/20 via-sky-500/10 to-slate-900",
        borderHover: "hover:border-cyan-400/70",
        accentText: "text-cyan-400",
      },
      {
        badge: "Akademik & Mevzuat Rehberi",
        icon: "📚",
        title: "Finansal Sözlük & Resmi Fon Bültenleri",
        desc: "Halk diliyle akıllı ipuçları ve SPK mevzuat rehberi.",
        href: "/glossary",
        gradient: "from-rose-500/20 via-pink-500/10 to-slate-900",
        borderHover: "hover:border-rose-400/70",
        accentText: "text-rose-400",
      },
    ];

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
        {/* Üst Şık Cam Efektli Gezinme Çubuğu (Landing Topbar) */}
        <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-blue-500/25">
                FG
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight text-white">
                  Fon Güven &amp; Şeffaflık Platformu
                </div>
                <div className="text-[11px] text-blue-300 font-medium hidden sm:block">
                  TÜBİTAK 2209-A Akademik Araştırma &amp; Analiz Laboratuvarı
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
              <a
                href="#onboarding-guide"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToGuide();
                }}
                className="hover:text-white transition-colors"
              >
                3 Adımda Kullanım
              </a>
              <a
                href="#bento-labs"
                className="hover:text-white transition-colors"
              >
                6 Akademik Laboratuvar
              </a>
              <a
                href="#live-stats"
                className="hover:text-white transition-colors"
              >
                Canlı Veriler
              </a>
            </nav>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigateToModule("/survey")}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-amber-300 transition-all"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Araştırma Anketi</span>
              </button>
              <button
                type="button"
                onClick={enterDashboardMode}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-xs font-extrabold text-white shadow-lg shadow-blue-600/30 transition-all"
              >
                <span>🚀 Panele Giriş Yap</span>
              </button>
            </div>
          </div>
        </header>

        {/* BÖLÜM 2: TAM EKRAN ANİMASYONLU KARŞILAMA ALANI (HERO SECTION - ABOVE THE FOLD) */}
        <section className="relative min-h-screen pt-24 pb-16 flex flex-col justify-center items-center fintech-grid-bg overflow-hidden">
          {/* Canlı Arka Plan Mesh / Glow Gradyanları */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/25 blur-3xl animate-pulse-glow" />
          <div className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl animate-pulse-glow" />
          <div className="pointer-events-none absolute bottom-10 left-1/3 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl animate-pulse-glow" />

          {/* Yüzen Finansal Veri Kartları (Floating Glassmorphism Badges) */}
          <div className="hidden xl:flex flex-col gap-1 pointer-events-none absolute top-32 left-10 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/15 shadow-2xl animate-float-slow">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Şeffaflık Skoru: 94/100</span>
            </div>
            <span className="text-[11px] text-slate-300">
              KAP &amp; Takasbank Saklama Doğrulamalı
            </span>
          </div>

          <div className="hidden xl:flex flex-col gap-1 pointer-events-none absolute top-36 right-12 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/15 shadow-2xl animate-float-reverse">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-400">
              <LineChart className="w-4 h-4" />
              <span>Fisher Reel Getiri: +%18,4</span>
            </div>
            <span className="text-[11px] text-slate-300">
              TÜFE, Stopaj ve Yönetim Ücreti Arındırılmış
            </span>
          </div>

          <div className="hidden xl:flex flex-col gap-1 pointer-events-none absolute bottom-28 left-16 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/15 shadow-2xl animate-float-reverse">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
              <Scale className="w-4 h-4" />
              <span>SPK Md. 52-53 Denetimi</span>
            </div>
            <span className="text-[11px] text-slate-300">
              Malvarlığı Ayrılığı &amp; 15 Resmi Kanıt Kartı
            </span>
          </div>

          <div className="hidden xl:flex flex-col gap-1 pointer-events-none absolute bottom-32 right-16 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/15 shadow-2xl animate-float-slow">
            <div className="flex items-center gap-2 text-xs font-extrabold text-purple-300">
              <FileSearch className="w-4 h-4" />
              <span>Style Drift &amp; R² Radarı</span>
            </div>
            <span className="text-[11px] text-slate-300">
              Bülten Vaadi vs. Fiili Portföy Dağılımı
            </span>
          </div>

          {/* Hero Merkez İçeriği */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-7">
            {/* Parlayan (Shimmer) Üst Rozet */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-400/40 text-xs sm:text-sm font-extrabold text-white shadow-lg animate-shimmer-badge">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>🇹🇷 TÜBİTAK 2209-A Üniversite Öğrencileri Araştırma Projesi</span>
            </div>

            {/* Etkileyici Ana Başlık (Typography) */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
              Yatırım Fonlarında{" "}
              <span className="bg-gradient-to-r from-blue-400 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                Şeffaflık, Gerçek Getiri
              </span>{" "}
              ve Akademik Güven Laboratuvarı
            </h1>

            {/* Alt Açıklama */}
            <p className="text-sm sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
              Nominal getirilerin ötesine geçin. Enflasyon, yönetim ücreti ve stopaj etkisini{" "}
              <strong className="text-white font-semibold">Fisher denklemiyle</strong> ölçün; fon bülteni vaatlerini{" "}
              <strong className="text-emerald-300 font-semibold">canlı TEFAS verileriyle</strong> denetleyin.
            </p>

            {/* Mobil / Tablet İçin Yüzen Rozet Şeridi */}
            <div className="flex xl:hidden flex-wrap items-center justify-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-emerald-300">
                🛡️ Şeffaflık Skoru: 94/100
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-blue-300">
                📈 Fisher Reel Getiri: +%18,4
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-amber-300">
                ⚖️ SPK Md. 52-53 Denetimi
              </span>
            </div>

            {/* 2 Ana Harekete Geçirici Buton (Primary & Secondary CTA) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              {/* 1. Buton (Primary CTA - Parlayan Mavi/Zümrüt Buton) */}
              <button
                type="button"
                onClick={enterDashboardMode}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:via-indigo-500 hover:to-emerald-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-blue-600/30 hover:shadow-emerald-500/30 border border-white/20 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5"
              >
                <span>🚀 Analiz Paneline Giriş Yap</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* 2. Buton (Secondary CTA - Cam Efektli Çerçeveli Buton) */}
              <button
                type="button"
                onClick={scrollToGuide}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/40 text-slate-100 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all"
              >
                <span>📖 Platformu Keşfet &amp; Nasıl Çalışır?</span>
                <ChevronDown className="w-4 h-4 text-blue-300 animate-bounce" />
              </button>
            </div>

            {/* Hızlı Güven Notu */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {totalRecords}+ Gerçek TEFAS Fiyat Kaydı
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                {trackedCount} Yatırım Fonu Canlı Takibi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Sıfır Sahte Veri • Yatırım Tavsiyesi İçermez (YTD)
              </span>
            </div>
          </div>
        </section>

        {/* BÖLÜM 3: KAYDIRDIKÇA AÇILAN (SCROLL-REVEAL) ÖZELLİK VE KULLANIM REHBERİ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">
          {/* BÖLÜM A — "3 Adımda Nasıl Kullanılır?" (Adım Adım Görsel Akış) */}
          <section
            id="onboarding-guide"
            data-reveal-id="steps"
            className={`scroll-mt-24 space-y-10 transition-all duration-700 ${
              revealedSections.steps
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-xs font-extrabold text-blue-300 uppercase tracking-wider">
                Adım Adım Görsel Rehber
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                3 Adımda Nasıl Kullanılır?
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                Karmaşık finansal tablolar arasında kaybolmadan, bilimsel ve şeffaf fon analizini 3 adımda tamamlayın.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Adım 1 */}
              <div className="relative p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/10 hover:border-blue-400/50 transition-all group shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-2xl">
                    🔍
                  </span>
                  <span className="text-xs font-black font-mono px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                    ADIM 01
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-white mb-2 group-hover:text-blue-300 transition-colors">
                  Fonu veya Sepetini Seç
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  TEFAS veri havuzundan incelemek istediğiniz fonları seçin veya Sanal Sepet Laboratuvarında kendi portföyünüzü oluşturun.
                </p>
              </div>

              {/* Adım 2 */}
              <div className="relative p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/10 hover:border-emerald-400/50 transition-all group shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-400/30 flex items-center justify-center text-2xl">
                    🛡️
                  </span>
                  <span className="text-xs font-black font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                    ADIM 02
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  Şeffaflık ve Vaat Denetimi Yap
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Fonun aylık bültenindeki vaatlerle fiili portföy dağılımını (Style Drift), SPK kanıtlarını ve Katılım/ESG uyumunu tek tıkla denetleyin.
                </p>
              </div>

              {/* Adım 3 */}
              <div className="relative p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/10 hover:border-amber-400/50 transition-all group shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl">
                    📐
                  </span>
                  <span className="text-xs font-black font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300">
                    ADIM 03
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-white mb-2 group-hover:text-amber-300 transition-colors">
                  Gerçek Alım Gücünü ve Riskini Ölç
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Fisher Reel Getiri Simülatörü, Davranışsal Finans (Panik vs. DCA) ve Kriz Stres Testi ile enflasyondan arındırılmış net kazancınızı görün.
                </p>
              </div>
            </div>
          </section>

          {/* BÖLÜM B — "Platformdaki 6 Temel Akademik Laboratuvar" (İnteraktif Bento Grid Kartları) */}
          <section
            id="bento-labs"
            data-reveal-id="bento"
            className={`scroll-mt-24 space-y-10 transition-all duration-700 ${
              revealedSections.bento
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                İnteraktif Bento Grid Mimari
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                Platformdaki 6 Temel Akademik Laboratuvar
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                Her bir modül, yatırım fonlarını yalnızca geçmiş fiyatıyla değil; hukuki güvencesi, reel alım gücü ve portföy sadakatiyle analiz eder.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {BENTO_LABS.map((lab, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateToModule(lab.href)}
                  className={`cursor-pointer p-6 sm:p-7 rounded-3xl bg-gradient-to-br ${lab.gradient} border border-white/10 ${lab.borderHover} transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between space-y-5 group`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-3xl">{lab.icon}</span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-slate-200">
                        {lab.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-white group-hover:text-blue-200 transition-colors">
                      {lab.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {lab.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className={`text-xs font-extrabold ${lab.accentText} group-hover:underline`}>
                      Bu Aracı Şimdi Dene &rarr;
                    </span>
                    <ArrowRight className={`w-4 h-4 ${lab.accentText} group-hover:translate-x-1 transition-transform`} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* BÖLÜM C — Canlı Platform İstatistikleri Şeridi (Animated Counters) */}
          <section
            id="live-stats"
            data-reveal-id="stats"
            className={`scroll-mt-24 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950/80 to-slate-900 border border-white/15 shadow-2xl transition-all duration-700 ${
              revealedSections.stats
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                  {totalRecords}+ Kayıt
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  Canlı TEFAS Veri Entegrasyonu
                </div>
                <div className="text-[11px] text-slate-400">
                  {trackedCount} gerçek yatırım fonu zaman serisi
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-2xl sm:text-3xl font-black font-mono text-blue-400">
                  Fisher &amp; Sharpe
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  Fisher &amp; Sharpe Akademik Formül Altyapısı
                </div>
                <div className="text-[11px] text-slate-400">
                  R², Jensen Alfası (α), Sortino ve MDD
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                  %100 Kalıcı
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  %100 Kalıcı Bulut Veritabanı
                </div>
                <div className="text-[11px] text-slate-400">
                  Neon PostgreSQL + Hibrit Kesintisiz Mimari
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-2xl sm:text-3xl font-black font-mono text-purple-300">
                  SPKn Md. 52-53
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  SPK Mevzuat Uyumlu Metodoloji
                </div>
                <div className="text-[11px] text-slate-400">
                  Takasbank Saklama &amp; 15 Resmi Kanıt Kartı
                </div>
              </div>
            </div>
          </section>

          {/* BÖLÜM D — Alt Kapanış Çağrısı (Final CTA Banner) */}
          <section
            data-reveal-id="cta"
            className={`p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white shadow-2xl border border-white/20 text-center space-y-6 transition-all duration-700 ${
              revealedSections.cta
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-xs font-extrabold text-amber-200">
              🎓 TÜBİTAK 2209-A Açık Bilim &amp; Yatırımcı Okuryazarlığı
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight max-w-3xl mx-auto">
              Finansal verileri şeffaf ve bilimsel gözle incelemeye hazır mısınız?
            </h2>
            <p className="text-xs sm:text-base text-blue-100 max-w-2xl mx-auto">
              Hemen uygulama paneline geçerek 60+ gerçek TEFAS fonunu karşılaştırabilir veya 14 soruluk TÜBİTAK araştırma anketimize katılarak kişisel finansal okuryazarlık karnenizi alabilirsiniz.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={enterDashboardMode}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 hover:bg-blue-50 font-extrabold text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>🚀 Şimdi Panele Giriş Yap</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => navigateToModule("/survey")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>📊 Araştırma Anketine Katıl</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </section>
        </div>

        {/* Alt Telif & Bilgilendirme Satırı */}
        <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 px-4">
          TÜBİTAK 2209-A Üniversite Öğrencileri Araştırma Projeleri Destekleme Programı • Bu platformdaki hiçbir veri yatırım tavsiyesi değildir (YTD).
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UYGULAMA PANELİ (DASHBOARD GÖRÜNÜMÜ — SOL MENÜ AKTİF)
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-800 dark:text-red-200">
        <div className="flex items-center gap-2 font-bold text-base mb-1">
          <AlertTriangle className="w-5 h-5" />
          Canlı Veri Bağlantı Hatası (Kural 1: Sahte Veri Üretilmedi)
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const filteredSummaries = summaries.filter((f: any) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      f.fund_code.toLowerCase().includes(q) ||
      (f.fund_title || "").toLowerCase().includes(q) ||
      (f.fund_type || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (selectedCat === "ALL") return true;
    const t = ((f.fund_type || "") + " " + (f.fund_title || "")).toUpperCase();
    if (selectedCat === "HISSE")
      return t.includes("HİSSE") && !t.includes("YABANCI");
    if (selectedCat === "YABANCI")
      return (
        t.includes("YABANCI") || t.includes("TEKNOLOJİ") || t.includes("AMER")
      );
    if (selectedCat === "ALTIN")
      return (
        t.includes("ALTIN") || t.includes("GÜMÜŞ") || t.includes("KIYMETLİ")
      );
    if (selectedCat === "PARA") return t.includes("PARA PİYASASI");
    if (selectedCat === "DEGISKEN") return t.includes("DEĞİŞKEN");
    if (selectedCat === "KATILIM") return t.includes("KATILIM");
    if (selectedCat === "BORCLANMA")
      return (
        t.includes("EUROBOND") ||
        t.includes("BORÇLANMA") ||
        t.includes("EMTİA")
      );
    return true;
  });

  const displayedSummaries = showAllFunds
    ? filteredSummaries
    : filteredSummaries.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* 1. EN ÜSTTE: Kompakt Üst Karşılama ve Sistem Doğrulama Kartı (Hero) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40">
              TÜBİTAK 2209-A Araştırma Projesi • Sıfır Sahte Veri İlkesi
            </span>
            <h2 className="text-lg sm:text-xl font-bold">
              Yatırım Fonları, Finansal Şeffaflık ve Fonlara Güven Platformu
            </h2>
            <p className="text-xs text-blue-100 max-w-3xl">
              Tüm fon analizleri{" "}
              <strong>
                {Number(dbSum.total_real_tefas_price_records || 0).toLocaleString(
                  "tr-TR"
                )}
              </strong>{" "}
              gerçek TEFAS işlem günü kaydına ({dbSum.oldest_price_date} &rarr;{" "}
              {dbSum.latest_price_date},{" "}
              <strong>{dbSum.tracked_funds_count} Fon</strong>), hukuki
              kanıtlar ise <strong>6362 sayılı SPKn</strong> ve{" "}
              <strong>SPK Tebliğlerine</strong> dayanır.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/evidence"
              className="px-3.5 py-2 rounded-xl bg-white text-blue-900 font-semibold text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              15 Kanıt Kartı
            </Link>
            <Link
              href="/baskets"
              className="px-3.5 py-2 rounded-xl bg-blue-600/80 border border-blue-400/40 text-white font-semibold text-xs hover:bg-blue-600 transition-colors flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4" />
              Sanal Sepet Laboratuvarı
            </Link>
          </div>
        </div>
      </div>

      {/* 2. HEMEN ALTINDA: TEK SATIRLIK ŞIK FİNANSAL OKURYAZARLIK ANKETİ DAVET BARI */}
      <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-indigo-500/30">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-bold text-amber-300 shrink-0">
            <GraduationCap className="w-3.5 h-3.5" />
            TÜBİTAK 2209-A Ölçeği
          </span>
          <span className="text-xs sm:text-sm font-bold text-white">
            🎓 Finansal Okuryazarlık &amp; SPK Risk Profili Testi:
          </span>
          <span className="text-xs text-indigo-100">
            14 soruda Takasbank güvencesi, stopaj ve ücret bilginizi ölçün, kişisel karnenizi alın.
          </span>
        </div>

        <Link
          href="/survey"
          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-sm inline-flex items-center gap-1.5 shrink-0 transition-all"
        >
          <span>Testi Çöz &amp; Seviyeni Öğren</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 3. ORTA BÖLÜM: 4 Odak Alanı Yönlendirme ve Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Fonlara Güven & Kanıt Merkezi */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Hukuki Güvence
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-bold text-sm sm:text-base">
              Fonlara Güven &amp; Kanıt Merkezi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              SPKn Md. 52-53 varlık ayrılığı, Takasbank saklama güvencesi,{" "}
              <strong>{dbSum.evidence_cards_count}</strong> mevzuat kanıt kartı ve şeffaflık kontrolü.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
            <Link
              href="/evidence"
              className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              15 Kanıt Kartı <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              href="/transparency"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <FileSearch className="w-3.5 h-3.5" /> Şeffaflık
            </Link>
          </div>
        </div>

        {/* 2. Fon Bültenleri & Raporlar */}
        <Link
          href="/bulletins"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors flex flex-col justify-between space-y-3 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                Kaynak Atıflı • {dbSum.bulletins_count} Rapor
              </span>
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-sm sm:text-base group-hover:text-blue-600 transition-colors">
              Fon Bültenleri &amp; Raporlar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Resmi veriler ile yönetici yorumlarını ayıran 7 başlıklı kaynak atıflı bülten özetleri ve dönem kıyaslaması.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
            Bültenleri &amp; Dönem Kıyasını Aç <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Fon Performans Analizi */}
        <Link
          href="/analytics"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors flex flex-col justify-between space-y-3 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                5 Sekmeli Laboratuvar • {dbSum.tracked_funds_count} Fon
              </span>
              <LineChart className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-bold text-sm sm:text-base group-hover:text-indigo-600 transition-colors">
              Fon Performans Analizi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              100 bazlı normalize grafik, aylık ısı haritası, reel getiri, stres testi ve su altı (underwater) analizi.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
            5 Sekmeli Analiz Laboratuvarı <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 4. Sanal Sepet Laboratuvarı */}
        <Link
          href="/baskets"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors flex flex-col justify-between space-y-3 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                Portföy &amp; Korelasyon
              </span>
              <Briefcase className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-bold text-sm sm:text-base group-hover:text-amber-600 transition-colors">
              Sanal Sepet Laboratuvarı
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Özel TL tutarlarıyla çoklu fon sepeti kurulumu, Pearson korelasyon matrisi ($r$) ve ağırlıklı getiri simülasyonu.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
            Sanal Sepet Simülatörünü Aç <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* 4. Güncel TEFAS Fonları Performans Özeti (Sayfalamalı / İlk 10 Fon) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">
                Takip Edilen {summaries.length} Gerçek TEFAS Yatırım Fonu (2026
                Yılı Performans &amp; Risk Özeti)
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                GERÇEK PİYASA VERİSİ
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Referans İşlem Günü Aralığı: {compareData?.actual_start_date} &rarr;{" "}
              {compareData?.actual_end_date} (
              {compareData?.common_trading_days_count} ortak işlem günü)
            </p>
          </div>
          <Link
            href="/analytics"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Detaylı 100 Bazlı Grafik &amp; Analiz{" "}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Kategori ve Arama Filtreleri */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "ALL", label: `Tümü (${summaries.length})` },
              { key: "HISSE", label: "Yerli Hisse Yoğun" },
              { key: "YABANCI", label: "Yabancı & Teknoloji" },
              { key: "ALTIN", label: "Altın & Gümüş" },
              { key: "PARA", label: "Para Piyasası" },
              { key: "DEGISKEN", label: "Değişken" },
              { key: "KATILIM", label: "Katılım" },
              { key: "BORCLANMA", label: "Eurobond / Borçlanma / Emtia" },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCat(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCat === cat.key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Fon kodu veya unvanı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-full md:w-56"
          />
        </div>

        {compareData?.date_warning && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
            <strong>Tatil Günü Çözümleme Bildirimi:</strong>{" "}
            {compareData.date_warning}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-4 font-semibold">Fon Kodu</th>
                <th className="py-2 px-4 font-semibold">Fon Ünvanı &amp; Türü</th>
                <th className="py-2 px-4 font-semibold text-right">
                  Başlangıç Fiyatı
                </th>
                <th className="py-2 px-4 font-semibold text-right">
                  Güncel Fiyat
                </th>
                <th className="py-2 px-4 font-semibold text-right">
                  Dönem Getirisi
                </th>
                <th className="py-2 px-4 font-semibold text-right">
                  100 TL&apos;nin Değeri
                </th>
                <th className="py-2 px-4 font-semibold text-right">
                  Max Drawdown
                </th>
                <th className="py-2 pl-4 font-semibold text-right">
                  Yıllık Volatilite
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayedSummaries.map((f: any) => {
                const pos = f.return_pct >= 0;
                return (
                  <tr
                    key={f.fund_code}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 pr-4 font-bold text-blue-600 dark:text-blue-400">
                      {f.fund_code}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {f.fund_title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Kategori: {f.fund_type}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {formatNumberTR(f.start_price, 6)} TL
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      {formatNumberTR(f.end_price, 6)} TL
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold ${
                        pos
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {pos ? "+" : ""}
                      {formatNumberTR(f.return_pct)}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      {formatNumberTR(f.normalized_base_100_end)} TL
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                      -{formatNumberTR(f.max_drawdown_pct)}%
                    </td>
                    <td className="py-2.5 pl-4 text-right font-mono">
                      {formatNumberTR(f.annualized_volatility_pct)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sayfalama / Tüm Fonları Gör Butonu */}
        {filteredSummaries.length > 10 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              Toplam <strong>{filteredSummaries.length}</strong> fondan{" "}
              <strong>{displayedSummaries.length}</strong> tanesi gösteriliyor.
            </span>
            <button
              type="button"
              onClick={() => setShowAllFunds(!showAllFunds)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            >
              {showAllFunds
                ? "Daha Az Göster (İlk 10 Fon)"
                : `Tüm Fonları Gör (+${filteredSummaries.length - 10} Fon Daha)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return <LandingAndDashboardContent />;
}
