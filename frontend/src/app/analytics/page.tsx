"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  AlertTriangle,
  Play,
  CheckSquare,
  Search,
  X,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { API_BASE_URL, apiFetch, formatNumberTR } from "@/lib/api";
import SvgLineChart from "@/components/SvgLineChart";
import RealReturnSimulator from "@/components/RealReturnSimulator";

const PALETTE = [
  "#2563eb",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#059669",
  "#db2777",
  "#0891b2",
  "#4f46e5",
  "#ca8a04",
  "#16a34a",
  "#9333ea",
  "#e11d48",
];

export default function AnalyticsPage() {
  const [availableFunds, setAvailableFunds] = useState<any[]>([
    {
      fund_code: "AFT",
      fund_title: "Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu",
      fund_type: "Yabancı Hisse / Teknoloji Fonu",
    },
    {
      fund_code: "MAC",
      fund_title: "Marmara Capital Portföy Hisse Senedi (TL) Fonu (Hisse Yoğun)",
      fund_type: "Hisse Senedi Yoğun Fon",
    },
    {
      fund_code: "TTA",
      fund_title: "İş Portföy Altın Fonu",
      fund_type: "Kıymetli Madenler / Altın Fonu",
    },
    {
      fund_code: "IPB",
      fund_title: "İstanbul Portföy Birinci Değişken Fon",
      fund_type: "Değişken / Çoklu Varlık Fonu",
    },
    {
      fund_code: "TI1",
      fund_title: "İş Portföy Para Piyasası (TL) Fonu",
      fund_type: "Para Piyasası (TL) Fonu",
    },
  ]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([
    "AFT",
    "MAC",
    "TTA",
    "IPB",
    "TI1",
  ]);
  const [fundSearchQuery, setFundSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("2026-01-03");
  const [endDate, setEndDate] = useState("2026-10-16");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async (codesToRun?: string[]) => {
    const codes = codesToRun || selectedCodes;
    if (codes.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/analytics/compare", {
        method: "POST",
        body: JSON.stringify({
          fund_codes: codes,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch<any>("/api/funds").then((res) => {
      if (res?.funds?.length > 0) {
        setAvailableFunds(res.funds);
      }
    });
    runComparison();
  }, []);

  const toggleFund = (code: string) => {
    if (selectedCodes.includes(code)) {
      if (selectedCodes.length > 1) {
        setSelectedCodes(selectedCodes.filter((c) => c !== code));
      }
    } else {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  // GÖREV 3: Analizi Excel (.xlsx) Olarak İndirme
  const handleDownloadExcel = async () => {
    if (selectedCodes.length === 0) return;
    setDownloadingExcel(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/analytics/export-xlsx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fund_codes: selectedCodes,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        throw new Error(
          errBody?.detail || `Excel indirme hatası: HTTP ${resp.status}`
        );
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const actStart = data?.actual_start_date || startDate;
      const actEnd = data?.actual_end_date || endDate;
      a.download = `fon_performans_analizi_${actStart}_${actEnd}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Excel dosyası indirilemedi.");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const filteredFunds = availableFunds.filter((f: any) => {
    const q = fundSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (f.fund_code || "").toLowerCase().includes(q) ||
      (f.fund_title || "").toLowerCase().includes(q) ||
      (f.fund_type || "").toLowerCase().includes(q)
    );
  });

  const chartData =
    data?.daily_series?.map((pt: any) => ({
      date: pt.date,
      ...pt.normalized,
    })) || [];

  const chartSeries = selectedCodes.map((code, idx) => ({
    key: code,
    label: code,
    color: PALETTE[idx % PALETTE.length],
  }));

  return (
    <div className="space-y-6">
      {/* Başlık ve Filtre Paneli */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-2">
              <LineChart className="w-3.5 h-3.5" />
              Fon Performans Analizi • Tatil Günü Çözümleme ve 100 Bazlı
              Normalizasyon ({availableFunds.length} Fon)
            </span>
            <h2 className="text-xl font-bold">
              Çoklu Fon Karşılaştırma ve 100 Bazlı Performans / Risk Analizi
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Birim pay fiyatı 1.761 TL olan TI1 ile 0,60 TL olan TTA&apos;yı
              aynı ölçekte kıyaslamak için başlangıç işlem günü{" "}
              <strong>100,00 TL</strong> kabul edilerek normalize edilir.
            </p>
          </div>
        </div>

        {/* Dinamik Fon Arama Çubuğu ve Seçim Alanı (GÖREV 2) */}
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                Karşılaştırılacak Gerçek TEFAS Fonlarını Arayın ve Seçin (
                {selectedCodes.length} Seçili / {availableFunds.length} Mevcut
                Fon):
              </label>
              <span className="text-[11px] text-slate-500">
                Fon kodu (örn: <strong>AFT</strong>, <strong>TTA</strong>) veya
                fon ünvanı / kategorisi (örn: <strong>Altın</strong>,{" "}
                <strong>Teknoloji</strong>, <strong>İş Portföy</strong>) yazarak
                anlık filtreleyebilirsiniz.
              </span>
            </div>

            {/* Dinamik Arama Çubuğu */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fundSearchQuery}
                onChange={(e) => setFundSearchQuery(e.target.value)}
                placeholder="Kod, ünvan veya kategori ara (Örn: Altın, AFT)..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fundSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFundSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Aramayı Temizle"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Seçili Fonlar Rozet Şeridi */}
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
            <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 mr-1">
              Seçili Fonlar ({selectedCodes.length}):
            </span>
            {selectedCodes.map((code, idx) => {
              const fObj = availableFunds.find((x) => x.fund_code === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  title={fObj?.fund_title || code}
                >
                  <span>{code}</span>
                  {fObj?.fund_type && (
                    <span className="text-[10px] opacity-85 font-normal hidden sm:inline">
                      • {fObj.fund_type.split("/")[0].trim()}
                    </span>
                  )}
                  {selectedCodes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => toggleFund(code)}
                      className="hover:opacity-75 ml-0.5"
                      title={`${code} fonunu seçimden çıkar`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          {/* Filtrelenmiş Fon Seçim Listesi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
            {filteredFunds.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-slate-500">
                &ldquo;{fundSearchQuery}&rdquo; aramasına uygun TEFAS fonu
                bulunamadı.
              </div>
            ) : (
              filteredFunds.map((f: any) => {
                const code = f.fund_code;
                const active = selectedCodes.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleFund(code)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-start justify-between gap-2 ${
                      active
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-bold text-xs">{code}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                            active
                              ? "bg-blue-700 text-blue-100"
                              : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {f.fund_type || "Yatırım Fonu"}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          active
                            ? "text-blue-100"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {f.fund_title || code}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Tarih Seçimi ve Analizi Çalıştır */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="md:col-span-4">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Başlangıç Tarihi:
            </label>
            <input
              type="date"
              value={startDate}
              min="2025-10-16"
              max="2026-10-16"
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div className="md:col-span-4">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Bitiş Tarihi:
            </label>
            <input
              type="date"
              value={endDate}
              min="2025-10-16"
              max="2026-10-16"
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div className="md:col-span-4 flex items-end gap-2">
            <button
              onClick={() => runComparison()}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? "Hesaplanıyor..." : "Analizi Çalıştır"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Tatil Günü Çözümleyici Uyarısı */}
          {data.date_warning && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <strong>Tatil ve İşlem Günü Çözümleyici:</strong>{" "}
                {data.date_warning} (Gerçekleşen Ortak İşlem Günü Aralığı:{" "}
                <strong>
                  {data.actual_start_date} &rarr; {data.actual_end_date}
                </strong>{" "}
                • {data.common_trading_days_count} İşlem Günü)
              </div>
            </div>
          )}

          {/* 100 Bazlı Normalize Grafik ve Sağ Üst Excel İndirme Butonu (GÖREV 3) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">
                  100 Bazlı Normalize Performans Zaman Serisi (Başlangıç = 100,00)
                </h3>
                <p className="text-xs text-slate-500">
                  Grafik üzerinde fareyi gezdirerek her işlem günündeki 100
                  bazlı endeks değerini inceleyebilirsiniz.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                  Kaynak: {data.source} ({data.common_trading_days_count} İşlem
                  Günü)
                </span>
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={downloadingExcel}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {downloadingExcel
                    ? "Excel Hazırlanıyor..."
                    : "Analizi Excel Olarak İndir (.xlsx)"}
                </button>
              </div>
            </div>

            <SvgLineChart
              data={chartData}
              xKey="date"
              series={chartSeries}
              referenceLineValue={100}
              referenceLineLabel="Başlangıç Bazı (100.0)"
            />

            {/* Yasal Koruma Rozeti (GÖREV 3.1) */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-blue-950/30 border border-amber-300 dark:border-blue-800/80 flex items-center gap-2.5 text-xs text-amber-900 dark:text-blue-200 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-blue-400 shrink-0" />
              <span>
                Dikkat: Bu analiz geçmiş TEFAS brüt fiyatları üzerinden hesaplanmıştır. Geçmiş getiri geleceğin garantisi değildir. Yatırım tavsiyesi değildir (YTD).
              </span>
            </div>
          </div>

          {/* Performans ve Risk Tablosu */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-base font-bold">
                Doğrulanmış Performans, Maksimum Düşüş (Max Drawdown) ve
                Volatilite Tablosu
              </h3>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={downloadingExcel}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Özet Tablo + Günlük Seriyi Excel (.xlsx) İndir
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 pr-4">Fon</th>
                    <th className="py-2.5 px-4">Fon Ünvanı & Kategori</th>
                    <th className="py-2.5 px-4 text-right">
                      Başlangıç ({data.actual_start_date})
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      Bitiş ({data.actual_end_date})
                    </th>
                    <th className="py-2.5 px-4 text-right">Brüt Getiri (%)</th>
                    <th className="py-2.5 px-4 text-right">
                      100 Bazlı Bitiş
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      Max Drawdown (%)
                    </th>
                    <th className="py-2.5 pl-4 text-right">
                      Yıllık Volatilite (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {data.funds_summary?.map((f: any) => {
                    const pos = f.return_pct >= 0;
                    return (
                      <tr key={f.fund_code}>
                        <td className="py-3 pr-4 font-bold text-blue-600 dark:text-blue-400">
                          {f.fund_code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {f.fund_title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {f.fund_type}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatNumberTR(f.start_price, 6)} TL
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatNumberTR(f.end_price, 6)} TL
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            pos ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {pos ? "+" : ""}
                          {formatNumberTR(f.return_pct)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatNumberTR(f.normalized_base_100_end)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600">
                          -{formatNumberTR(f.max_drawdown_pct)}%
                        </td>
                        <td className="py-3 pl-4 text-right font-mono">
                          {formatNumberTR(f.annualized_volatility_pct)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tablo Altı Bilgi Rozeti (Disclaimer Badge — GÖREV 3.1) */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-slate-800/80 border border-blue-300 dark:border-blue-800/70 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200 font-medium">
              <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Dikkat: Bu analiz geçmiş TEFAS brüt fiyatları üzerinden hesaplanmıştır. Geçmiş getiri geleceğin garantisi değildir. Yatırım tavsiyesi değildir (YTD).
              </span>
            </div>
          </div>

          {/* İsteğe Bağlı Açılan Reel Getiri & Küresel Benchmark Simülatörü (GÖREV 2) */}
          <RealReturnSimulator
            fundCodes={selectedCodes}
            startDate={data.actual_start_date || startDate}
            endDate={data.actual_end_date || endDate}
            defaultAmount={100000}
          />
        </>
      )}
    </div>
  );
}
