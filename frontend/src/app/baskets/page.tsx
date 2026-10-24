"use client";

import React, { useEffect, useState } from "react";
import {
  Briefcase,
  Play,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import { apiFetch, formatCurrencyTL, formatNumberTR, trackTelemetryEvent } from "@/lib/api";
import SvgLineChart from "@/components/SvgLineChart";
import RealReturnSimulator from "@/components/RealReturnSimulator";

export default function BasketsPage() {
  const [availableFunds, setAvailableFunds] = useState<string[]>([
    "AFT",
    "TTA",
    "TI1",
    "MAC",
    "IPB",
  ]);
  const [basketName, setBasketName] = useState(
    "TÜBİTAK 2209-A Dengeli Test Sepeti (40.000 TL)"
  );
  const [startDate, setStartDate] = useState("2026-01-03");
  const [endDate, setEndDate] = useState("2026-10-16");
  const [allocations, setAllocations] = useState([
    { fund_code: "AFT", amount_tl: 10000 },
    { fund_code: "TTA", amount_tl: 12000 },
    { fund_code: "TI1", amount_tl: 10000 },
    { fund_code: "MAC", amount_tl: 8000 },
  ]);
  const [simResult, setSimResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>("/api/baskets/simulate", {
        method: "POST",
        body: JSON.stringify({
          allocations,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      setSimResult(res);
      // Arka planda telemetri için fon kodları ve tutar kaydedilir
      trackTelemetryEvent({
        event_type: "BASKET_SIMULATE",
        module_name: "baskets",
        metadata: {
          fund_codes: allocations.map((a) => a.fund_code),
          total_amount: allocations.reduce(
            (sum, a) => sum + (Number(a.amount_tl) || 0),
            0
          ),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch<any>("/api/funds").then((res) => {
      if (res?.funds?.length > 0) {
        setAvailableFunds(res.funds.map((f: any) => f.fund_code));
      }
    });
    runSimulation();
  }, []);

  const updateAllocation = (
    idx: number,
    field: "fund_code" | "amount_tl",
    val: string | number
  ) => {
    const next = [...allocations];
    next[idx] = { ...next[idx], [field]: val };
    setAllocations(next);
  };

  const addRow = () => {
    const unused =
      availableFunds.find(
        (code) => !allocations.some((a) => a.fund_code === code)
      ) || "IPB";
    setAllocations([...allocations, { fund_code: unused, amount_tl: 5000 }]);
  };

  const removeRow = (idx: number) => {
    if (allocations.length <= 1) return;
    setAllocations(allocations.filter((_, i) => i !== idx));
  };

  const chartData =
    simResult?.daily_series?.map((d: any) => ({
      date: d.date,
      total_value_tl: d.total_value_tl,
      normalized_100: d.normalized_100,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              Sanal Sepet Laboratuvarı • Portföy Simülasyon ve Katkı Payı Merkezi
            </span>
            <h2 className="text-xl font-bold">
              Özel TL Tutarlarıyla Sanal Sepet Kurulumu ve Katkı Payı Analizi
            </h2>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
            SİMÜLASYON / SENARYO ANALİZİ
          </span>
        </div>
      </div>

      {/* Sepet Kurulum Formu */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Sanal Sepet Adı:
            </label>
            <input
              type="text"
              value={basketName}
              onChange={(e) => setBasketName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Başlangıç Tarihi:
            </label>
            <input
              type="date"
              value={startDate}
              min="2025-10-16"
              max="2026-10-16"
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Bitiş Tarihi:
            </label>
            <input
              type="date"
              value={endDate}
              min="2025-10-16"
              max="2026-10-16"
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Fon Kalemleri */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Sepetteki Fonlar ve Başlangıç Yatırım Tutarları (TL):
            </span>
            <button
              onClick={addRow}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Fon Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {allocations.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2"
              >
                <select
                  value={item.fund_code}
                  onChange={(e) =>
                    updateAllocation(idx, "fund_code", e.target.value)
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  {availableFunds.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={item.amount_tl}
                  min={100}
                  step={1000}
                  onChange={(e) =>
                    updateAllocation(
                      idx,
                      "amount_tl",
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
                <button
                  onClick={() => removeRow(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600"
                  title="Kaldır"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={runSimulation}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {loading ? "Simüle Ediliyor..." : "Sepeti Anlık Simüle Et"}
          </button>
        </div>
      </div>

      {simResult && (
        <>
          {/* KPI Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Toplam Başlangıç Tutarı
              </div>
              <div className="text-xl font-bold mt-1 font-mono">
                {formatCurrencyTL(simResult.total_initial_amount_tl)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                İşlem Günü: {simResult.actual_start_date}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Dönem Sonu Sepet Değeri
              </div>
              <div className="text-xl font-bold mt-1 font-mono text-blue-600 dark:text-blue-400">
                {formatCurrencyTL(simResult.total_final_value_tl)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                İşlem Günü: {simResult.actual_end_date} (
                {simResult.trading_days_count} gün)
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Toplam Net Brüt Kâr / Zarar
              </div>
              <div
                className={`text-xl font-bold mt-1 font-mono ${
                  simResult.total_net_profit_tl >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {simResult.total_net_profit_tl >= 0 ? "+" : ""}
                {formatCurrencyTL(simResult.total_net_profit_tl)} (
                {simResult.weighted_return_pct >= 0 ? "+" : ""}
                {formatNumberTR(simResult.weighted_return_pct)}%)
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                100 Bazlı Bitiş: {formatNumberTR(simResult.normalized_base_100_end)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Sepet Max Drawdown & Volatilite
              </div>
              <div className="text-xl font-bold mt-1 font-mono text-rose-600">
                -{formatNumberTR(simResult.basket_max_drawdown_pct)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Yıllık Volatilite:{" "}
                {formatNumberTR(simResult.basket_annualized_volatility_pct)}%
              </div>
            </div>
          </div>

          {/* Sepet Sonuç Kartı Altı Yasal Koruma Alanı (GÖREV 3.2) */}
          <div className="p-3.5 rounded-xl bg-amber-50/75 dark:bg-blue-950/30 border border-amber-300 dark:border-blue-800/80 flex items-center gap-2.5 text-xs text-amber-900 dark:text-blue-200 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-blue-400 shrink-0" />
            <span>
              Bu simülasyon bir yatırım veya portföy dağılım tavsiyesi değildir. Sonuçlar teorik olup işlem valörü (T+1/T+2), stopaj vergisi kesintileri ve piyasa oynaklığı hesaba katılmamıştır.
            </span>
          </div>

          {/* Günlük Sepet Değeri Grafiği */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base font-bold">
              Günlük Sepet Toplam Değeri (TL) Zaman Serisi
            </h3>
            <SvgLineChart
              data={chartData}
              xKey="date"
              series={[
                {
                  key: "total_value_tl",
                  label: "Sepet Toplam Değeri (TL)",
                  color: "#2563eb",
                },
              ]}
              yUnit=" TL"
              referenceLineValue={simResult.total_initial_amount_tl}
              referenceLineLabel="Başlangıç Sermayesi"
            />
          </div>

          {/* Fon Bazlı Katkı Payı Kırılım Tablosu */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold mb-4">
              Fon Bazlı Alınan Pay Adedi, Bireysel Getiri ve Toplam Sepet Kâr/Zararına Katkı Tablosu
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 pr-4">Fon</th>
                    <th className="py-2.5 px-4 text-right">Başlangıç TL</th>
                    <th className="py-2.5 px-4 text-right">Sepet Ağırlığı</th>
                    <th className="py-2.5 px-4 text-right">Alınan Pay Adedi</th>
                    <th className="py-2.5 px-4 text-right">Bitiş Değeri TL</th>
                    <th className="py-2.5 px-4 text-right">Fon Getirisi</th>
                    <th className="py-2.5 px-4 text-right">Net Katkı (TL)</th>
                    <th className="py-2.5 pl-4 text-right">
                      Toplam Kâr Payı (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {simResult.items_breakdown?.map((item: any) => {
                    const pos = item.profit_contribution_tl >= 0;
                    return (
                      <tr key={item.fund_code}>
                        <td className="py-3 pr-4 font-bold text-blue-600 dark:text-blue-400">
                          {item.fund_code}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrencyTL(item.initial_amount_tl)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          %{formatNumberTR(item.initial_weight_pct)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatNumberTR(item.shares, 4)} pay
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatCurrencyTL(item.final_value_tl)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            item.individual_return_pct >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {item.individual_return_pct >= 0 ? "+" : ""}
                          {formatNumberTR(item.individual_return_pct)}%
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            pos ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {pos ? "+" : ""}
                          {formatCurrencyTL(item.profit_contribution_tl)}
                        </td>
                        <td className="py-3 pl-4 text-right font-mono">
                          {pos ? "+" : ""}
                          {formatNumberTR(item.profit_contribution_share_pct)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zorunlu Şeffaflık Uyarıları (limitations_notice) */}
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {simResult.limitations_notice?.simulation_badge}
            </div>
            <p className="font-semibold">
              • Bu simülasyon bir yatırım veya portföy dağılım tavsiyesi değildir. Sonuçlar teorik olup işlem valörü (T+1/T+2), stopaj vergisi kesintileri ve piyasa oynaklığı hesaba katılmamıştır.
            </p>
            <p>• {simResult.limitations_notice?.past_performance_warning}</p>
            <p>• {simResult.limitations_notice?.gross_calculation_warning}</p>
            <p>• {simResult.limitations_notice?.management_fee_note}</p>
          </div>

          {/* İsteğe Bağlı Açılan Reel Getiri & Küresel Benchmark Simülatörü (GÖREV 2) */}
          <RealReturnSimulator
            fundCodes={allocations.map((a) => a.fund_code)}
            weightsPct={simResult.items_breakdown?.map((item: any) => item.initial_weight_pct)}
            startDate={simResult.actual_start_date || startDate}
            endDate={simResult.actual_end_date || endDate}
            defaultAmount={simResult.total_initial_amount_tl || 100000}
            periodReturnPct={simResult.weighted_return_pct}
            dailySeries={simResult.daily_series}
          />
        </>
      )}
    </div>
  );
}
