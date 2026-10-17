"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { API_BASE_URL, apiFetch } from "@/lib/api";

interface SplashSettingsResponse {
  splash_enabled: boolean;
  splash_duration_ms: number;
  splash_quotes: string[];
  site_title?: string;
  site_subtitle?: string;
  site_logo_url?: string;
}

const DEFAULT_FALLBACK_QUOTES: string[] = [
  "Finansta en değerli sermaye doğru ve doğrulanabilir bilgidir.",
  "Yatırımlarınızı sloganlara değil, resmi kanıtlara dayandırın.",
  "Şeffaflık güveni, bilinçli çeşitlendirme ise geleceği korur.",
  "Geçmiş getiri bir teminat değildir; ancak finansal okuryazarlık kalıcı bir güçtür.",
  "Büyük birikimler, küçük ve disiplinli adımlarla inşa edilir.",
];

export default function SplashScreen() {
  const [shouldRender, setShouldRender] = useState<boolean>(true);
  const [fadingOut, setFadingOut] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(12);

  const [siteTitle, setSiteTitle] = useState<string>("Fon Güven & Şeffaflık");
  const [siteSubtitle, setSiteSubtitle] = useState<string>(
    "TÜBİTAK 2209-A Araştırma Platformu"
  );
  const [siteLogoUrl, setSiteLogoUrl] = useState<string>("");
  const [selectedQuote, setSelectedQuote] = useState<string>(
    DEFAULT_FALLBACK_QUOTES[0]
  );

  useEffect(() => {
    // İlk açılışta rastgele bir varsayılan söz seç
    const initialIdx = Math.floor(
      Math.random() * DEFAULT_FALLBACK_QUOTES.length
    );
    setSelectedQuote(DEFAULT_FALLBACK_QUOTES[initialIdx]);

    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    let unmountTimer: ReturnType<typeof setTimeout> | null = null;
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    const runSplash = async () => {
      let durationMs = 2200;
      let enabled = true;

      try {
        const data = await apiFetch<SplashSettingsResponse>(
          "/api/public/splash-settings"
        );
        enabled = data.splash_enabled !== false;
        durationMs =
          typeof data.splash_duration_ms === "number" &&
          data.splash_duration_ms >= 500
            ? data.splash_duration_ms
            : 2200;

        if (data.site_title) setSiteTitle(data.site_title);
        if (data.site_subtitle) setSiteSubtitle(data.site_subtitle);
        if (data.site_logo_url !== undefined)
          setSiteLogoUrl(data.site_logo_url || "");

        if (Array.isArray(data.splash_quotes) && data.splash_quotes.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * data.splash_quotes.length
          );
          setSelectedQuote(data.splash_quotes[randomIndex]);
        }
      } catch {
        // Backend erişilemezse varsayılanlarla devam et
      }

      if (!enabled) {
        setShouldRender(false);
        return;
      }

      setShouldRender(true);
      setFadingOut(false);
      setProgress(18);

      const stepMs = Math.max(40, Math.floor(durationMs / 22));
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 96 ? prev + 4 : 100));
      }, stepMs);

      fadeTimer = setTimeout(() => {
        setProgress(100);
        setFadingOut(true);
      }, durationMs);

      unmountTimer = setTimeout(() => {
        setShouldRender(false);
      }, durationMs + 700);
    };

    runSplash();

    const handlePreview = () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
      if (progressInterval) clearInterval(progressInterval);
      runSplash();
    };

    window.addEventListener("preview-splash-screen", handlePreview);

    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
      if (progressInterval) clearInterval(progressInterval);
      window.removeEventListener("preview-splash-screen", handlePreview);
    };
  }, []);

  if (!shouldRender) {
    return null;
  }

  const resolvedLogoUrl = siteLogoUrl
    ? siteLogoUrl.startsWith("http")
      ? siteLogoUrl
      : `${API_BASE_URL}${siteLogoUrl}`
    : "";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-12 select-none bg-gradient-to-br from-slate-50 via-emerald-50/70 to-slate-100 dark:from-slate-950 dark:via-emerald-950/60 dark:to-slate-900 transition-opacity duration-700 ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Üst Kurumsal Rozet */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm backdrop-blur-md">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold tracking-wide text-emerald-800 dark:text-emerald-300 uppercase">
          SPK & TEFAS & KAP Resmi Veri Doğrulama Mimarisi
        </span>
      </div>

      {/* Merkez Görsel + Site Başlığı + İlham Verici Söz */}
      <div className="max-w-2xl w-full flex flex-col items-center text-center my-auto space-y-7">
        {/* Nefes Alan / Parlayan Logo veya FG Amblemi */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 rounded-3xl bg-emerald-500/20 dark:bg-emerald-400/15 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-700 shadow-2xl shadow-emerald-600/30 border-2 border-white/80 dark:border-slate-800 flex items-center justify-center overflow-hidden transition-transform duration-700 scale-100 animate-pulse">
            {resolvedLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedLogoUrl}
                alt={siteTitle}
                className="w-full h-full object-contain p-2.5 bg-white dark:bg-slate-900"
              />
            ) : (
              <span className="text-3xl font-black tracking-tighter text-white drop-shadow">
                FG
              </span>
            )}
          </div>
        </div>

        {/* Site Başlığı ve Alt Başlığı */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {siteTitle}
          </h1>
          <p className="text-sm sm:text-base font-medium text-emerald-700 dark:text-emerald-400">
            {siteSubtitle}
          </p>
        </div>

        {/* Motive Edici / İlham Verici Söz Kartı */}
        <div className="relative w-full max-w-xl px-7 py-6 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/90 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              Finansal Okuryazarlık İlkesi
            </span>
          </div>
          <blockquote className="text-base sm:text-lg font-serif italic text-slate-800 dark:text-slate-100 leading-relaxed">
            “{selectedQuote}”
          </blockquote>
        </div>
      </div>

      {/* Alt Yüklenme Göstergesi ve İlerleme Çubuğu */}
      <div className="w-full max-w-md flex flex-col items-center space-y-3">
        <div className="w-full h-2 rounded-full bg-slate-200/90 dark:bg-slate-800 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-all duration-200 ease-out"
            style={{ width: `${Math.min(100, Math.max(10, progress))}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Loader2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
          <span>
            Resmi Finansal Veriler ve Güvenlik Protokolleri Doğrulanıyor...
          </span>
        </div>
      </div>
    </div>
  );
}
