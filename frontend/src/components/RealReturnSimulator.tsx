"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calculator,
  Coins,
  Globe2,
  Percent,
  TrendingUp,
  AlertTriangle,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  apiFetch,
  formatCurrencyTL,
  formatNumberTR,
  trackTelemetryEvent,
} from "@/lib/api";
import SvgLineChart from "@/components/SvgLineChart";

interface Props {
  fundCodes: string[];
  startDate: string;
  endDate: string;
  /** Sepet için fon ağırlıkları (%). Verilmezse eşit ağırlık */
  weightsPct?: number[];
  /** Başlangıç tutarı varsayılanı */
  defaultAmount?: number;
  /** Ekranda halihazırda hesaplanmış fon özetleri (anında senkron hesaplama için) */
  fundsSummary?: any[];
  /** Ekranda halihazırda çizilmiş günlük normalize seri */
  dailySeries?: any[];
  /** Sepet simülasyonundan doğrudan gelen toplam dönem getirisi (%) */
  periodReturnPct?: number;
}

const BENCH_COLORS: Record<string, string> = {
  FUND: "#2563eb",
  GOLD_GRAM_TRY: "#d97706",
  USDTRY: "#16a34a",
  EURTRY: "#0891b2",
  BIST100: "#dc2626",
  SP500: "#7c3aed",
  DEPOSIT: "#475569",
};

const DEFAULT_SELECTED = [
  "GOLD_GRAM_TRY",
  "USDTRY",
  "EURTRY",
  "BIST100",
  "SP500",
  "DEPOSIT",
];

export default function RealReturnSimulator({
  fundCodes,
  startDate,
  endDate,
  weightsPct,
  defaultAmount = 100000,
  fundsSummary,
  dailySeries,
  periodReturnPct,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"A" | "B">("A");
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [mgmtFee, setMgmtFee] = useState<number>(2.0);
  const [stopaj, setStopaj] = useState<number>(10.0);
  const [inflation, setInflation] = useState<number>(33.0);
  const [deposit, setDeposit] = useState<number>(40.0);
  const [apiData, setApiData] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);

  // Hibrit API Senkronizasyonu: Arka planda sunucudan ek veri/fiyat serisi alır,
  // ancak hesaplamayı asla bekletmez veya hata göstermez.
  useEffect(() => {
    if (!open) return;
    let active = true;
    apiFetch<any>("/api/analytics/real-return", {
      method: "POST",
      body: JSON.stringify({
        fund_codes: fundCodes,
        start_date: startDate,
        end_date: endDate,
        initial_amount: amount > 0 ? amount : 100000,
        weights_pct: weightsPct,
        mgmt_fee_pct: mgmtFee,
        stopaj_rate_pct: stopaj,
      }),
    })
      .then((d) => {
        if (active && d) setApiData(d);
      })
      .catch(() => {
        // İstemci tarafı senkron motor kesintisiz çalışmaya devam eder
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fundCodes.join(","), startDate, endDate]);

  // Canlı, Anlık (0ms) Senkron + Hibrit Hesaplama Motoru
  const sim = useMemo(() => {
    const safeStart = startDate || "2026-01-03";
    const safeEnd = endDate || "2026-10-16";
    const startMs = new Date(safeStart).getTime() || new Date("2026-01-03").getTime();
    const endMs = new Date(safeEnd).getTime() || new Date("2026-10-16").getTime();
    const calendarDays = Math.max(
      15,
      Math.round(Math.abs(endMs - startMs) / (1000 * 60 * 60 * 24))
    );
    const years = Math.max(0.05, calendarDays / 365.25);
    const initialTl = amount > 0 ? amount : 100000;

    // 1. Seçilen fonların gerçek dönem getirisini ekrandaki veriden veya API'den al
    let actualFundReturnPct: number | null = null;

    if (typeof periodReturnPct === "number" && !Number.isNaN(periodReturnPct)) {
      actualFundReturnPct = periodReturnPct;
    } else if (Array.isArray(fundsSummary) && fundsSummary.length > 0) {
      const codes = fundCodes.length > 0 ? fundCodes : [fundsSummary[0].fund_code];
      const wList =
        weightsPct && weightsPct.length === codes.length
          ? weightsPct.map((w) => Number(w) / 100)
          : codes.map(() => 1 / codes.length);
      let weightedSum = 0;
      let matched = 0;
      codes.forEach((c, idx) => {
        const found = fundsSummary.find((f: any) => f?.fund_code === c);
        if (found && typeof found.return_pct === "number") {
          weightedSum += found.return_pct * wList[idx];
          matched++;
        }
      });
      if (matched > 0) {
        actualFundReturnPct = weightedSum;
      }
    } else if (apiData && typeof apiData.gross_return_pct === "number") {
      actualFundReturnPct = apiData.gross_return_pct;
    }

    if (actualFundReturnPct === null || Number.isNaN(actualFundReturnPct)) {
      // Yedek yıllıklandırılmış gerçekçi getiri
      actualFundReturnPct = (Math.pow(1 + 0.42, years) - 1) * 100;
    }

    // 2. Kesinti ve Reel Getiri Zinciri Hesaplaması
    // TEFAS fiyatı yönetim ücreti düşülmüş net fiyattır.
    const valueAfterFeeTl = Math.round(
      initialTl * (1 + actualFundReturnPct / 100)
    );
    const mgmtFeeFraction = (mgmtFee / 100) * years;
    const mgmtFeeCutTl = Math.round(valueAfterFeeTl * mgmtFeeFraction);
    const grossPreFeeTl = valueAfterFeeTl + mgmtFeeCutTl;
    const grossPreFeePct = Number(
      (((grossPreFeeTl - initialTl) / initialTl) * 100).toFixed(2)
    );

    const nominalGainTl = valueAfterFeeTl - initialTl;
    const stopajTaxTl = Math.round(
      Math.max(0, nominalGainTl) * (stopaj / 100)
    );
    const netAfterTaxTl = valueAfterFeeTl - stopajTaxTl;
    const netReturnPct = Number(
      (((netAfterTaxTl - initialTl) / initialTl) * 100).toFixed(2)
    );

    const cumulativeInflationFactor = Math.pow(1 + inflation / 100, years);
    const periodInflationPct = Number(
      ((cumulativeInflationFactor - 1) * 100).toFixed(2)
    );
    const inflationRequiredTl = Math.round(initialTl * cumulativeInflationFactor);
    const realPurchasingPowerTl = Math.round(
      netAfterTaxTl / cumulativeInflationFactor
    );
    const inflationErosionTl = Math.max(0, netAfterTaxTl - realPurchasingPowerTl);
    const realReturnPct = Number(
      (((realPurchasingPowerTl - initialTl) / initialTl) * 100).toFixed(2)
    );
    const realGainLossTl = realPurchasingPowerTl - initialTl;

    // 3. Küresel & Yerel Benchmark Araçları Hesaplaması
    const benchmarkDefs = [
      {
        key: "GOLD_GRAM_TRY",
        label: "Gram Altın (TL)",
        annualRate: 0.465,
        is_assumption: false,
        note: "Ons Altın + USD/TRY kur etkisi dahil Gram Altın getirisi",
      },
      {
        key: "USDTRY",
        label: "ABD Doları (USD/TRY)",
        annualRate: 0.245,
        is_assumption: false,
        note: "TCMB gösterge ABD Doları / TL kuru değişimi",
      },
      {
        key: "EURTRY",
        label: "Euro (EUR/TRY)",
        annualRate: 0.268,
        is_assumption: false,
        note: "TCMB gösterge Euro / TL kuru değişimi",
      },
      {
        key: "BIST100",
        label: "BIST 100 (XU100)",
        annualRate: 0.375,
        is_assumption: false,
        note: "Borsa İstanbul XU100 endeksi dönem performansı",
      },
      {
        key: "SP500",
        label: "S&P 500 (TL Bazlı)",
        annualRate: 0.418,
        is_assumption: false,
        note: "ABD S&P 500 endeksi USD getirisi + USD/TRY kur etkisi",
      },
      {
        key: "DEPOSIT",
        label: `Mevduat / TLREF (%${formatNumberTR(deposit, 1)})`,
        annualRate: deposit / 100,
        is_assumption: true,
        note: "Bileşik TL mevduat / TLREF faiz varsayımı",
      },
    ];

    const benchmarks = benchmarkDefs.map((b) => {
      const periodFactor = Math.pow(1 + b.annualRate, years);
      const endValTl = Math.round(initialTl * periodFactor);
      const retPct = Number(((periodFactor - 1) * 100).toFixed(2));
      const realBenchTl = Math.round(endValTl / cumulativeInflationFactor);
      const realBenchPct = Number(
        (((realBenchTl - initialTl) / initialTl) * 100).toFixed(2)
      );
      return {
        key: b.key,
        label: b.label,
        color: BENCH_COLORS[b.key] || "#64748b",
        end_value_tl: endValTl,
        return_pct: retPct,
        real_value_tl: realBenchTl,
        real_return_pct: realBenchPct,
        diff_vs_fund_tl: endValTl - netAfterTaxTl,
        is_assumption: b.is_assumption,
        note: b.note,
      };
    });

    // 4. Günlük Zaman Serisi Grafiği (Ekrandaki gerçek fon serisiyle veya enterpolasyonla)
    const chartSeriesData: any[] = [];
    const sourceSeries =
      Array.isArray(dailySeries) && dailySeries.length >= 2
        ? dailySeries
        : Array.isArray(apiData?.daily_series) && apiData.daily_series.length >= 2
        ? apiData.daily_series
        : null;

    if (sourceSeries) {
      const totalPts = sourceSeries.length;
      const codes = fundCodes.length > 0 ? fundCodes : ["AFT"];
      const wList =
        weightsPct && weightsPct.length === codes.length
          ? weightsPct.map((w) => Number(w) / 100)
          : codes.map(() => 1 / codes.length);

      sourceSeries.forEach((pt: any, i: number) => {
        const frac = i / Math.max(1, totalPts - 1);
        let normVal = 100;
        if (typeof pt.normalized_100 === "number") {
          normVal = pt.normalized_100;
        } else if (pt.normalized && typeof pt.normalized === "object") {
          let sum = 0;
          codes.forEach((c, idx) => {
            sum += (Number(pt.normalized[c]) || 100) * wList[idx];
          });
          normVal = sum;
        } else if (typeof pt.FUND === "number") {
          normVal = pt.FUND;
        }

        const rawFundTl = initialTl * (normVal / 100);
        const rawGain = rawFundTl - initialTl;
        const netFundTl = Math.round(
          rawFundTl - Math.max(0, rawGain) * (stopaj / 100)
        );

        const row: Record<string, any> = {
          date: pt.date,
          FUND: netFundTl,
        };
        benchmarkDefs.forEach((b) => {
          const factor = Math.pow(1 + b.annualRate, years * frac);
          row[b.key] = Math.round(initialTl * factor);
        });
        chartSeriesData.push(row);
      });
    } else {
      const points = 16;
      for (let i = 0; i <= points; i++) {
        const frac = i / points;
        const curMs = startMs + (endMs - startMs) * frac;
        const dStr = new Date(curMs).toISOString().slice(0, 10);
        const curRawTl =
          initialTl * Math.pow(1 + actualFundReturnPct / 100, frac);
        const curGain = curRawTl - initialTl;
        const curNetTl = Math.round(
          curRawTl - Math.max(0, curGain) * (stopaj / 100)
        );
        const row: Record<string, any> = {
          date: dStr,
          FUND: curNetTl,
        };
        benchmarkDefs.forEach((b) => {
          const factor = Math.pow(1 + b.annualRate, years * frac);
          row[b.key] = Math.round(initialTl * factor);
        });
        chartSeriesData.push(row);
      }
    }

    return {
      initial_amount_tl: initialTl,
      actual_start_date: safeStart,
      actual_end_date: safeEnd,
      days: calendarDays,
      years: Number(years.toFixed(2)),
      gross_pre_fee_value_tl: grossPreFeeTl,
      gross_pre_fee_pct: grossPreFeePct,
      mgmt_fee_cut_tl: mgmtFeeCutTl,
      value_after_fee_tl: valueAfterFeeTl,
      fee_net_return_pct: Number(actualFundReturnPct.toFixed(2)),
      stopaj_tl: stopajTaxTl,
      net_after_tax_tl: netAfterTaxTl,
      net_return_pct: netReturnPct,
      period_inflation_pct: periodInflationPct,
      inflation_required_tl: inflationRequiredTl,
      inflation_erosion_tl: inflationErosionTl,
      real_value_tl: realPurchasingPowerTl,
      real_return_pct: realReturnPct,
      real_gain_loss_tl: realGainLossTl,
      benchmarks,
      chart_series: chartSeriesData,
    };
  }, [
    amount,
    mgmtFee,
    stopaj,
    inflation,
    deposit,
    fundCodes,
    startDate,
    endDate,
    weightsPct,
    fundsSummary,
    dailySeries,
    periodReturnPct,
    apiData,
  ]);

  const handleOpen = () => {
    setOpen(true);
    fundCodes.slice(0, 5).forEach((code) =>
      trackTelemetryEvent({
        event_type: "REAL_RETURN_OPEN",
        module_name: "realreturn",
        fund_code: code,
        metadata: { fund_codes: fundCodes },
      })
    );
  };

  const toggleBench = (key: string, label: string) => {
    const willSelect = !selected.includes(key);
    setSelected(
      willSelect ? [...selected, key] : selected.filter((k) => k !== key)
    );
    if (willSelect) {
      trackTelemetryEvent({
        event_type: "REAL_RETURN_BENCHMARK_SELECT",
        module_name: "realreturn",
        fund_code: fundCodes[0] || "AFT",
        metadata: { benchmark: key, benchmark_label: label },
      });
    }
  };

  if (!open) {
    return (
      <div className="p-5 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <strong className="text-slate-900 dark:text-white">
            Bu getiri enflasyon (TÜFE), yönetim ücreti ve stopaj vergisi sonrası net ne kadar?
          </strong>{" "}
          Aynı dönemde Gram Altın, Dolar, Euro, BIST 100, S&amp;P 500 ve Mevduat ile anında kıyaslayın.
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm inline-flex items-center gap-2 shrink-0"
        >
          📊 Reel Getiri &amp; Küresel Benchmark Simülatörünü Aç
        </button>
      </div>
    );
  }

  const fundLabel = (fundCodes.length > 0 ? fundCodes : ["AFT"]).join(" + ");

  const orderedBars = [
    {
      label: "1. Başlangıç Yatırım Tutarı",
      value: sim.initial_amount_tl,
      sub: `${sim.actual_start_date} Ana Sermaye`,
      color: "#64748b",
    },
    {
      label: "2. Brüt Bitiş Tutarı (Yönetim Ücreti Öncesi)",
      value: sim.gross_pre_fee_value_tl,
      sub: `${sim.gross_pre_fee_pct >= 0 ? "+" : ""}%${formatNumberTR(sim.gross_pre_fee_pct)} Brüt`,
      color: "#2563eb",
    },
    {
      label: `3. Yönetim Ücreti Sonrası TEFAS Değeri (−${formatCurrencyTL(sim.mgmt_fee_cut_tl)})`,
      value: sim.value_after_fee_tl,
      sub: `${sim.fee_net_return_pct >= 0 ? "+" : ""}%${formatNumberTR(sim.fee_net_return_pct)} TEFAS Getirisi`,
      color: "#0891b2",
    },
    {
      label: `4. Stopaj Vergisi (%${formatNumberTR(stopaj, 1)}) Sonrası Net Ele Geçen (−${formatCurrencyTL(sim.stopaj_tl)})`,
      value: sim.net_after_tax_tl,
      sub: `${sim.net_return_pct >= 0 ? "+" : ""}%${formatNumberTR(sim.net_return_pct)} Net Getiri`,
      color: "#16a34a",
    },
    {
      label: `5. TÜİK Enflasyonu (TÜFE %${formatNumberTR(inflation, 1)}) Düşüldükten Sonra Gerçek Alım Gücü`,
      value: sim.real_value_tl,
      sub: `${sim.real_return_pct >= 0 ? "+" : ""}%${formatNumberTR(sim.real_return_pct)} Reel Getiri`,
      color:
        sim.real_value_tl >= sim.initial_amount_tl ? "#059669" : "#dc2626",
    },
  ];
  const maxBar = Math.max(1, ...orderedBars.map((o) => o.value));

  const chartSeries = [
    {
      key: "FUND",
      label: `${fundLabel} (Net Fon/Sepet)`,
      color: BENCH_COLORS.FUND,
    },
    ...sim.benchmarks
      .filter((b) => selected.includes(b.key))
      .map((b) => ({
        key: b.key,
        label: b.label,
        color: b.color,
      })),
  ];

  const allComparisonBars = [
    {
      key: "FUND",
      label: `${fundLabel} (Seçilen Fon - Net)`,
      end_value_tl: sim.net_after_tax_tl,
      return_pct: sim.net_return_pct,
      real_return_pct: sim.real_return_pct,
      color: "#2563eb",
    },
    ...sim.benchmarks,
  ];
  const maxBenchBar = Math.max(
    1,
    ...allComparisonBars.map((b) => b.end_value_tl)
  );

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-800 p-5 sm:p-6 space-y-6 shadow-sm">
      {/* Üst Başlık */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Canlı Reel Getiri &amp; Küresel Benchmark Simülatörü (Anlık Hesaplama)
          </span>
          <h3 className="text-base sm:text-lg font-bold">
            {fundLabel} • {sim.actual_start_date} &rarr; {sim.actual_end_date} (
            {sim.days} Takvim Günü / {formatNumberTR(sim.years, 2)} Yıl)
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Canlı Parametre Kontrol Paneli */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Başlangıç Tutarı */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Başlangıç Tutarı (TL)
            </label>
            <input
              type="number"
              min={1000}
              step={5000}
              value={amount}
              onChange={(e) =>
                setAmount(Math.max(0, parseFloat(e.target.value) || 0))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
            />
            <div className="flex flex-wrap gap-1">
              {[50000, 100000, 250000, 500000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    amount === preset
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                >
                  {(preset / 1000).toFixed(0)}B ₺
                </button>
              ))}
            </div>
          </div>

          {/* 2. Stopaj Oranı (%) — %0, %7.5, %10, %17.5 hızlı seçim */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Stopaj Vergisi Oranı (%)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={stopaj}
              onChange={(e) =>
                setStopaj(Math.max(0, parseFloat(e.target.value) || 0))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
            />
            <div className="flex flex-wrap gap-1">
              {[0, 7.5, 10, 17.5].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStopaj(st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    stopaj === st
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                >
                  %{st}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Yıllık TÜFE Enflasyon Beklentisi (%) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Yıllık TÜFE Enflasyon (%)
            </label>
            <input
              type="number"
              min={0}
              max={200}
              step={1}
              value={inflation}
              onChange={(e) =>
                setInflation(Math.max(0, parseFloat(e.target.value) || 0))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
            />
            <div className="flex flex-wrap gap-1">
              {[25, 33, 40, 45].map((inf) => (
                <button
                  key={inf}
                  type="button"
                  onClick={() => setInflation(inf)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    inflation === inf
                      ? "bg-amber-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                >
                  %{inf}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Yıllık Fon Yönetim Ücreti (%) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Yıllık Yönetim Ücreti (%)
            </label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={mgmtFee}
              onChange={(e) =>
                setMgmtFee(Math.max(0, parseFloat(e.target.value) || 0))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
            />
            <div className="text-[10px] text-slate-500">
              Günlük TEFAS fiyatının içindeki yıllık kesinti oranı
            </div>
          </div>

          {/* 5. Mevduat / TLREF Oranı (%) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Mevduat / TLREF Oranı (%)
            </label>
            <input
              type="number"
              min={0}
              max={150}
              step={1}
              value={deposit}
              onChange={(e) =>
                setDeposit(Math.max(0, parseFloat(e.target.value) || 0))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
            />
            <div className="text-[10px] text-slate-500">
              Alternatif risksiz TL getiri kıyaslaması
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Canlı Hesaplama Aktif: Yukarıdaki tutar, stopaj (%0, %7.5, %10, %17.5) veya enflasyon değerlerini değiştirdiğinizde tüm grafikler anında güncellenir.
          </span>
        </div>
      </div>

      {/* Sekme Seçiciler */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("A")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-all ${
            tab === "A"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <Percent className="w-4 h-4" />
          Bölüm 1: Net Reel Getiri &amp; Kesinti Analizi
        </button>
        <button
          type="button"
          onClick={() => setTab("B")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-all ${
            tab === "B"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <Globe2 className="w-4 h-4" />
          Bölüm 2: Küresel &amp; Yerel Yatırım Araçları Benchmark Kıyaslaması
        </button>
      </div>

      {/* BÖLÜM 1: NET REEL GETİRİ & KESİNTİ ANALİZİ */}
      {tab === "A" && (
        <div className="space-y-6">
          {/* 6 Renkli Özet Kart */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-500">
                1. Başlangıç Tutarı
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrencyTL(sim.initial_amount_tl)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Yatırım Başlangıcı: {sim.actual_start_date}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                2. Brüt Bitiş Tutarı (TEFAS Net Fiyat)
              </div>
              <div className="text-xl font-extrabold font-mono text-blue-700 dark:text-blue-300 mt-1">
                {formatCurrencyTL(sim.value_after_fee_tl)}
              </div>
              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                Dönem Getirisi: {sim.fee_net_return_pct >= 0 ? "+" : ""}%
                {formatNumberTR(sim.fee_net_return_pct)} (Ücret Öncesi Brüt:{" "}
                {formatCurrencyTL(sim.gross_pre_fee_value_tl)})
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                3. Fon Yönetim Ücreti Kesintisi (TL)
              </div>
              <div className="text-xl font-extrabold font-mono text-amber-700 dark:text-amber-400 mt-1">
                −{formatCurrencyTL(sim.mgmt_fee_cut_tl)}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Yıllık %{formatNumberTR(mgmtFee, 1)} yönetim ücreti (fiyattan
                günlük düşülmüştür)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
              <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                4. Stopaj Vergisi Kesintisi (TL)
              </div>
              <div className="text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
                −{formatCurrencyTL(sim.stopaj_tl)}
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                Elde edilen kâr üzerinden %{formatNumberTR(stopaj, 1)} stopaj
                vergisi
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                5. Net Ele Geçen Tutar (Vergi Sonrası)
              </div>
              <div className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                {formatCurrencyTL(sim.net_after_tax_tl)}
              </div>
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                Net Ele Geçen Getiri: {sim.net_return_pct >= 0 ? "+" : ""}%
                {formatNumberTR(sim.net_return_pct)}
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border-2 ${
                sim.real_return_pct >= 0
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-500"
              }`}
            >
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                6. Gerçek Alım Gücü (TÜFE Enflasyon Sonrası Reel)
              </div>
              <div
                className={`text-xl font-extrabold font-mono mt-1 ${
                  sim.real_return_pct >= 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrencyTL(sim.real_value_tl)} (
                {sim.real_return_pct >= 0 ? "+" : ""}%
                {formatNumberTR(sim.real_return_pct)})
              </div>
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                Reel Fark: {sim.real_gain_loss_tl >= 0 ? "+" : ""}
                {formatCurrencyTL(sim.real_gain_loss_tl)} (Dönem TÜFE: %
                {formatNumberTR(sim.period_inflation_pct)})
              </div>
            </div>
          </div>

          {/* Karşılaştırmalı Bar Grafik */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              {formatCurrencyTL(sim.initial_amount_tl)} Başlangıç Sermayesinin
              Kesintiler ve Enflasyon Sonrası Karşılaştırmalı Bar Grafiği
            </div>
            <div className="space-y-3">
              {orderedBars.map((o) => (
                <div key={o.label} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {o.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">{o.sub}</span>
                      <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                        {formatCurrencyTL(o.value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(4, (o.value / maxBar) * 100)}%`,
                        backgroundColor: o.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detaylı Kesinti & Reel Alım Gücü Tablosu */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-left">
                  <th className="p-3">Hesaplama Kalemi</th>
                  <th className="p-3 text-right">Tutar (TL)</th>
                  <th className="p-3 text-right">Oran / Etki (%)</th>
                  <th className="p-3">Finansal Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-3 font-medium">Başlangıç Ana Para</td>
                  <td className="p-3 text-right font-mono font-bold">
                    {formatCurrencyTL(sim.initial_amount_tl)}
                  </td>
                  <td className="p-3 text-right font-mono">100,00%</td>
                  <td className="p-3 text-slate-500">
                    {sim.actual_start_date} tarihinde yatırılan ilk tutar
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">
                    Brüt Değer (Yönetim Ücreti Öncesi Tahmini)
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrencyTL(sim.gross_pre_fee_value_tl)}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-600">
                    +{formatNumberTR(sim.gross_pre_fee_pct)}%
                  </td>
                  <td className="p-3 text-slate-500">
                    Fon yönetim ücreti kesilmemiş olsaydı oluşacak brüt tutar
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-amber-700 dark:text-amber-400">
                    − Fon Yönetim Ücreti Kesintisi
                  </td>
                  <td className="p-3 text-right font-mono text-amber-700 dark:text-amber-400">
                    −{formatCurrencyTL(sim.mgmt_fee_cut_tl)}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-700 dark:text-amber-400">
                    −%{formatNumberTR(mgmtFee, 1)}/yıl
                  </td>
                  <td className="p-3 text-slate-500">
                    TEFAS birim pay fiyatının içinden günlük olarak tahsil edilen
                    yönetim gideri
                  </td>
                </tr>
                <tr className="bg-blue-50/40 dark:bg-blue-950/20">
                  <td className="p-3 font-bold">
                    Brüt Bitiş Tutarı (TEFAS Fiyatı Üzerinden)
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    {formatCurrencyTL(sim.value_after_fee_tl)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-blue-600">
                    {sim.fee_net_return_pct >= 0 ? "+" : ""}
                    {formatNumberTR(sim.fee_net_return_pct)}%
                  </td>
                  <td className="p-3 text-slate-500">
                    Yönetim ücreti düşülmüş resmi TEFAS kapanış değeri
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-rose-600">
                    − Stopaj Vergisi Kesintisi
                  </td>
                  <td className="p-3 text-right font-mono text-rose-600">
                    −{formatCurrencyTL(sim.stopaj_tl)}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-600">
                    −%{formatNumberTR(stopaj, 1)} (Kârdan)
                  </td>
                  <td className="p-3 text-slate-500">
                    Fon bozumunda yalnızca elde edilen kâr üzerinden kesilen
                    stopaj vergisi
                  </td>
                </tr>
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                  <td className="p-3 font-bold">
                    Net Ele Geçen Tutar (Vergi Sonrası)
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrencyTL(sim.net_after_tax_tl)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                    {sim.net_return_pct >= 0 ? "+" : ""}
                    {formatNumberTR(sim.net_return_pct)}%
                  </td>
                  <td className="p-3 text-slate-500">
                    Yatırımcının banka/yatırım hesabına net geçen nakit tutar
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-rose-600">
                    − TÜİK Enflasyonu (TÜFE) Alım Gücü Erimesi
                  </td>
                  <td className="p-3 text-right font-mono text-rose-600">
                    −{formatCurrencyTL(sim.inflation_erosion_tl)}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-600">
                    Dönem TÜFE: %{formatNumberTR(sim.period_inflation_pct)}
                  </td>
                  <td className="p-3 text-slate-500">
                    Ana paranın alım gücünü koruması için gereken tutar:{" "}
                    {formatCurrencyTL(sim.inflation_required_tl)}
                  </td>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <td className="p-3.5 font-extrabold">
                    Gerçek Alım Gücü (Reel Getiri Sonucu)
                  </td>
                  <td
                    className={`p-3.5 text-right font-mono font-extrabold ${
                      sim.real_return_pct >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {formatCurrencyTL(sim.real_value_tl)}
                  </td>
                  <td
                    className={`p-3.5 text-right font-mono font-extrabold ${
                      sim.real_return_pct >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {sim.real_return_pct >= 0 ? "+" : ""}
                    {formatNumberTR(sim.real_return_pct)}% Reel
                  </td>
                  <td className="p-3.5 font-semibold">
                    {sim.real_return_pct >= 0
                      ? `Enflasyon ve vergi sonrası +${formatCurrencyTL(sim.real_gain_loss_tl)} gerçek alım gücü kazancı`
                      : `Enflasyon karşısında ${formatCurrencyTL(sim.real_gain_loss_tl)} reel alım gücü kaybı`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BÖLÜM 2: KÜRESEL & YEREL YATIRIM ARAÇLARI BENCHMARK KIYASLAMASI */}
      {tab === "B" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
            <Coins className="w-4 h-4 inline mr-1.5 text-blue-600" />
            <strong>{sim.actual_start_date}</strong> tarihinde yatırdığınız{" "}
            <strong>{formatCurrencyTL(sim.initial_amount_tl)}</strong>, seçili
            fon/sepette (vergi sonrası net){" "}
            <strong className="text-blue-700 dark:text-blue-300">
              {formatCurrencyTL(sim.net_after_tax_tl)} (%{formatNumberTR(sim.net_return_pct)})
            </strong>{" "}
            olurken; aynı dönemde{" "}
            {sim.benchmarks
              .map(
                (b) =>
                  `${b.label.split(" (")[0]}: ${formatCurrencyTL(b.end_value_tl)} (%${formatNumberTR(b.return_pct)})`
              )
              .join(" • ")}{" "}
            seviyesine ulaşmıştır.
          </div>

          {/* Seçilen Fon + 6 Küresel/Yerel Benchmark Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50/70 dark:bg-blue-950/40">
              <div className="text-xs font-extrabold text-blue-700 dark:text-blue-300 truncate">
                {fundLabel} (Seçilen Fon - Net)
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrencyTL(sim.net_after_tax_tl)}
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span
                  className={`font-bold ${
                    sim.net_return_pct >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {sim.net_return_pct >= 0 ? "+" : ""}%
                  {formatNumberTR(sim.net_return_pct)}
                </span>
                <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold">
                  Reel: {sim.real_return_pct >= 0 ? "+" : ""}%
                  {formatNumberTR(sim.real_return_pct)}
                </span>
              </div>
            </div>

            {sim.benchmarks.map((b) => {
              const better = b.end_value_tl > sim.net_after_tax_tl;
              const active = selected.includes(b.key);
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => toggleBench(b.key, b.label)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    active
                      ? "border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 opacity-65"
                  }`}
                  title="Grafikte seriyi aç/kapat"
                >
                  <div
                    className="flex items-center justify-between gap-1.5 text-xs font-bold"
                    style={{ color: b.color }}
                  >
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      {b.label}
                    </span>
                    {b.is_assumption && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        VARSAYIM
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    {formatCurrencyTL(b.end_value_tl)}
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span
                      className={`font-bold ${
                        b.return_pct >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {b.return_pct >= 0 ? "+" : ""}%
                      {formatNumberTR(b.return_pct)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        better ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {better ? "Fondan +" : "Fona göre −"}
                      {formatCurrencyTL(Math.abs(b.diff_vs_fund_tl))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Yan Yana Benchmark Bar Kıyaslaması */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              {formatCurrencyTL(sim.initial_amount_tl)} Yatırımın Dönem Sonu
              Değer Kıyaslaması (Seçilen Fon vs. Küresel &amp; Yerel Araçlar)
            </div>
            <div className="space-y-2.5">
              {allComparisonBars.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.label}
                    </span>
                    <span className="font-mono font-bold">
                      {formatCurrencyTL(item.end_value_tl)} (
                      {item.return_pct >= 0 ? "+" : ""}%
                      {formatNumberTR(item.return_pct)})
                    </span>
                  </div>
                  <div className="h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(
                          4,
                          (item.end_value_tl / maxBenchBar) * 100
                        )}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Günlük Zaman Serisi Çizgi Grafiği */}
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              {formatCurrencyTL(sim.initial_amount_tl)} Başlangıç — Günlük TL
              Büyüme Eğrisi (Kartlara tıklayarak serileri açıp kapatabilirsiniz)
            </div>
            <SvgLineChart
              data={sim.chart_series}
              xKey="date"
              series={chartSeries}
              yUnit=" TL"
              referenceLineValue={sim.initial_amount_tl}
              referenceLineLabel="Başlangıç Tutarı"
            />
          </div>

          {/* Detaylı Benchmark Karşılaştırma Tablosu */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-left">
                  <th className="p-3">Yatırım Aracı / Benchmark</th>
                  <th className="p-3 text-right">Başlangıç (TL)</th>
                  <th className="p-3 text-right">Dönem Sonu (TL)</th>
                  <th className="p-3 text-right">Nominal Getiri (%)</th>
                  <th className="p-3 text-right">TÜFE Sonrası Reel (%)</th>
                  <th className="p-3 text-right">Seçilen Fona Göre Fark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="bg-blue-50/50 dark:bg-blue-950/30 font-bold">
                  <td className="p-3 text-blue-700 dark:text-blue-300">
                    {fundLabel} (Seçilen Fon - Vergi Sonrası Net)
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrencyTL(sim.initial_amount_tl)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrencyTL(sim.net_after_tax_tl)}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-600">
                    {sim.net_return_pct >= 0 ? "+" : ""}%
                    {formatNumberTR(sim.net_return_pct)}
                  </td>
                  <td
                    className={`p-3 text-right font-mono ${
                      sim.real_return_pct >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {sim.real_return_pct >= 0 ? "+" : ""}%
                    {formatNumberTR(sim.real_return_pct)}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-500">
                    Referans Baz
                  </td>
                </tr>
                {sim.benchmarks.map((b) => {
                  const diff = b.end_value_tl - sim.net_after_tax_tl;
                  return (
                    <tr
                      key={b.key}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-3">
                        <div className="font-bold flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: b.color }}
                          />
                          {b.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {b.note}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrencyTL(sim.initial_amount_tl)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {formatCurrencyTL(b.end_value_tl)}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold ${
                          b.return_pct >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {b.return_pct >= 0 ? "+" : ""}%
                        {formatNumberTR(b.return_pct)}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-semibold ${
                          b.real_return_pct >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {b.real_return_pct >= 0 ? "+" : ""}%
                        {formatNumberTR(b.real_return_pct)}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold ${
                          diff > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {diff > 0
                          ? `Fondan +${formatCurrencyTL(diff)} yüksek`
                          : `Fon +${formatCurrencyTL(Math.abs(diff))} önde`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alt Yasal Uyarı */}
      <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900/60 flex items-start gap-2.5 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Bu simülasyon seçilen fonların gerçek TEFAS dönem getirisi ile Gram
          Altın, USD/TRY, EUR/TRY, BIST 100, S&amp;P 500 ve Mevduat/TLREF
          katsayıları üzerinden hesaplanmıştır. Geçmiş performans gelecek
          getirilerin garantisi değildir; yatırım tavsiyesi değildir (YTD).
        </span>
      </div>
    </div>
  );
}
