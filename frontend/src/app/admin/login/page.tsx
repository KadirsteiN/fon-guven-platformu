"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { apiFetch, setAdminToken } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ status: string; token: string }>(
        "/api/admin/login",
        {
          method: "POST",
          body: JSON.stringify({ password }),
        }
      );
      if (res.token) {
        setAdminToken(res.token);
        router.push("/admin");
      }
    } catch (err: any) {
      setError(
        err.message?.replace("API Hatası (/api/admin/login): ", "") ||
          "Giriş başarısız oldu."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            TÜBİTAK 2209-A • Yönetici Merkezi (Admin Hub)
          </span>
          <h2 className="text-xl font-bold">Yönetici Girişi</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            TEFAS günlük senkronizasyon, site kimliği/logo, kaynak atıflı bülten
            yayını ve araştırma verisi dışa aktarma paneline erişmek için
            yönetici şifrenizi girin.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Yönetici Şifresi:
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>{loading ? "Doğrulanıyor..." : "Panele Giriş Yap"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
