"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  FileSearch,
  FileText,
  LineChart,
  Briefcase,
  Sun,
  Moon,
  Menu,
  X,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Megaphone,
  ArrowRight,
  Home,
} from "lucide-react";
import { API_BASE_URL, apiFetch, trackTelemetryEvent } from "@/lib/api";
import FloatingQuickPoll from "@/components/FloatingQuickPoll";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Ana Sayfa (Genel Bakış)",
    icon: LayoutDashboard,
  },
  {
    href: "/survey",
    label: "Okuryazarlık Anketi & Test",
    icon: GraduationCap,
  },
  {
    href: "/evidence",
    label: "Fonlara Güven & Kanıt Merkezi",
    icon: ShieldCheck,
  },
  {
    href: "/transparency",
    label: "Fon Şeffaflık Kontrolü",
    icon: FileSearch,
  },
  {
    href: "/bulletins",
    label: "Fon Bültenleri & Raporlar",
    icon: FileText,
  },
  {
    href: "/analytics",
    label: "Fon Performans Analizi",
    icon: LineChart,
  },
  {
    href: "/baskets",
    label: "Sanal Sepet Laboratuvarı",
    icon: Briefcase,
  },
  {
    href: "/glossary",
    label: "Finansal Sözlük & SPK Rehberi",
    icon: BookOpen,
  },
  {
    href: "/contact",
    label: "İletişim & Geri Bildirim",
    icon: MessageSquare,
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"landing" | "dashboard">("landing");
  const [branding, setBranding] = useState({
    site_title: "Fon Güven & Şeffaflık",
    site_subtitle: "TÜBİTAK 2209-A Araştırma Platformu",
    site_logo_url: "",
  });
  const [syncInfo, setSyncInfo] = useState<any>(null);
  const [announcement, setAnnouncement] = useState<any>({
    enabled: true,
    text: "🎓 TÜBİTAK 2209-A Finansal Okuryazarlık & Fon Algı Araştırmamız yayında! Testi çözün ve seviyenizi anında öğrenin.",
    badge: "TÜBİTAK 2209-A",
    bg_color: "indigo",
    link_url: "/survey",
  });
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const loadBrandingAndSync = () => {
    apiFetch<any>("/api/public/settings")
      .then((res) => {
        if (res && res.site_title) {
          setBranding({
            site_title: res.site_title || "Fon Güven & Şeffaflık",
            site_subtitle:
              res.site_subtitle || "TÜBİTAK 2209-A Araştırma Platformu",
            site_logo_url: res.site_logo || res.site_logo_url || "",
          });
        }
      })
      .catch(() => {});

    apiFetch<any>("/api/public/sync-status")
      .then((res) => setSyncInfo(res))
      .catch(() => {});

    apiFetch<any>("/api/announcement")
      .then((res) => {
        if (res) setAnnouncement(res);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
    loadBrandingAndSync();

    const handleBrandingEvent = () => loadBrandingAndSync();
    window.addEventListener("branding-updated", handleBrandingEvent);

    const handleViewModeEvent = (ev: Event) => {
      const customEv = ev as CustomEvent<"landing" | "dashboard">;
      if (customEv.detail === "landing" || customEv.detail === "dashboard") {
        setViewMode(customEv.detail);
        try {
          sessionStorage.setItem("fg_view_mode", customEv.detail);
        } catch {}
      }
    };
    window.addEventListener("set-view-mode", handleViewModeEvent);

    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("view") === "dashboard") {
        setViewMode("dashboard");
        sessionStorage.setItem("fg_view_mode", "dashboard");
      } else if (sp.get("view") === "landing") {
        setViewMode("landing");
        sessionStorage.setItem("fg_view_mode", "landing");
      } else {
        const storedMode = sessionStorage.getItem("fg_view_mode");
        if (storedMode === "dashboard") {
          setViewMode("dashboard");
        }
      }
    } catch {}

    // Render Free Tier Uyku Önleyici (Keep-Alive: Her 10 dakikada bir /api/health ping)
    const keepAliveTimer = window.setInterval(() => {
      apiFetch<any>("/api/health").catch(() => {});
    }, 10 * 60 * 1000);

    return () => {
      window.removeEventListener("branding-updated", handleBrandingEvent);
      window.removeEventListener("set-view-mode", handleViewModeEvent);
      window.clearInterval(keepAliveTimer);
    };
  }, []);

  // BÖLÜM 3: Sayfa Görüntülenme (PAGE_VIEW) ve Sayfada Kalma Süresi (TIME_ON_PAGE) Telemetrisi
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const moduleName = pathname === "/" ? "home" : pathname.replace(/^\//, "");
    const enteredAt = Date.now();
    let reportedDurationSec = 0;

    trackTelemetryEvent({
      event_type: "PAGE_VIEW",
      module_name: moduleName,
      duration_seconds: 0,
    });

    const flushDuration = () => {
      const elapsedSec = Math.round((Date.now() - enteredAt) / 1000);
      const deltaSec = elapsedSec - reportedDurationSec;
      if (deltaSec >= 3 && deltaSec <= 1800) {
        reportedDurationSec = elapsedSec;
        trackTelemetryEvent({
          event_type: "TIME_ON_PAGE",
          module_name: moduleName,
          duration_seconds: deltaSec,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushDuration();
      }
    };

    window.addEventListener("beforeunload", flushDuration);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      flushDuration();
      window.removeEventListener("beforeunload", flushDuration);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const resolvedLogoSrc = branding.site_logo_url
    ? branding.site_logo_url.startsWith("http") ||
      branding.site_logo_url.startsWith("data:")
      ? branding.site_logo_url
      : `${API_BASE_URL}${branding.site_logo_url}`
    : "";

  const returnToLanding = () => {
    setMobileOpen(false);
    setViewMode("landing");
    try {
      sessionStorage.setItem("fg_view_mode", "landing");
    } catch {}
    window.dispatchEvent(new CustomEvent("set-view-mode", { detail: "landing" }));
    if (pathname !== "/") {
      router.push("/?view=landing");
    }
  };

  const enterDashboard = () => {
    setMobileOpen(false);
    setViewMode("dashboard");
    try {
      sessionStorage.setItem("fg_view_mode", "dashboard");
    } catch {}
    window.dispatchEvent(new CustomEvent("set-view-mode", { detail: "dashboard" }));
  };

  // Kullanıcı "/" (Ana Sayfa) üzerinde ve "landing" (Tanıtım Vitrini) modundaysa Sol Menü (Sidebar) ve App Header gizlenir
  const isLandingFullscreen = pathname === "/" && viewMode === "landing";

  if (isLandingFullscreen) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Masaüstü Yan Menü (Sidebar) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          {/* Sol Menünün En Üstü: 🏠 Tanıtım Ekranına Dön Butonu (BÖLÜM 1) */}
          <button
            type="button"
            onClick={returnToLanding}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600/10 via-blue-600/10 to-emerald-600/10 dark:from-indigo-500/20 dark:via-blue-500/20 dark:to-emerald-500/20 border border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 transition-all shadow-sm group"
          >
            <span className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>🏠 Tanıtım Ekranına Dön</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5">
            {resolvedLogoSrc ? (
              <img
                src={resolvedLogoSrc}
                alt={branding.site_title}
                className="w-9 h-9 rounded-xl object-contain bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                FG
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight text-slate-900 dark:text-white truncate">
                {branding.site_title}
              </div>
              <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate">
                {branding.site_subtitle}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/" && pathname === "/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={enterDashboard}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
          {/* Sol Menü Tema Değiştirici (BÖLÜM 2) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
            title="Açık / Koyu Tema Değiştir"
          >
            <span className="flex items-center gap-2">
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>☀️ Açık Tema</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>🌙 Koyu Tema</span>
                </>
              )}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              {darkMode ? "Koyu Aktif" : "Açık Aktif"}
            </span>
          </button>

          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Gerçek Veri İlkesi Aktif
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400 leading-snug">
              Tüm fon fiyatları canlı TEFAS/PostgreSQL kayıtlarından; hukuki iddialar
              6362 sayılı SPKn ve SPK Tebliğlerinden beslenir.
            </p>
            {syncInfo?.database_state?.latest_price_date && (
              <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/50 flex items-center gap-1 text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
                <RefreshCw className="w-3 h-3" />
                Son TEFAS Verisi: {syncInfo.database_state.latest_price_date} (
                {syncInfo.database_state.tracked_funds_count} Fon)
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobil Çekmece Menü */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col z-10 p-4">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{branding.site_title}</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={returnToLanding}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-extrabold text-indigo-700 dark:text-indigo-300"
              >
                <span>🏠 Tanıtım Ekranına Dön</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <nav className="flex-1 py-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href === "/" && pathname === "/dashboard");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={enterDashboard}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <span className="flex items-center gap-2">
                  {darkMode ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>☀️ Açık Tema</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-indigo-600" />
                      <span>🌙 Koyu Tema</span>
                    </>
                  )}
                </span>
                <span className="text-[10px] text-slate-500">
                  {darkMode ? "Koyu Aktif" : "Açık Aktif"}
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Ana İçerik Alanı */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Canlı Duyuru & Bilgi Bandı (Admin Kontrollü) */}
        {announcement?.enabled && !announcementDismissed && (
          <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white text-xs font-medium py-2 px-4 px-lg-8 flex items-center justify-between gap-3 shadow-inner z-40">
            <Link
              href={announcement.link_url || "/survey"}
              className="flex items-center gap-2 hover:underline min-w-0 flex-1"
            >
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px] shrink-0">
                {announcement.badge || "TÜBİTAK 2209-A"}
              </span>
              <span className="truncate">{announcement.text}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-80" />
            </Link>
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              className="p-1 rounded hover:bg-white/10 shrink-0 text-white/80 hover:text-white"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Üst Bilgi Çubuğu (Header) */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800"
              aria-label="Menüyü Aç"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {resolvedLogoSrc && (
                  <img
                    src={resolvedLogoSrc}
                    alt={branding.site_title}
                    className="w-6 h-6 rounded-lg object-contain lg:hidden shrink-0"
                  />
                )}
                <span>
                  {branding.site_title} — {branding.site_subtitle}
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Fonlara Güven & Kanıt Merkezi • Fon Şeffaflık Kontrolü • Fon
                Bültenleri & Raporlar • Fon Performans Analizi • Sanal Sepet
                Laboratuvarı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
              SPKn Md. 52-53 & TEFAS Doğrulamalı
            </span>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Sağ Alt Yüzen Mini-Anket Widget'ı */}
        <FloatingQuickPoll />
      </div>
    </div>
  );
}
