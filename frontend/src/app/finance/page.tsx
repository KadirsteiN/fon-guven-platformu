"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
  AlertTriangle,
  PlusCircle,
  ShieldAlert,
  Target,
} from "lucide-react";
import { apiFetch, formatCurrencyTL, formatNumberTR } from "@/lib/api";

export default function FinancePage() {
  const [report, setReport] = useState<any>(null);
  const [txType, setTxType] = useState("EXPENSE");
  const [category, setCategory] = useState("Market/Gıda");
  const [amount, setAmount] = useState(1250);
  const [isFixed, setIsFixed] = useState(1);
  const [description, setDescription] = useState("Ek Mutfak Alışverişi");
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>("/api/finance/report?month_prefix=2026-10");
      setReport(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch<any>("/api/finance/transactions", {
      method: "POST",
      body: JSON.stringify({
        tx_type: txType,
        category,
        amount: Number(amount),
        tx_date: "2026-10-16",
        is_fixed: Number(isFixed),
        description,
      }),
    });
    setReport(res.updated_report);
  };

  const cf = report?.cashflow_summary || {};
  const er = report?.emergency_reserve_analysis || {};

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full mb-2">
            <Wallet className="w-3.5 h-3.5" />
            Modül E • Kişisel Finans, Bütçe Limit Aşımı ve Acil Durum Rezervi
          </span>
          <h2 className="text-xl font-bold">
            Kişisel Nakit Akışı, Tasarruf Kapasitesi ve Acil Durum Rezervi Analizi
          </h2>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">
          Veri Etiketi: {report?.data_origin || "KULLANICI_BUTCE_VERISI"}
        </span>
      </div>

      {report && (
        <>
          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">Toplam Aylık Gelir</div>
              <div className="text-xl font-bold mt-1 text-emerald-600 font-mono">
                {formatCurrencyTL(cf.total_income_tl)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dönem: {report.month_period}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Sabit / Zorunlu Gider + Borç Taksiti
              </div>
              <div className="text-xl font-bold mt-1 text-rose-600 font-mono">
                {formatCurrencyTL(er.mandatory_monthly_burden_tl)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Sabit: {formatCurrencyTL(cf.fixed_mandatory_expenses_tl)} + Borç:{" "}
                {formatCurrencyTL(cf.monthly_debt_payments_tl)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Net Aylık Tasarruf / Yatırım Kapasitesi
              </div>
              <div className="text-xl font-bold mt-1 text-blue-600 font-mono">
                {formatCurrencyTL(cf.net_monthly_savings_capacity_tl)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tasarruf Oranı: %{formatNumberTR(cf.savings_rate_pct)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Acil Durum Rezervi Karşılama Süresi
              </div>
              <div className="text-xl font-bold mt-1 text-amber-600 font-mono">
                {formatNumberTR(er.months_covered)} Ay
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Mevcut: {formatCurrencyTL(er.current_emergency_reserve_tl)}{" "}
                (Önerilen: {er.recommended_range_months})
              </div>
            </div>
          </div>

          {/* Bütçe Aşımı Uyarıları */}
          {report.over_budget_alerts?.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Kategori Bazlı Bütçe Limit Aşım Uyarısı:
              </div>
              {report.over_budget_alerts.map((al: string, i: number) => (
                <div key={i}>• {al}</div>
              ))}
            </div>
          )}

          {/* Sol: Kategori Limitleri & Hedefler | Sağ: Yeni İşlem Ekle */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-bold">
                Kategori Bazlı Harcama ve Aylık Bütçe Limit Kontrolü
              </h3>
              <div className="space-y-3">
                {report.budget_vs_actual?.map((b: any) => {
                  const ratio = b.monthly_limit_tl
                    ? Math.min(100, (b.spent_tl / b.monthly_limit_tl) * 100)
                    : 50;
                  return (
                    <div key={b.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">
                          {b.category}{" "}
                          <span className="text-slate-400 font-normal">
                            (Toplam Çıkışın %{b.share_of_total_outflow_pct}&apos;i)
                          </span>
                        </span>
                        <span className="font-mono">
                          {formatCurrencyTL(b.spent_tl)} /{" "}
                          {formatCurrencyTL(b.monthly_limit_tl)}
                          {b.is_limit_exceeded && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                              AŞIM!
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            b.is_limit_exceeded
                              ? "bg-rose-600"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-blue-600" />
                  Tanımlı Birikim Hedefleri
                </h4>
                {report.savings_goals?.map((g: any) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold">{g.goal_name}</div>
                      <div className="text-slate-500">
                        Hedef Tarih: {g.target_date} • Öncelik: {g.priority}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold">
                      {formatCurrencyTL(g.current_saved)} /{" "}
                      {formatCurrencyTL(g.target_amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sağ: Yeni Gelir/Gider Ekleme Formu */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                Yeni Gelir / Gider Kaydı Ekle
              </h3>
              <form onSubmit={handleAddTransaction} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">İşlem Türü:</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="EXPENSE">Gider (EXPENSE)</option>
                    <option value="INCOME">Gelir (INCOME)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Kategori:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Market/Gıda">Market/Gıda</option>
                    <option value="Kira/Konut">Kira/Konut</option>
                    <option value="Faturalar">Faturalar</option>
                    <option value="Ulaşım">Ulaşım</option>
                    <option value="Eğitim">Eğitim</option>
                    <option value="İsteğe Bağlı">İsteğe Bağlı</option>
                    <option value="Maaş">Maaş</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Tutar (TL):</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Gider Tipi:</label>
                    <select
                      value={isFixed}
                      onChange={(e) => setIsFixed(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value={1}>Zorunlu / Sabit</option>
                      <option value={0}>Değişken / İsteğe Bağlı</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1">Açıklama:</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  İşlemi Kaydet ve Bütçeyi Güncelle
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
