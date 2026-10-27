"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { apiFetch, getTelemetrySessionId } from "@/lib/api";

export default function FloatingQuickPoll() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [manualClosed, setManualClosed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState({
    enabled: true,
    openSec: 8,
    waitSec: 25,
  });
  const [pollData, setPollData] = useState<any>({
    question_id: 3,
    question_text:
      "Bir fonun Takasbank saklamasında olması piyasadaki olası fiyat zararlarına karşı güvence sağlar mı?",
    options: [
      { text: "Evet, fon zarar ederse Takasbank karşılar.", is_correct: false },
      {
        text: "Hayır, Takasbank piyasa zararına değil; şirket iflasına ve varlık suistimaline karşı korur.",
        is_correct: true,
      },
      { text: "Kararsızım / Bilmiyorum.", is_correct: false },
    ],
    correct_index: 1,
    explanation:
      "6362 sayılı SPKn Md. 53 uyarınca Takasbank, portföy yöneticisi iflas etse dahi varlıkların yatırımcı adına korunmasını güvenceye alır; ancak piyasa kaynaklı fiyat düşüşlerine karşı sermaye garantisi sunmaz.",
    total_votes: 68,
    distribution: {
      0: { count: 38, pct: 56 },
      1: { count: 22, pct: 32 },
      2: { count: 8, pct: 12 },
    },
  });

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadSettings = () => {
    apiFetch<any>("/api/public/settings")
      .then((res) => {
        if (res) {
          setWidgetConfig({
            enabled: res.quick_poll_enabled !== false,
            openSec: Math.max(2, Number(res.quick_poll_open_sec || 8)),
            waitSec: Math.max(5, Number(res.quick_poll_wait_sec || 25)),
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    let alreadyVoted = false;
    let alreadyDismissed = false;
    if (typeof window !== "undefined") {
      const savedVote = localStorage.getItem("quick_poll_voted_3");
      if (savedVote !== null) {
        alreadyVoted = true;
        setHasVoted(true);
        setSelectedIdx(Number(savedVote));
      }
      const isDismissed = sessionStorage.getItem("quick_poll_dismissed");
      if (isDismissed === "true") {
        alreadyDismissed = true;
        setDismissed(true);
      }
    }

    loadSettings();
    const onBrandingUpdate = () => loadSettings();
    window.addEventListener("branding-updated", onBrandingUpdate);

    apiFetch<any>("/api/survey/quick-poll")
      .then((res) => {
        if (res?.question_text) setPollData(res);
      })
      .catch(() => {});

    // İlk yüklemede (kullanıcı oy vermediyse ve kapatmadıysa) 2 saniye sonra yumuşak animasyonla aç
    let initTimer: any = null;
    if (!alreadyVoted && !alreadyDismissed) {
      initTimer = setTimeout(() => {
        setOpen(true);
      }, 2000);
    }

    return () => {
      window.removeEventListener("branding-updated", onBrandingUpdate);
      if (initTimer) clearTimeout(initTimer);
    };
  }, []);

  // Otomatik Açılma / Küçülme Döngüsü (Admin süre ayarlarına göre, hover durumunda duraklar)
  useEffect(() => {
    if (!widgetConfig.enabled || dismissed || manualClosed || hasVoted || isHovered) {
      return;
    }

    let timer: any = null;
    if (open) {
      // Açık kalma süresi sonunda otomatik küçült
      timer = setTimeout(() => {
        setOpen(false);
      }, widgetConfig.openSec * 1000);
    } else {
      // Kapandıktan sonra bekleme süresi sonunda tekrar aç
      timer = setTimeout(() => {
        setOpen(true);
      }, widgetConfig.waitSec * 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [
    open,
    widgetConfig.enabled,
    widgetConfig.openSec,
    widgetConfig.waitSec,
    dismissed,
    manualClosed,
    hasVoted,
    isHovered,
  ]);

  const handleVote = async () => {
    if (selectedIdx === null) return;
    setSubmitting(true);
    setHasVoted(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("quick_poll_voted_3", String(selectedIdx));
    }

    try {
      const sessionId = getTelemetrySessionId();
      await apiFetch<any>("/api/survey/quick-poll/vote", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          poll_question_id: pollData.question_id || 3,
          selected_option_index: selectedIdx,
        }),
      });
    } catch {
      // offline fallback
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("quick_poll_dismissed", "true");
    }
  };

  if (!widgetConfig.enabled || dismissed) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style jsx>{`
        @keyframes quickPollSlideUp {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .quick-poll-card-anim {
          animation: quickPollSlideUp 0.48s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Kapalı Hal: Küçük Şık Buton */}
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setManualClosed(false);
          }}
          className="group px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg hover:shadow-xl inline-flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 ring-4 ring-blue-500/20"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
          <GraduationCap className="w-4 h-4 text-blue-100" />
          <span>Hızlı Akademik Soru (TÜBİTAK 2209-A)</span>
        </button>
      )}

      {/* Açık Hal: İnteraktif Mini Soru Kartı */}
      {open && (
        <div className="quick-poll-card-anim w-[340px] sm:w-[380px] p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <GraduationCap className="w-3.5 h-3.5" />
              TÜBİTAK 2209-A Hızlı Soru
            </span>
            <div className="flex items-center gap-1.5">
              {!hasVoted && !manualClosed && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {isHovered ? "Duraklatıldı" : `${widgetConfig.openSec} sn`}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setManualClosed(true);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                title="Simge durumuna küçült"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {pollData.question_text}
            </h4>
          </div>

          {/* Henüz Oy Verilmediyse Seçenekler */}
          {!hasVoted && (
            <div className="space-y-2">
              {pollData.options.map((opt: any, idx: number) => {
                const isSel = selectedIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 ${
                      isSel
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{opt.text}</span>
                    <div
                      className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                        isSel
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-[11px] text-slate-400 hover:underline"
                >
                  Kapat ve gösterme
                </button>
                <button
                  type="button"
                  onClick={handleVote}
                  disabled={selectedIdx === null || submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? "Kaydediliyor..." : "Yanıtı Gönder"}
                </button>
              </div>
            </div>
          )}

          {/* Oy Verildikten Sonra Sonuç ve Dağılım */}
          {hasVoted && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  selectedIdx === pollData.correct_index
                    ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                    : "border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200"
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {selectedIdx === pollData.correct_index ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Tebrikler! Doğru Yanıt
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Yaygın Yanılgı! Doğru Cevap: &ldquo;Hayır&rdquo;
                    </>
                  )}
                </div>
                <div>{pollData.explanation}</div>
              </div>

              {/* Katılımcı Dağılımı */}
              <div className="space-y-1.5 text-xs">
                <div className="text-[11px] font-bold text-slate-500">
                  Katılımcı Dağılımı ({pollData.total_votes || 68} Katılımcı):
                </div>
                {pollData.options.map((opt: any, idx: number) => {
                  const dist = pollData.distribution?.[idx] || { pct: idx === 0 ? 56 : idx === 1 ? 32 : 12 };
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="truncate max-w-[220px] text-slate-600 dark:text-slate-400">
                          {opt.text}
                        </span>
                        <span className="font-bold font-mono">%{dist.pct}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            idx === pollData.correct_index
                              ? "bg-emerald-500"
                              : "bg-blue-400 dark:bg-blue-600"
                          }`}
                          style={{ width: `${Math.max(6, dist.pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <Link
                  href="/survey"
                  onClick={() => setOpen(false)}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 shadow-sm"
                >
                  Tüm Anketi Çöz (14 Soru &amp; Karne)
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
