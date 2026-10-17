"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Send,
  ShieldCheck,
  LineChart,
  Wallet,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { apiFetch, formatCurrencyTL, formatNumberTR } from "@/lib/api";

const PRESET_QUESTIONS = [
  "1. Fonu yöneten şirket batarsa param yanar mı ve fon malvarlığının hukuki güvencesi nedir?",
  "2. AFT fonunun risk değeri, valörü ve yapısal şeffaflık değerlendirmesi nasıldır?",
  "3. AFT ile TI1 fonlarının 2026 yılı tarihsel performans farkı, volatilitesi ve Max Drawdown riski nedir?",
  "4. AFT bu ayki bültende öne çıkan noktalar ve 2026-07 ile 2026-10 dönem değişimi nedir?",
  "5. Bütçemde birikimimi en çok etkileyen giderler hangileri ve 250.000 TL hedefime ne zaman ulaşırım?",
  "6. Tasarruf ve getiri senaryolarıma göre sepetim stres testinde ne kadar etkilenir?",
];

export default function AssistantPage() {
  const [query, setQuery] = useState(PRESET_QUESTIONS[0]);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async (qText: string) => {
    setQuery(qText);
    setLoading(true);
    try {
      const res = await apiFetch<any>("/api/assistant/ask", {
        method: "POST",
        body: JSON.stringify({ user_query: qText }),
      });
      setResponse(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    askQuestion(PRESET_QUESTIONS[0]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full mb-2">
          <Bot className="w-3.5 h-3.5" />
          Modül H • Doğrulanabilir Finansal Bilgi ve Karar Asistanı
        </span>
        <h2 className="text-xl font-bold">
          Kanıt, Gerçek TEFAS Verisi ve Kişisel Senaryo Tabanlı Karar Asistanı
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Bu asistan sayısal verileri asla tahmin etmez; doğrudan{" "}
          <strong>Modül A..G</strong> motorlarını çalıştırarak yanıtı{" "}
          <em>Resmi Hukuki Kanıt</em>, <em>Tarihsel TEFAS Verisi</em>,{" "}
          <em>Kişisel Senaryo</em> ve <em>Varsayım/Sınırlılık Uyarısı</em>{" "}
          katmanlarına ayırır.
        </p>
      </div>

      {/* Hazır 6 Soru Arketipi ve Sorgu Kutusu */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Örnek Doğrulanabilir Soru Tipleri (Tıklayarak Sorgulayın):
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PRESET_QUESTIONS.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => askQuestion(pq)}
              className={`text-left p-3 rounded-xl border text-xs font-medium transition-colors ${
                query === pq
                  ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200"
                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-400"
              }`}
            >
              {pq}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            askQuestion(query);
          }}
          className="flex gap-2 pt-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Fonlar, mevzuat, bültenler veya bütçeniz hakkında soru sorun..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            {loading ? "Yanıtlanıyor..." : "Sor"}
          </button>
        </form>
      </div>

      {/* Ayrıştırılmış Yanıt Katmanları */}
      {response && (
        <div className="space-y-4">
          {/* 1. Doğrudan Yanıt Özeti */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-500/40 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              1. Doğrudan Sentezlenmiş Yanıt (answer_summary)
            </div>
            <p className="text-sm sm:text-base font-medium leading-relaxed text-slate-900 dark:text-white">
              {response.answer_summary}
            </p>
          </div>

          {/* 2. Resmi Hukuki Kanıtlar (Varsa) */}
          {response.official_legal_evidence?.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
                2. Resmi Mevzuat ve Kurumsal Kanıt Dayanakları (official_legal_evidence)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {response.official_legal_evidence.map((ev: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs space-y-1.5"
                  >
                    <div className="font-bold text-emerald-950 dark:text-emerald-200">
                      {ev.question}
                    </div>
                    <p className="text-emerald-900 dark:text-emerald-300">
                      {ev.claim_summary}
                    </p>
                    <div className="pt-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      Dayanak: {ev.regulation_ref} ({ev.source_date})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Doğrulanmış Tarihsel TEFAS & Bülten Metrikleri (Varsa) */}
          {Object.keys(response.verified_historical_metrics || {}).length >
            0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <LineChart className="w-4 h-4" />
                3. Doğrulanmış Gerçek TEFAS & Bülten Verileri (verified_historical_metrics)
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-80">
                {JSON.stringify(response.verified_historical_metrics, null, 2)}
              </pre>
            </div>
          )}

          {/* 4. Kişisel Bütçe ve Senaryo Hesaplamaları (Varsa) */}
          {Object.keys(response.personal_budget_and_scenarios || {}).length >
            0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <Wallet className="w-4 h-4" />
                4. Kişisel Bütçe ve Senaryo Motoru Çıktıları (personal_budget_and_scenarios)
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-80">
                {JSON.stringify(
                  response.personal_budget_and_scenarios,
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {/* 5 & 6. Kesin Veri vs Varsayım Ayrımı ve Sınırlılık Uyarısı */}
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2 text-xs text-amber-950 dark:text-amber-200">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              5. Kesin Veri vs. Varsayım Ayrımı & Metodolojik Sınırlar
            </div>
            <p>
              <strong>Kesin Veriler:</strong>{" "}
              {response.ai_interpretation_vs_assumptions?.verified_data_note}
            </p>
            <p>
              <strong>Varsayım ve Yorumlar:</strong>{" "}
              {
                response.ai_interpretation_vs_assumptions
                  ?.assumptions_and_commentary_note
              }
            </p>
            <p className="pt-1 border-t border-amber-200 dark:border-amber-800">
              <strong>Zorunlu Uyarı:</strong> {response.data_limitations_warning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
