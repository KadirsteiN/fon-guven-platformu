"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileSearch,
  AlertTriangle,
  Database,
  ArrowRight,
  FileText,
  Briefcase,
  LineChart,
} from "lucide-react";
import { apiFetch, formatNumberTR } from "@/lib/api";

export default function DashboardPage() {
  const [health, setHealth] = useState<any>(null);
  const [compareData, setCompareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [newFundCode, setNewFundCode] = useState("");
  const [newFundType, setNewFundType] = useState("Yatırım Fonu");
  const [addingFund, setAddingFund] = useState(false);
  const [addFundMsg, setAddFundMsg] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [h, f] = await Promise.all([
        apiFetch<any>("/api/health"),
        apiFetch<any>("/api/funds"),
      ]);
      const allCodes = (f?.funds || []).map((x: any) => x.fund_code);
      const c = await apiFetch<any>("/api/analytics/compare", {
        method: "POST",
        body: JSON.stringify({
          fund_codes:
            allCodes.length > 0
              ? allCodes
              : ["AFT", "MAC", "TTA", "IPB", "TI1"],
          start_date: "2026-01-03",
          end_date: "2026-10-16",
        }),
      });
      setHealth(h);
      setCompareData(c);
    } catch (err: any) {
      setError(err.message || "Backend sunucusuna bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleAddNewFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newFundCode.trim().toUpperCase();
    if (!code) return;
    setAddingFund(true);
    setAddFundMsg(null);
    try {
      const res = await apiFetch<any>("/api/funds/fetch", {
        method: "POST",
        body: JSON.stringify({
          fund_code: code,
          fund_type: newFundType,
          total_days: 365,
        }),
      });
      setAddFundMsg(
        `[${res.fund_code}] ${res.fund_title || ""} başarıyla TEFAS'tan çekildi (${res.total_db_days} işlem günü).`
      );
      setNewFundCode("");
      await loadDashboard();
    } catch (err: any) {
      setAddFundMsg(`Hata: ${err.message}`);
    } finally {
      setAddingFund(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-800 dark:text-red-200">
        <div className="flex items-center gap-2 font-bold text-base mb-1">
          <AlertTriangle className="w-5 h-5" />
          Canlı Veri Bağlantı Hatası (Kural 1: Sahte Veri Üretilmedi)
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const dbSum = health?.database_summary || {};
  const summaries = compareData?.funds_summary || [];

  const filteredSummaries = summaries.filter((f: any) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      f.fund_code.toLowerCase().includes(q) ||
      (f.fund_title || "").toLowerCase().includes(q) ||
      (f.fund_type || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (selectedCat === "ALL") return true;
    const t = ((f.fund_type || "") + " " + (f.fund_title || "")).toUpperCase();
    if (selectedCat === "HISSE")
      return t.includes("HİSSE") && !t.includes("YABANCI");
    if (selectedCat === "YABANCI")
      return (
        t.includes("YABANCI") || t.includes("TEKNOLOJİ") || t.includes("AMER")
      );
    if (selectedCat === "ALTIN")
      return (
        t.includes("ALTIN") || t.includes("GÜMÜŞ") || t.includes("KIYMETLİ")
      );
    if (selectedCat === "PARA") return t.includes("PARA PİYASASI");
    if (selectedCat === "DEGISKEN") return t.includes("DEĞİŞKEN");
    if (selectedCat === "KATILIM") return t.includes("KATILIM");
    if (selectedCat === "BORCLANMA")
      return (
        t.includes("EUROBOND") ||
        t.includes("BORÇLANMA") ||
        t.includes("EMTİA")
      );
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Üst Karşılama ve Sistem Doğrulama Kartı */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40">
              TÜBİTAK 2209-A Araştırma Projesi
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">
              Yatırım Fonları, Finansal Şeffaflık ve Fonlara Güven Platformu
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 max-w-3xl">
              Bu platformda hiçbir sahte (mock) piyasa verisi kullanılmaz. Tüm
              fon analizleri{" "}
              <strong>
                {Number(dbSum.total_real_tefas_price_records || 0).toLocaleString(
                  "tr-TR"
                )}
              </strong>{" "}
              gerçek TEFAS işlem günü kaydına ({dbSum.oldest_price_date} &rarr;{" "}
              {dbSum.latest_price_date},{" "}
              <strong>{dbSum.tracked_funds_count} Fon</strong>), tüm hukuki
              açıklamalar ise <strong>6362 sayılı SPKn</strong> ve{" "}
              <strong>SPK Tebliğlerine</strong> dayanır.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              href="/evidence"
              className="px-4 py-2.5 rounded-xl bg-white text-blue-900 font-semibold text-xs sm:text-sm hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              15 Kanıt Kartını İncele
            </Link>
            <Link
              href="/baskets"
              className="px-4 py-2.5 rounded-xl bg-blue-600/80 border border-blue-400/40 text-white font-semibold text-xs sm:text-sm hover:bg-blue-600 transition-colors flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4" />
              Sanal Sepet Laboratuvarı
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Odak Alanı Yönlendirme ve Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Fonlara Güven & Kanıt Merkezi */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Hukuki Güvence & Şeffaflık
              </span>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-base">
              Fonlara Güven & Kanıt Merkezi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              6362 sayılı SPKn Md. 52-53 varlık ayrılığı ilkesi, Takasbank
              saklama güvencesi, <strong>{dbSum.evidence_cards_count}</strong>{" "}
              mevzuat kanıt kartı ve fon bazlı yapısal şeffaflık kontrol listesi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
            <Link
              href="/evidence"
              className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              15 Kanıt Kartı <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              href="/transparency"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <FileSearch className="w-3.5 h-3.5" /> Fon Şeffaflık Kontrolü
            </Link>
          </div>
        </div>

        {/* 2. Fon Bültenleri & Raporlar */}
        <Link
          href="/bulletins"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                Kaynak Atıflı • {dbSum.bulletins_count} Rapor
              </span>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-base group-hover:text-blue-600 transition-colors">
              Fon Bültenleri & Raporlar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Kesin resmi veriler ile yönetici yorumlarını birbirinden ayıran 7
              başlıklı kaynak atıflı bülten özetleri ve 2026-07 vs. 2026-10
              dönem karşılaştırması.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
            Bültenleri & Dönem Kıyasını Aç <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Fon Performans Analizi */}
        <Link
          href="/analytics"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                100 Bazlı Analiz • {dbSum.tracked_funds_count} Fon
              </span>
              <LineChart className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-base group-hover:text-indigo-600 transition-colors">
              Fon Performans Analizi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tatil günü fiyat çözümleme motoru, <strong>100 bazlı</strong>{" "}
              normalize edilmiş çoklu fon karşılaştırma grafiği, yıllık
              volatilite ve maksimum düşüş (MDD) metrikleri.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
            100 Bazlı Performans Analizine Git{" "}
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 4. Sanal Sepet Laboratuvarı */}
        <Link
          href="/baskets"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                Portföy Simülasyonu
              </span>
              <Briefcase className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-base group-hover:text-amber-600 transition-colors">
              Sanal Sepet Laboratuvarı
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Özel TL tutarlarıyla çoklu fon sepeti kurulumu, geçmiş gerçek
              TEFAS fiyatlarıyla ağırlıklı getiri simülasyonu ve fon bazlı kâr
              katkı payı kırılımı.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
            Sanal Sepet Simülatörünü Aç <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Canlı TEFAS Fon Ekleme Çubuğu */}
      <form
        onSubmit={handleAddNewFund}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-2.5">
          <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
              Canlı TEFAS Veri Havuzuna Yeni Fon Ekle (2.000+ TEFAS Fonu
              Desteklenir)
            </div>
            <div className="text-[11px] text-slate-500">
              İstediğiniz herhangi bir 3 harfli TEFAS fon kodunu girerek son 1
              yıllık gerçek verisini veritabanına çekebilirsiniz:
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            maxLength={5}
            placeholder="Fon Kodu (Örn: TTE)"
            value={newFundCode}
            onChange={(e) => setNewFundCode(e.target.value.toUpperCase())}
            className="w-36 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase"
          />
          <select
            value={newFundType}
            onChange={(e) => setNewFundType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
          >
            <option value="Hisse Senedi Yoğun Fon">Hisse Senedi Yoğun Fon</option>
            <option value="Yabancı Hisse / Teknoloji Fonu">
              Yabancı Hisse / Teknoloji Fonu
            </option>
            <option value="Kıymetli Madenler / Altın Fonu">
              Kıymetli Madenler / Altın Fonu
            </option>
            <option value="Para Piyasası (TL) Fonu">
              Para Piyasası (TL) Fonu
            </option>
            <option value="Değişken / Çoklu Varlık Fonu">
              Değişken / Çoklu Varlık Fonu
            </option>
            <option value="Katılım Fonu">Katılım Fonu</option>
            <option value="Eurobond / Borçlanma Araçları Fonu">
              Eurobond / Borçlanma Araçları Fonu
            </option>
          </select>
          <button
            type="submit"
            disabled={addingFund}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            {addingFund ? "TEFAS'tan Çekiliyor..." : "+ TEFAS'tan Çek & Ekle"}
          </button>
        </div>
      </form>
      {addFundMsg && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 font-medium">
          {addFundMsg}
        </div>
      )}

      {/* Güncel TEFAS Fonları 2026 Performans ve Risk Özeti Tablosu */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">
                Takip Edilen {summaries.length} Gerçek TEFAS Yatırım Fonu (2026
                Yılı Performans & Risk Özeti)
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                GERÇEK PİYASA VERİSİ
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Referans İşlem Günü Aralığı: {compareData?.actual_start_date} &rarr;{" "}
              {compareData?.actual_end_date} (
              {compareData?.common_trading_days_count} ortak işlem günü)
            </p>
          </div>
          <Link
            href="/analytics"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Detaylı 100 Bazlı Grafik & Analiz{" "}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Kategori ve Arama Filtreleri */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "ALL", label: `Tümü (${summaries.length})` },
              { key: "HISSE", label: "Yerli Hisse Yoğun" },
              { key: "YABANCI", label: "Yabancı & Teknoloji" },
              { key: "ALTIN", label: "Altın & Gümüş" },
              { key: "PARA", label: "Para Piyasası" },
              { key: "DEGISKEN", label: "Değişken" },
              { key: "KATILIM", label: "Katılım" },
              { key: "BORCLANMA", label: "Eurobond / Borçlanma / Emtia" },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCat(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCat === cat.key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Fon kodu veya unvanı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-full md:w-56"
          />
        </div>

        {compareData?.date_warning && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
            <strong>Tatil Günü Çözümleme Bildirimi:</strong>{" "}
            {compareData.date_warning}
          </div>
        )}

        <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-semibold">Fon Kodu</th>
                <th className="py-2.5 px-4 font-semibold">Fon Ünvanı & Türü</th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  Başlangıç Fiyatı
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  Güncel Fiyat
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  Dönem Getirisi
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  100 TL&apos;nin Değeri
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  Max Drawdown
                </th>
                <th className="py-2.5 pl-4 font-semibold text-right">
                  Yıllık Volatilite
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSummaries.map((f: any) => {
                const pos = f.return_pct >= 0;
                return (
                  <tr
                    key={f.fund_code}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 pr-4 font-bold text-blue-600 dark:text-blue-400">
                      {f.fund_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {f.fund_title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Kategori: {f.fund_type}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatNumberTR(f.start_price, 6)} TL
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {formatNumberTR(f.end_price, 6)} TL
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        pos
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {pos ? "+" : ""}
                      {formatNumberTR(f.return_pct)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {formatNumberTR(f.normalized_base_100_end)} TL
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
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
      </div>
    </div>
  );
}
