"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  ExternalLink,
  AlertOctagon,
  BookOpen,
  Search,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function EvidencePage() {
  const [cards, setCards] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>("/api/evidence-cards")
      .then((res) => {
        setCards(res.evidence_cards || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredCards = cards.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.question.toLowerCase().includes(q) ||
      c.claim_summary.toLowerCase().includes(q) ||
      c.regulation_ref.toLowerCase().includes(q)
    );
  });

  const activeCard =
    cards.find((c) => c.order_no === selectedOrder) || filteredCards[0];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Fonlara Güven & Kanıt Merkezi (15 Resmi Mevzuat Kartı)
            </span>
            <h2 className="text-xl font-bold">
              Fonlara Neden Güvenmeliyiz? (Hukuki Statü, Varlık Ayrılığı ve Sınırlar)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Her bir kart; 6362 sayılı Sermaye Piyasası Kanunu, SPK Tebliğleri,
              Takasbank saklama rejimi ve KAP bildirim standartlarındaki resmi
              maddelere atıf yapar.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Soru veya kanun maddesi ara..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-sm text-slate-500">
          Kanıt kartları yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol: 15 Soru Listesi */}
          <div className="lg:col-span-5 space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {filteredCards.map((c) => {
              const isSelected = activeCard?.order_no === c.order_no;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedOrder(c.order_no)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm leading-snug">
                      {c.question}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${
                        isSelected
                          ? "bg-blue-700 text-blue-100"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      #{c.order_no}
                    </span>
                  </div>
                  <div
                    className={`mt-1.5 text-[11px] truncate ${
                      isSelected
                        ? "text-blue-100"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Dayanak: {c.regulation_ref}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sağ: Seçili Kanıt Kartı Detayı */}
          {activeCard && (
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Resmi Kanıt Kartı #{activeCard.order_no}
                  </span>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Tarih / RG: {activeCard.source_date}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {activeCard.question}
                  </h3>
                  <div className="mt-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-sm font-medium text-blue-950 dark:text-blue-200">
                    {activeCard.claim_summary}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Detaylı Mevzuat ve Kurumsal Mekanizma Açıklaması
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {activeCard.detailed_explanation}
                  </p>
                </div>

                {/* Resmi Kaynak ve Madde Kutusu */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block">
                        Resmi Kaynak Kurum:
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {activeCard.official_source}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        Kanun / Tebliğ / Madde Referansı:
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {activeCard.regulation_ref}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-500">
                      Resmi Mevzuat / Kurum Bağlantısı:
                    </span>
                    <a
                      href={activeCard.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Resmi Kaynağı Aç <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Yatırımcı İçin Anlamı */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    Bireysel Yatırımcı İçin Pratik Anlamı
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    {activeCard.user_meaning}
                  </p>
                </div>

                {/* Sınırlar ve Riskler (Neyi Garanti Etmez?) */}
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertOctagon className="w-4 h-4" />
                    Hukuki Korumanın Sınırı ve Piyasa Riski Uyarısı
                  </div>
                  <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                    {activeCard.limitations_and_risks}
                  </p>
                </div>

                {/* Yaygın Yanlış İnanış */}
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <HelpCircle className="w-4 h-4" />
                    Yaygın Yanlış İnanış vs. Hukuki Gerçek
                  </div>
                  <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-200 leading-relaxed">
                    {activeCard.common_misconception}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
