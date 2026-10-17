"use client";

import React, { useEffect, useState } from "react";
import { Sliders, AlertTriangle, TrendingDown, Target } from "lucide-react";
import { apiFetch, formatCurrencyTL, formatNumberTR } from "@/lib/api";
import SvgLineChart from "@/components/SvgLineChart";

export default function ScenariosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>("/api/scenarios/simulate", {
      method: "POST",
      body: JSON.stringify({ scenario_type: "ALL", params: {} }),
    })
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, []);

  const proj = data?.goal_projection_3_scenarios;
  const stress = data?.portfolio_stress_test;
  const shockExp = data?.unexpected_expense_shock;
  const sIncome = data?.cashflow_income_increase_scenario;
  const sExpense = data?.cashflow_expense_increase_scenario;

  const projChartData =
    proj?.monthly_projection_series?.map((m: any) => ({
      month_label: `${m.month_index}. Ay`,
      principal_only_tl: m.principal_only_tl,
      pessimistic_tl: m.pessimistic_tl,
      base_expected_tl: m.base_expected_tl,
      optimistic_tl: m.optimistic_tl,
    })) || [];

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full mb-2">
            <Sliders className="w-3.5 h-3.5" />
            Modül F • 6 Finansal Senaryo ve Yatırım Sepeti Stres Testi Simülatörü
          </span>
          <h2 className="text-xl font-bold">
            250.000 TL Birikim Projeksiyonu, Beklenmedik Gider ve Portföy Stres Testi
          </h2>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
          {data?.scenario_badge || "VARSAYIM VE SENARYO SİMÜLASYONU"}
        </span>
      </div>

      {loading || !data ? (
        <div className="p-8 text-sm text-slate-500">
          Senaryolar simüle ediliyor...
        </div>
      ) : (
        <>
          {/* Senaryo 1, 2 ve 4 Özeti */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-emerald-600">
                Senaryo 1: Gelir +%15 Artarsa
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {sIncome?.interpretation}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-rose-600">
                Senaryo 2: Giderler +%20 Artarsa
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {sExpense?.interpretation}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-amber-600">
                Senaryo 4: 35.000 TL Beklenmedik Gider Şoku
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Acil durum rezervi{" "}
                <strong>
                  {formatCurrencyTL(shockExp.pre_shock.emergency_reserve_tl)}
                </strong>{" "}
                ({shockExp.pre_shock.months_covered} ay) seviyesinden{" "}
                <strong>
                  {formatCurrencyTL(shockExp.post_shock.emergency_reserve_tl)}
                </strong>{" "}
                ({shockExp.post_shock.months_covered} ay) seviyesine düşer.
                Yerine koyma süresi:{" "}
                <strong>
                  {shockExp.post_shock.months_to_replenish_from_savings} ay
                </strong>
                .
              </p>
            </div>
          </div>

          {/* Senaryo 3 & 6: 24 Aylık Birikim Projeksiyonu Grafiği */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Senaryo 3 & 6: 250.000 TL Hedefe Ulaşma ve 24 Aylık Birikim Büyüme Projeksiyonu
                </h3>
                <p className="text-xs text-slate-500">
                  Mevcut 95.000 TL birikim + 20.000 TL/ay düzenli katkı ile 3
                  alternatif getiri varsayımı (Kötümser %15, Baz %30, İyimser
                  %45):
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">
                  %0 Getiri: {proj.months_to_reach_goal.zero_return_months} Ay
                </span>
                <span className="px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                  Kötümser (%15): {proj.months_to_reach_goal.pessimistic_months}{" "}
                  Ay
                </span>
                <span className="px-2.5 py-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                  Baz (%30): {proj.months_to_reach_goal.base_expected_months} Ay
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                  İyimser (%45): {proj.months_to_reach_goal.optimistic_months} Ay
                </span>
              </div>
            </div>

            <SvgLineChart
              data={projChartData}
              xKey="month_label"
              yUnit=" TL"
              referenceLineValue={250000}
              referenceLineLabel="Hedef: 250.000 TL"
              series={[
                {
                  key: "principal_only_tl",
                  label: "Sadece Anapara (%0)",
                  color: "#64748b",
                },
                {
                  key: "pessimistic_tl",
                  label: "Kötümser (%15/Yıl)",
                  color: "#d97706",
                },
                {
                  key: "base_expected_tl",
                  label: "Baz Senaryo (%30/Yıl)",
                  color: "#2563eb",
                },
                {
                  key: "optimistic_tl",
                  label: "İyimser (%45/Yıl)",
                  color: "#059669",
                },
              ]}
            />
          </div>

          {/* Senaryo 5: Yatırım Sepeti Değer Kaybı Stres Testi */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              Senaryo 5: Sanal Yatırım Sepeti Değer Kaybı (Max Drawdown & Piyasa Şoku) Stres Testi
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 pr-4">Stres Senaryosu</th>
                    <th className="py-2.5 px-4 text-right">Şok Oranı</th>
                    <th className="py-2.5 px-4 text-right">
                      Şok Öncesi Sepet
                    </th>
                    <th className="py-2.5 px-4 text-right">Değer Kaybı (TL)</th>
                    <th className="py-2.5 px-4 text-right">
                      Şok Sonrası Sepet
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      Toplam Net Varlık
                    </th>
                    <th className="py-2.5 pl-4 text-right">
                      Hedefe Ulaşma Süresi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {stress?.stress_test_table?.map((row: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 pr-4 font-bold">
                        {row.scenario_label}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                        {formatNumberTR(row.shock_pct)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrencyTL(row.portfolio_value_before_tl)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                        {formatCurrencyTL(row.portfolio_loss_tl)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatCurrencyTL(row.portfolio_value_after_tl)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrencyTL(row.total_wealth_after_tl)}
                      </td>
                      <td className="py-3 pl-4 text-right font-mono">
                        {row.months_to_goal_after_shock} Ay (+
                        {row.goal_delay_months} ay gecikme)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
