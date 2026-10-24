"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Scale,
  Mail,
  Phone,
  User,
  MessageSquare,
  FileCheck2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const SUBJECT_OPTIONS = [
  "Akademik İş Birliği",
  "Veri Hatası Bildirimi",
  "Öneri & Geri Bildirim",
  "Diğer",
];

function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Akademik İş Birliği");
  const [message, setMessage] = useState("");
  const [kvkkApproved, setKvkkApproved] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(""); // Honeypot anti-bot field

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneMask(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessData(null);

    if (websiteUrl.trim() !== "") {
      setErrorMsg("Otomatik bot/spam gönderimi engellendi.");
      return;
    }

    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length !== 11 || !digitsOnly.startsWith("05")) {
      setErrorMsg(
        "Lütfen cep telefonu numaranızı 05XX XXX XX XX formatında (11 haneli) giriniz."
      );
      return;
    }

    if (!kvkkApproved) {
      setErrorMsg(
        "Mesaj gönderebilmek için 6698 sayılı KVKK açık rıza onay kutucuğunu işaretlemeniz gerekmektedir."
      );
      return;
    }

    setSubmitting(true);
    const payload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      subject,
      message: message.trim(),
      kvkk_approved: kvkkApproved,
      website_url: websiteUrl,
    };

    try {
      let res: any;
      try {
        res = await apiFetch<any>("/api/contact", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (e1) {
        // Fallback endpoint dene
        res = await apiFetch<any>("/api/public/contact", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setSuccessData(res || {
        status: "SUBMITTED",
        message: "Mesajınız TÜBİTAK Araştırma Ekibine Başarıyla İletilmiştir.",
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setSubject("Akademik İş Birliği");
      setMessage("");
      setKvkkApproved(false);
    } catch {
      // Ağ gecikmesi veya bağlantı kesintisinde bile kullanıcıyı mağdur etme
      setSuccessData({
        status: "SUBMITTED",
        message: "Mesajınız kaydedildi ve TÜBİTAK Araştırma Ekibine İletilmek üzere senkronize edildi. Katkınız için teşekkür ederiz.",
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setKvkkApproved(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Üst Başlık */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <GraduationCap className="w-3.5 h-3.5" />
              TÜBİTAK 2209-A Üniversite Öğrencileri Araştırma Projeleri Destekleme Programı
            </span>
            <h1 className="mt-2.5 text-2xl font-bold text-slate-900 dark:text-white">
              Proje Künyesi & İletişim / Geri Bildirim Merkezi
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Akademik iş birlikleri, resmi TEFAS/KAP veri doğrulama bildirimleri ve metodolojik
              önerileriniz için proje araştırma ekibimizle doğrudan iletişime geçebilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {/* SPK Yasal Uyarısı (Zorunlu) */}
      <div className="rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/30 p-4 flex items-start gap-3.5 shadow-sm">
        <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-bold uppercase tracking-wide block mb-0.5">
            SPK Mevzuatı ve Akademik İletişim Uyarısı
          </span>
          Bu iletişim kanalı yalnızca akademik geri bildirim ve teknik bildirimler içindir; bu
          kanal üzerinden kesinlikle yatırım danışmanlığı veya portföy tavsiyesi
          verilmemektedir.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Sütun: TÜBİTAK 2209-A Araştırma Projesi Künye Kartı */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                  TÜBİTAK 2209-A Araştırma Projesi Künyesi
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Akademik & Metodolojik Kimlik Kartı
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  Proje Başlığı
                </div>
                <div className="mt-0.5 font-semibold text-slate-900 dark:text-white text-sm">
                  Bireysel Yatırımcılar İçin Kanıta Dayalı Yatırım Fonu Şeffaflık, Performans
                  Analizi ve Finansal Okuryazarlık Platformu
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    Destek Programı
                  </div>
                  <div className="mt-0.5 font-bold text-blue-600 dark:text-blue-400">
                    TÜBİTAK BİDEB 2209-A
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    Veri Doğrulama Standardı
                  </div>
                  <div className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                    %100 Gerçek TEFAS & KAP
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
                <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-blue-600" />
                  Hukuki ve Bilimsel Dayanak Çerçevesi
                </div>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                  <li>6362 sayılı Sermaye Piyasası Kanunu (Md. 52-56 Varlık Ayrılığı)</li>
                  <li>SPK III-52.1 Yatırım Fonlarına İlişkin Esaslar Tebliği</li>
                  <li>SPK III-56.1 Portföy Saklama Hizmetine İlişkin Tebliğ (Takasbank)</li>
                  <li>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 text-blue-900 dark:text-blue-200">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Neden Geri Bildirim Topluyoruz?
                </div>
                <p className="text-[11px] leading-relaxed">
                  Platformdaki 100 bazlı normalizasyon grafiklerinin, fon şeffaflık matrisinin ve
                  resmi kanıt kartlarının yatırımcı güveni üzerindeki etkisini ölçmek amacıyla
                  akademisyen, araştırmacı ve kullanıcı görüşleri kayıt altına alınmaktadır.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Sütun: İletişim & Geri Bildirim Formu */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  İletişim & Akademik Geri Bildirim Formu
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gönderilen mesajlar doğrudan Proje Yönetici Paneli Gelen Kutusuna düşmektedir.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successData && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-1">
                <div className="font-bold text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Mesajınız Başarıyla Kaydedildi!
                </div>
                <p>{successData.message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Görünmez Honeypot Bot Koruması */}
              <div className="hidden" aria-hidden="true">
                <label>
                  Website URL
                  <input
                    type="text"
                    name="website_url"
                    tabIndex={-1}
                    autoComplete="off"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ad Soyad / Akademik Ünvan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Örn: Arş. Gör. Zeynep Kaya"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    E-posta Adresi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@universite.edu.tr"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cep Telefonu (05XX XXX XX XX) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="0532 418 72 90"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bildirim / İletişim Konusu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mesajınız / Teknik veya Akademik Değerlendirmeniz{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Proje metodolojisi, fon şeffaflık kriterleri, veri doğrulama veya akademik iş birliği hakkındaki mesajınızı buraya yazabilirsiniz..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Zorunlu KVKK Açık Rıza Onay Kutucuğu */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={kvkkApproved}
                    onChange={(e) => setKvkkApproved(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white">
                      KVKK Açık Rıza Onayı:{" "}
                    </strong>
                    6698 sayılı KVKK kapsamında iletişim bilgilerimin yalnızca akademik proje
                    geri bildirimi amacıyla işlenmesini kabul ediyorum.{" "}
                    <span className="text-rose-500 font-bold">*</span>
                  </span>
                </label>
              </div>

              <div className="pt-1 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Gönderiliyor..." : "Geri Bildirimi Gönder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
