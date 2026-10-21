"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Search,
  Lightbulb,
  Scale,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SearchX,
} from "lucide-react";
import { trackTelemetryEvent } from "@/lib/api";
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_TERMS,
  GlossaryCategory,
} from "@/lib/glossaryData";

const CATEGORY_STYLES: Record<GlossaryCategory, string> = {
  "Temel Kavramlar":
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
  "Hukuk & Güvenlik":
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  "Risk & Performans":
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  "Vergi & Kesintiler":
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
};

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GlossaryCategory | "ALL">("ALL");
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const lastSearchSent = useRef("");

  const normalized = (s: string) =>
    s
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    const q = normalized(query.trim());
    return GLOSSARY_TERMS.filter((t) => {
      if (category !== "ALL" && t.category !== category) return false;
      if (!q) return true;
      return normalized(
        `${t.term} ${t.tip} ${t.spk} ${t.importance} ${t.category}`
      ).includes(q);
    });
  }, [query, category]);

  // Arama telemetrisi (yazma durduktan 1.2 sn sonra, en az 3 karakter)
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3 || q === lastSearchSent.current) return;
    const timer = window.setTimeout(() => {
      lastSearchSent.current = q;
      trackTelemetryEvent({
        event_type: "GLOSSARY_SEARCH",
        module_name: "glossary",
        metadata: { query: q, result_count: filtered.length },
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [query, filtered.length]);

  const handleToggle = (term: string, cat: GlossaryCategory) => {
    const willOpen = openTerm !== term;
    setOpenTerm(willOpen ? term : null);
    if (willOpen) {
      trackTelemetryEvent({
        event_type: "GLOSSARY_TERM_READ",
        module_name: "glossary",
        metadata: { term, category: cat },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Finansal Sözlük & SPK Rehberi • {GLOSSARY_TERMS.length} Terim
          </span>
          <h2 className="text-xl font-bold">
            Finansal Terimler ve SPK Mevzuat Sözlüğü
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Her terim için halk diliyle özet, 6362 sayılı SPKn ve ilgili
            tebliğlerdeki resmi karşılığı ve yatırımcı için önemi üç katmanda
            açıklanır. Kart başlığına tıklayarak detayı açın.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Terim ara: izahname, stopaj, volatilite, valör..."
            className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["ALL", ...GLOSSARY_CATEGORIES] as const).map((c) => {
            const count =
              c === "ALL"
                ? GLOSSARY_TERMS.length
                : GLOSSARY_TERMS.filter((t) => t.category === c).length;
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {c === "ALL" ? "Tümü" : c} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
          <SearchX className="w-8 h-8 text-slate-400" />
          &ldquo;{query}&rdquo; için sonuç bulunamadı. Farklı bir kelime veya
          kategori deneyin.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {filtered.map((t) => {
            const open = openTerm === t.term;
            return (
              <div
                key={t.term}
                className={`rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
                  open
                    ? "border-blue-400 dark:border-blue-700 shadow-sm"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(t.term, t.category)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[t.category]}`}
                    >
                      {t.category}
                    </span>
                    <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {t.term}
                    </div>
                    {!open && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {t.tip}
                      </p>
                    )}
                  </div>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  )}
                </button>

                {open && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="p-3.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/60">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-800 dark:text-yellow-300 mb-1">
                        <Lightbulb className="w-3.5 h-3.5" />
                        💡 Akıllı İpucu (Halk Diliyle Özeti)
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        {t.tip}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">
                        <Scale className="w-3.5 h-3.5" />
                        ⚖️ SPK Mevzuatı & Resmi Karşılığı
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        {t.spk}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        🔍 Yatırımcı İçin Önemi
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        {t.importance}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-blue-950/30 border border-amber-300 dark:border-blue-800/80 text-xs text-amber-900 dark:text-blue-200 font-medium">
        Bu sözlük finansal okuryazarlık ve TÜBİTAK 2209-A araştırma amacıyla
        hazırlanmıştır; yatırım danışmanlığı değildir. Güncel mevzuat için SPK
        (spk.gov.tr), KAP (kap.org.tr) ve GİB kaynaklarını esas alınız.
      </div>
    </div>
  );
}
