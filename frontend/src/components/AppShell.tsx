"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
            site_logo_url: res.site_logo_url || "",
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

    // Render Free Tier Uyku Önleyici (Keep-Alive: Her 10 dakikada bir /api/health ping)
    const keepAliveTimer = window.setInterval(() => {
      apiFetch<any>("/api/health").catch(() => {});
    }, 10 * 60 * 1000);

    return () => {
      window.removeEventListener("branding-updated", handleBrandingEvent);
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
    ? branding.site_logo_url.startsWith("http")
      ? branding.site_logo_url
      : `${API_BASE_URL}${branding.site_logo_url}`
    : "";

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Masaüstü Yan Menü (Sidebar) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2.5">
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
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Gerçek Veri İlkesi Aktif
            </div>
            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Tüm fon fiyatları canlı TEFAS/SQLite kayıtlarından; hukuki iddialar
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
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm">{branding.site_title}</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
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
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800"
              aria-label="Menüyü Aç"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {branding.site_title} — {branding.site_subtitle}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Fonlara Güven & Kanıt Merkezi • Fon Şeffaflık Kontrolü • Fon
                Bültenleri & Raporlar • Fon Performans Analizi • Sanal Sepet
                Laboratuvarı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
              SPKn Md. 52-53 & TEFAS Doğrulamalı
            </span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Açık / Koyu Tema Değiştir"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Sağ Alt Yüzen Mini-Anket Widget'ı */}
        <FloatingQuickPoll />
      </div>
    </div>
  );
}
