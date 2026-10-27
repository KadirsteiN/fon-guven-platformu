"use client";

import React, { useEffect, useState } from "react";
import {
  FileSearch,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Shield,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  StyleDriftRadar,
  ClosetIndexingDetective,
  AcademicPdfReportButton,
  SpkRiskProfileMatcher,
} from "@/components/AcademicModules";

export default function TransparencyPage() {
  const [fundsList, setFundsList] = useState<any[]>([]);
  const [selectedFund, setSelectedFund] = useState("AFT");
  const [evalData, setEvalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>("/api/funds").then((res) => {
      if (res?.funds) setFundsList(res.funds);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch<any>(`/api/transparency/${selectedFund}`)
      .then((res) => setEvalData(res))
      .finally(() => setLoading(false));
  }, [selectedFund]);

  const chk = evalData?.structural_checklist || {};
  const codes =
    fundsList.length > 0
      ? fundsList.map((f: any) => f.fund_code)
      : ["AFT", "MAC", "TTA", "IPB", "TI1"];

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full mb-2">
              <FileSearch className="w-3.5 h-3.5" />
              Fon Şeffaflık Kontrolü • Yapısal Şeffaflık ve Kanıt Değerlendirme Motoru ({codes.length} Fon)
            </span>
            <h2 className="text-xl font-bold">
              Fon Şeffaflık, Saklama ve Veri Tamlığı Kontrol Listesi
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Bu modül fonları &ldquo;kazandırır / kaybettirir&rdquo; diye
              puanlamaz; yalnızca TEFAS veri tamlığı, Takasbank saklama rejimi,
              KAP kimliği ve valör/maliyet şeffaflığını doğrular.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {codes.map((code: string) => (
            <button
              key={code}
              onClick={() => setSelectedFund(code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedFund === code
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {loading || !evalData ? (
        <div className="p-8 text-sm text-slate-500">
          Şeffaflık değerlendirmesi yükleniyor...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Üst Özet Kartı */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                [{evalData.fund_code}] • {evalData.fund_type}
              </div>
              <h3 className="text-lg sm:text-xl font-bold">
                {evalData.fund_title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {evalData.evaluation_purpose}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <AcademicPdfReportButton
                fundCode={evalData.fund_code || selectedFund}
                fundTitle={evalData.fund_title}
                fundType={evalData.fund_type}
                evalData={evalData}
              />
              <div className="text-right">
                <div className="text-xs text-slate-500">
                  Yapısal Şeffaflık Derecesi
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {evalData.transparency_grade}
                </div>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center font-bold shadow-sm">
                <span className="text-xl">
                  {evalData.total_transparency_score_out_of_100}
                </span>
                <span className="text-[10px] opacity-80">/ 100 Puan</span>
              </div>
            </div>
          </div>

          {/* MODÜL 7: SPK Uygunluk Testi Simülatörü (Kişisel Risk Profili 1-7 vs. Fon Risk Değeri Eşleştirici) */}
          <SpkRiskProfileMatcher fundCodes={[evalData.fund_code || selectedFund]} />

          {/* MODÜL 1: Bülten Vaadi vs. Fiili Portföy Sapma Denetçisi (Style Drift Radarı) */}
          <StyleDriftRadar
            fundCode={evalData.fund_code || selectedFund}
            fundTitle={evalData.fund_title}
            fundType={evalData.fund_type}
          />

          {/* MODÜL 2: Gizli İndeksleme (Closet Indexing - R²) ve Alfa (α) Üretim Dedektifi */}
          <ClosetIndexingDetective
            fundCodes={[evalData.fund_code || selectedFund]}
          />

          {/* 4 Kriter Kırılımı */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evalData.criteria_breakdown.map((crit: any) => (
              <div
                key={crit.criterion_id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{crit.criterion_name}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {crit.awarded_points} / {crit.weight_points} Puan
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {crit.evidence_detail}
                </p>
              </div>
            ))}
          </div>

          {/* Resmi Kimlik, Saklama, Valör ve Vergi Kontrol Listesi */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Resmi KAP / TEFAS Yapısal Kimlik ve İşlem Esasları Tablosu
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-xs">
                  Kurucu Portföy Yönetim Şirketi (PYŞ):
                </span>
                <span className="font-semibold">{chk.founder_institution}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-xs">
                  Bağımsız Portföy Saklayıcısı (SPKn Md. 56):
                </span>
                <span className="font-semibold">
                  {chk.custodian_institution}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-xs">
                  Katılma Payı Alım / Satım Valörü:
                </span>
                <span className="font-semibold">
                  Alım: {chk.valor_buy} | Satım: {chk.valor_sell}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-xs">
                  SPK Standart Risk Değeri (1-7 Ölçeği):
                </span>
                <span className="font-semibold">
                  {chk.risk_value_scale_1_7}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-xs">
                  Yönetim Ücreti Kesinti Yöntemi:
                </span>
                <span className="font-semibold">
                  {chk.management_fee_transparency}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-xs">
                  Stopaj / Vergilendirme Notu (GVK Geçici Md. 67):
                </span>
                <span className="font-semibold">{chk.withholding_tax_note}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={chk.kap_page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700"
              >
                Resmi KAP Fon Sayfası <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={chk.tefas_page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Resmi TEFAS Fon Analiz Sayfası{" "}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Metodoloji Sınırı Uyarısı */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Metodoloji ve Sınırlama Bildirimi:</strong>{" "}
              {evalData.methodology_and_limitations}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
