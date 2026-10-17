"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  ArrowLeftRight,
} from "lucide-react";
import { apiFetch, formatCurrencyTL, formatNumberTR } from "@/lib/api";

export default function BulletinsPage() {
  const [fundsList, setFundsList] = useState<string[]>([
    "AFT",
    "MAC",
    "TTA",
    "IPB",
    "TI1",
  ]);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBulletinId, setSelectedBulletinId] = useState<number | null>(
    null
  );
  const [compareFund, setCompareFund] = useState<string>("AFT");
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<any>("/api/bulletins"),
      apiFetch<any>("/api/funds"),
    ])
      .then(([res, fRes]) => {
        const list = res.bulletins || [];
        setBulletins(list);
        if (list.length > 0) setSelectedBulletinId(list[0].id);
        if (fRes?.funds?.length > 0) {
          setFundsList(fRes.funds.map((f: any) => f.fund_code));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiFetch<any>(
      `/api/bulletins/compare/${compareFund}?period_old=2026-07&period_new=2026-10`
    ).then((res) => setComparison(res));
  }, [compareFund]);

  const filteredBulletins = bulletins.filter((b) =>
    selectedCategory === "ALL" ? true : b.category === selectedCategory
  );

  const activeBulletin =
    bulletins.find((b) => b.id === selectedBulletinId) || filteredBulletins[0];
  const summary = activeBulletin?.ai_summary;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-2">
          <FileText className="w-3.5 h-3.5" />
          Fon Bültenleri & Raporlar • 7 Başlıklı Kaynak Atıflı Özetleme & Dönem Karşılaştırma ({bulletins.length} Resmi Belge)
        </span>
        <h2 className="text-xl font-bold">
          Fon Bültenleri, Resmi KAP/SPK Duyuruları ve Dönem Karşılaştırma Merkezi
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kural 4 gereği her bülten özetinde{" "}
          <strong>Kesin Resmi Veriler (verified_facts)</strong> ile{" "}
          <strong>Kurum / Yönetici Yorumları (opinions_and_forecasts)</strong>{" "}
          birbirinden kesin olarak ayrılır.
        </p>
      </div>

      {/* BÖLÜM 1: Dönem Karşılaştırma Motoru (2026-07 vs 2026-10) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="space-y-2.5">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-blue-600" />
              Bülten ve Dönem Raporu Karşılaştırma Sistemi (2026-07 vs. 2026-10 • {fundsList.length} Fon)
            </h3>
            <p className="text-xs text-slate-500">
              Önceki dönem (2026 Temmuz) ile güncel dönem (2026 Ekim) arasındaki
              resmi TEFAS fiyat, portföy büyüklüğü ve yatırımcı sayısı değişimi:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {fundsList.map((code) => (
              <button
                key={code}
                onClick={() => setCompareFund(code)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                  compareFund === code
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {comparison && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500">
                1. Birim Pay Fiyatı Değişimi ({comparison.old_reference_date}{" "}
                &rarr; {comparison.new_reference_date})
              </div>
              <div className="text-lg font-bold mt-1 font-mono">
                {formatNumberTR(
                  comparison.metrics_comparison.unit_price.old_price_tl,
                  6
                )}{" "}
                TL &rarr;{" "}
                {formatNumberTR(
                  comparison.metrics_comparison.unit_price.new_price_tl,
                  6
                )}{" "}
                TL
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  comparison.metrics_comparison.unit_price.change_pct >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                Değişim:{" "}
                {comparison.metrics_comparison.unit_price.change_pct >= 0
                  ? "+"
                  : ""}
                {formatNumberTR(
                  comparison.metrics_comparison.unit_price.change_pct
                )}
                %
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500">
                2. Portföy Büyüklüğü Değişimi (TL & %)
              </div>
              <div className="text-sm font-bold mt-1 font-mono">
                {formatCurrencyTL(
                  comparison.metrics_comparison.portfolio_size_tl
                    .old_total_value_tl
                )}{" "}
                &rarr;{" "}
                {formatCurrencyTL(
                  comparison.metrics_comparison.portfolio_size_tl
                    .new_total_value_tl
                )}
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  comparison.metrics_comparison.portfolio_size_tl.change_pct >=
                  0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                Fark:{" "}
                {formatCurrencyTL(
                  comparison.metrics_comparison.portfolio_size_tl.diff_tl
                )}{" "}
                (
                {comparison.metrics_comparison.portfolio_size_tl.change_pct >= 0
                  ? "+"
                  : ""}
                {formatNumberTR(
                  comparison.metrics_comparison.portfolio_size_tl.change_pct
                )}
                %)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500">
                3. Yatırımcı Sayısı Değişimi (Kişi & %)
              </div>
              <div className="text-lg font-bold mt-1 font-mono">
                {comparison.metrics_comparison.investor_count.old_investor_count.toLocaleString(
                  "tr-TR"
                )}{" "}
                &rarr;{" "}
                {comparison.metrics_comparison.investor_count.new_investor_count.toLocaleString(
                  "tr-TR"
                )}{" "}
                kişi
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  comparison.metrics_comparison.investor_count.diff_persons >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                Fark:{" "}
                {comparison.metrics_comparison.investor_count.diff_persons >= 0
                  ? "+"
                  : ""}
                {comparison.metrics_comparison.investor_count.diff_persons.toLocaleString(
                  "tr-TR"
                )}{" "}
                kişi (
                {formatNumberTR(
                  comparison.metrics_comparison.investor_count.change_pct
                )}
                %)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BÖLÜM 2: Bülten Arşivi ve 7 Zorunlu Başlıklı Özet Görünümü */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "ALL", label: "Tüm Belgeler" },
          { key: "FON_SEKTOR_BULTENI", label: "Fon & Sektör Bültenleri" },
          { key: "RESMI_DUYURU", label: "Resmi SPK / KAP Duyuruları" },
          { key: "KURUCU_BELGESI", label: "İzahname & YBF Belgeleri" },
        ].map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              selectedCategory === cat.key
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-sm text-slate-500">Bültenler yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol: Bülten Listesi */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredBulletins.map((b) => {
              const active = activeBulletin?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBulletinId(b.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    active
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <span
                      className={
                        active ? "text-blue-100" : "text-blue-600 dark:text-blue-400"
                      }
                    >
                      {b.doc_type} • {b.period_covered}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        active
                          ? "bg-blue-700 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {b.content_origin_badge}
                    </span>
                  </div>
                  <div className="font-bold text-xs sm:text-sm leading-snug">
                    {b.title}
                  </div>
                  <div
                    className={`mt-1.5 text-[11px] ${
                      active ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {b.source_institution} • Yayın: {b.publish_date}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sağ: 7 Zorunlu Başlıklı Kaynak Atıflı Özet */}
          {activeBulletin && summary && (
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {activeBulletin.source_institution} ({activeBulletin.period_covered})
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">
                    {activeBulletin.content_origin_badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{activeBulletin.title}</h3>
              </div>

              {/* 1. Bu belgede ne anlatılıyor? */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  1. Bu Belgede Ne Anlatılıyor? (Belge Özeti)
                </h4>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {summary.document_overview}
                </p>
              </div>

              {/* 2. Önemli gelişmeler neler? */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  2. Önemli Gelişmeler Neler?
                </h4>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 list-disc list-inside">
                  {summary.key_developments?.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              {/* 3. Yatırımcı açısından neden önemli? */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">
                  3. Yatırımcı Açısından Neden Önemli?
                </h4>
                <p className="text-xs sm:text-sm text-blue-950 dark:text-blue-200">
                  {summary.investor_impact}
                </p>
              </div>

              {/* 4. Kullanılan Veriler ve Sayfa/Bölüm Atıfları */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  4. Kullanılan Veriler ve Sayfa / Bölüm Atıfları
                </h4>
                <div className="space-y-2">
                  {summary.used_data_and_citations?.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5"
                    >
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono font-semibold shrink-0">
                        {c.reference_section_or_page}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {c.claim}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Kesin Resmi Bilgi vs Kurum/Piyasa Yorumu Ayrımı */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    5A. Kesin Bilgi / Resmi Veriler
                  </div>
                  <ul className="space-y-1.5 text-xs text-emerald-950 dark:text-emerald-200 list-disc list-inside">
                    {summary.facts_vs_interpretations?.verified_facts?.map(
                      (vf: string, i: number) => (
                        <li key={i}>{vf}</li>
                      )
                    )}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                    <MessageSquare className="w-4 h-4" />
                    5B. Kurum / Yönetici Yorumu & Beklentisi
                  </div>
                  <ul className="space-y-1.5 text-xs text-purple-950 dark:text-purple-200 list-disc list-inside">
                    {summary.facts_vs_interpretations?.opinions_and_forecasts?.map(
                      (op: string, i: number) => (
                        <li key={i}>{op}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>

              {/* 6. Belirsizlikler ve Eksik Noktalar */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  6. Hangi Noktalar Belirsiz veya Belgede Yer Almıyor?
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {summary.uncertainties_and_gaps?.map(
                    (g: string, i: number) => (
                      <li key={i}>{g}</li>
                    )
                  )}
                </ul>
              </div>

              {/* 7. Orijinal Kaynak Erişimi */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  7. Orijinal Kaynak: {summary.original_source_access?.source_institution} •{" "}
                  {summary.original_source_access?.publish_date}
                </span>
                <a
                  href={summary.original_source_access?.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Orijinal Resmi Kaynağı Görüntüle{" "}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
