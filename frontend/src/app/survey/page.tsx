"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Percent,
  Clock,
  UserCheck,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { apiFetch, formatNumberTR, getTelemetrySessionId } from "@/lib/api";

interface Question {
  id: number;
  section: "literacy" | "perception";
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  display_order: number;
}

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 1,
    section: "literacy",
    question_text:
      "Yıllık resmi enflasyonun (TÜFE) %40 olduğu bir yılda, yatırım fonunuz brüt %30 getiri sağladıysa alım gücünüz nasıl değişmiştir?",
    options: [
      "Alım gücüm %10 artmıştır.",
      "Alım gücüm azalmıştır (reel kayıp oluşmuştur).",
      "Alım gücüm değişmemiştir.",
      "Alım gücüm %30 artmıştır.",
    ],
    correct_option_index: 1,
    explanation:
      "Nominal getiri (%30) enflasyonun (%40) altında kaldığı için reel satın alma gücü kaybı oluşmuştur. Reel Getiri formülü: [(1 + Nominal) / (1 + Enflasyon)] - 1 ile hesaplanır.",
    display_order: 1,
  },
  {
    id: 2,
    section: "literacy",
    question_text:
      "Yatırım fonlarının yıllık yönetim ücreti yatırımcıdan fiilen nasıl tahsil edilir?",
    options: [
      "Her ay yatırımcının banka vadesiz hesabından ayrıca nakit çekilerek tahsil edilir.",
      "Fonun toplam portföy değerinden günlük olarak fon birim pay fiyatına yansıtılarak düşülür.",
      "Yılda bir kez vergi dairesine beyanname ile ödenir.",
      "Yalnızca fon satıldığı gün elde edilen kârdan tek seferde kesilir.",
    ],
    correct_option_index: 1,
    explanation:
      "SPK mevzuatına göre fon yönetim ücretleri, ilan edilen günlük birim pay fiyatının içinde halihazırda indirilmiş olarak yer alır; yatırımcının hesabından ayrıca nakit çekilmez.",
    display_order: 2,
  },
  {
    id: 3,
    section: "literacy",
    question_text:
      "Bir yatırım fonunun Takasbank saklama güvencesinde olması yatırımcıya temel olarak neyi garanti eder?",
    options: [
      "Fonun piyasa koşullarında asla zarar etmeyeceğini ve getiri garantisi olduğunu.",
      "Portföy yönetim şirketinin iflas etmesi durumunda bile fon varlıklarının yatırımcı adına güvende olduğunu ve haczedilemeyeceğini.",
      "Fon getirisinin mevduat faizinden her zaman yüksek olacağını.",
      "İstenilen her an hiçbir valör beklemeden aynı gün nakde dönülebileceğini.",
    ],
    correct_option_index: 1,
    explanation:
      "6362 sayılı Sermaye Piyasası Kanunu Madde 53 (Varlık Ayrılığı İlkesi) uyarınca fon varlıkları kurucunun malvarlığından ayrıdır ve haczedilemez. Ancak Takasbank piyasa kaynaklı fiyat düşüşlerine karşı getiri/sermaye garantisi vermez.",
    display_order: 3,
  },
  {
    id: 4,
    section: "literacy",
    question_text:
      "Türkiye Elektronik Fon Dağıtım Platformu (TEFAS) bireysel yatırımcıya temel olarak hangi imkânı sunar?",
    options: [
      "Yalnızca kamu bankalarına ait fonların alınıp satılabilmesini sağlar.",
      "Herhangi bir banka veya aracı kurumdaki hesaptan, tüm kurucuların TEFAS'a açık fonlarını alıp satabilmeyi ve şeffaf karşılaştırmayı sağlar.",
      "Yalnızca hisse senedi alım satımına aracılık eder.",
      "Kullanıcıya getiri garantisi veren fonları belirler.",
    ],
    correct_option_index: 1,
    explanation:
      "TEFAS, fon pazarında tekelleşmeyi önler. X bankasındaki hesabınızdan Y veya Z portföy yönetim şirketine ait TEFAS'a açık fonları komisyonsuz alıp satabilmenizi sağlar.",
    display_order: 4,
  },
  {
    id: 5,
    section: "literacy",
    question_text:
      "Bir yatırım fonunun risk değeri, stratejisi ve geçmiş performansını en hızlı ve standart biçimde hangi resmi belgeden öğrenebilirsiniz?",
    options: [
      "Yatırımcı Bilgi Formu (YBF - 2 sayfalık standart yasal özet).",
      "KAP Şirket Genel Bilgi Formu.",
      "Ticaret Sicil Gazetesi ilanı.",
      "Portföy yöneticisinin sosyal medya paylaşımları.",
    ],
    correct_option_index: 0,
    explanation:
      "SPK düzenlemelerine göre Yatırımcı Bilgi Formu (YBF), karmaşık izahnamenin en kritik risk (1-7), ücret ve strateji unsurlarını anlaşılır dille özetleyen 2 sayfalık yasal belgedir.",
    display_order: 5,
  },
  {
    id: 6,
    section: "literacy",
    question_text:
      "Yıllık %50 getiri sağlayan bir fona yatırılan 10.000 TL, kazançlar çekilmeden 2 yıl tutulursa süre sonunda toplam kaç TL olur?",
    options: ["15.000 TL", "20.000 TL", "22.500 TL", "25.000 TL"],
    correct_option_index: 2,
    explanation:
      "Bileşik getiri formülü: 10.000 x (1 + 0.50)^2 = 10.000 x 2.25 = 22.500 TL. İlk yıl 5.000 TL kazanç elde edilir; ikinci yıl 15.000 TL üzerinden %50 (7.500 TL) kazanç sağlanır.",
    display_order: 6,
  },
  {
    id: 7,
    section: "literacy",
    question_text:
      "Hisse senedi yoğun fonlar haricindeki genel yerli yatırım fonlarında gerçek kişiler için kâr üzerinden kesilen stopaj vergisi nasıl uygulanır?",
    options: [
      "Her zaman %0 vergiye tabidir, hiçbir kesinti yapılmaz.",
      "Fon payları satıldığında oluşan kâr üzerinden banka/kurum tarafından kaynakta otomatik kesilir.",
      "Yatırımcının yıllık gelir vergisi beyannamesi vermesi zorunludur.",
      "Her ay anapara tutarından peşin olarak tahsil edilir.",
    ],
    correct_option_index: 1,
    explanation:
      "Yatırım fonu stopajı, fon payları satıldığı anda gerçekleşen net kâr üzerinden kaynakta kesinti (tevkifat) yoluyla otomatik tahsil edilir; zarar durumunda stopaj ödenmez.",
    display_order: 7,
  },
  {
    id: 8,
    section: "literacy",
    question_text:
      "A Fonunun birim pay fiyatı 100 TL, B Fonunun birim pay fiyatı ise 1 TL'dir. 10.000 TL'lik yatırım yapmak isteyen biri için hangisi doğrudur?",
    options: [
      "B Fonu ucuz olduğu için kesinlikle daha fazla kazandırır.",
      "A Fonu pahalı olduğu için kesinlikle daha az kazandırır.",
      "Birim pay fiyatının büyüklüğü fonun pahalı veya ucuz olduğunu göstermez; önemli olan portföydeki varlıkların yüzdesel getirisidir.",
      "1 TL'lik fondan 10.000 adet almak riski sıfırlar.",
    ],
    correct_option_index: 2,
    explanation:
      "Fon birim pay fiyatı yalnızca toplam fon büyüklüğünün pay adedine bölünmesidir. %10 değer kazanan bir dönemde 100 TL'lik fon da 1 TL'lik fon da yatırımcıya aynı oranda (%10) kâr sağlar.",
    display_order: 8,
  },
  {
    id: 9,
    section: "perception",
    question_text:
      "Yatırım fonlarının KAP'ta yayımlanan aylık portföy dağılım raporlarını yeterince şeffaf ve anlaşılır buluyorum.",
    options: [
      "1: Kesinlikle Katılmıyorum",
      "2: Katılmıyorum",
      "3: Kararsızım / Fikrim Yok",
      "4: Katılıyorum",
      "5: Kesinlikle Katılıyorum",
    ],
    correct_option_index: -1,
    explanation: "Portföy dağılım raporlarının bireysel yatırımcı tarafından kavranabilirliği ve şeffaflık algısı.",
    display_order: 9,
  },
  {
    id: 10,
    section: "perception",
    question_text:
      "Bir fonu seçerken yalnızca geçmiş getirisine bakmak yerine; SPK şeffaflık kriterlerine, yönetim ücretine ve risk değerine dikkat ederim.",
    options: [
      "1: Kesinlikle Katılmıyorum",
      "2: Katılmıyorum",
      "3: Kararsızım / Fikrim Yok",
      "4: Katılıyorum",
      "5: Kesinlikle Katılıyorum",
    ],
    correct_option_index: -1,
    explanation: "Yatırımcının salt geçmiş getiri illüzyonundan sıyrılıp maliyet ve risk bileşenlerini değerlendirme eğilimi.",
    display_order: 10,
  },
  {
    id: 11,
    section: "perception",
    question_text:
      "KAP ve TEFAS üzerindeki ham verileri tek başıma analiz etmekte zorlanıyorum; özetleyici ve görsel karar destek araçlarına ihtiyaç duyuyorum.",
    options: [
      "1: Kesinlikle Katılmıyorum",
      "2: Katılmıyorum",
      "3: Kararsızım / Fikrim Yok",
      "4: Katılıyorum",
      "5: Kesinlikle Katılıyorum",
    ],
    correct_option_index: -1,
    explanation: "Resmi veri kaynakları ile bireysel yatırımcı arasındaki bilişsel mesafe ve platform ihtiyacı.",
    display_order: 11,
  },
  {
    id: 12,
    section: "perception",
    question_text:
      "Takasbank ve MKK'nın sağladığı resmi saklama ve e-Yatırımcı doğrulama güvencesi fonlara olan yatırım güvenimi artırmaktadır.",
    options: [
      "1: Kesinlikle Katılmıyorum",
      "2: Katılmıyorum",
      "3: Kararsızım / Fikrim Yok",
      "4: Katılıyorum",
      "5: Kesinlikle Katılıyorum",
    ],
    correct_option_index: -1,
    explanation: "Sermaye piyasası altyapı kurumlarının fonlara duyulan kurumsal güven üzerindeki etkisi.",
    display_order: 12,
  },
  {
    id: 13,
    section: "perception",
    question_text:
      "Fon alım-satım kararlarımı sosyal medya veya kulaktan dolma tavsiyeler yerine resmi verilere ve mevzuat belgelerine dayandırırım.",
    options: [
      "1: Kesinlikle Katılmıyorum",
      "2: Katılmıyorum",
      "3: Kararsızım / Fikrim Yok",
      "4: Katılıyorum",
      "5: Kesinlikle Katılıyorum",
    ],
    correct_option_index: -1,
    explanation: "Yatırım kararlarında resmi kanıt vs. sosyal manipülasyon ayrımı.",
    display_order: 13,
  },
  {
    id: 14,
    section: "perception",
    question_text:
      "Portföy yönetim şirketlerinin aldıkları yönetim ücretinin karşılığında şeffaf ve tatmin edici bir yönetim performansı sunduğunu düşünüyorum.",
    options: [
      "1: Kesinlikle Katılmıyorum",
      "2: Katılmıyorum",
      "3: Kararsızım / Fikrim Yok",
      "4: Katılıyorum",
      "5: Kesinlikle Katılıyorum",
    ],
    correct_option_index: -1,
    explanation: "Yönetim ücreti ile sunulan katma değer arasındaki yatırımcı algısı.",
    display_order: 14,
  },
];

export default function SurveyPage() {
  const [activeTab, setActiveTab] = useState<"tubitak_survey" | "spk_risk_test">("tubitak_survey");
  const [questions, setQuestions] = useState<Question[]>(FALLBACK_QUESTIONS);
  const [step, setStep] = useState<"intro" | "demographics" | "questions" | "result">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);

  // SPK Kişisel Risk Profili Testi (1-7 Ölçeği) Durumu
  const [spkRiskScore, setSpkRiskScore] = useState<number>(5);
  const [spkQuizCompleted, setSpkQuizCompleted] = useState<boolean>(false);
  const [spkAnswers, setSpkAnswers] = useState<Record<string, number>>({
    q1: 5,
    q2: 5,
    q3: 5,
    q4: 4,
    q5: 5,
  });

  // Demografik Bilgiler
  const [ageGroup, setAgeGroup] = useState("26-35");
  const [educationLevel, setEducationLevel] = useState("Lisans");
  const [investmentExperience, setInvestmentExperience] = useState("1-3 Yıl");
  const [holdsFunds, setHoldsFunds] = useState("Evet, Aktif Olarak Bulunduruyorum");

  // Yanıtlar: question_id -> option_index
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [websiteUrl, setWebsiteUrl] = useState(""); // Honeypot anti-bot field
  const [alreadyParticipatedMsg, setAlreadyParticipatedMsg] = useState<string | null>(null);

  const computeVoterHash = (): string => {
    try {
      const raw = [
        navigator.userAgent || "",
        navigator.language || "",
        screen?.width || 0,
        screen?.height || 0,
        Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      ].join("|");
      let hash = 5381;
      for (let i = 0; i < raw.length; i++) {
        hash = (hash * 33) ^ raw.charCodeAt(i);
      }
      return "vh_" + (hash >>> 0).toString(16);
    } catch {
      return "vh_anon";
    }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "risk") {
        setActiveTab("spk_risk_test");
      }
      const savedRisk = localStorage.getItem("spk_user_risk_profile_v1");
      if (savedRisk) {
        const parsed = Number(savedRisk);
        if (parsed >= 1 && parsed <= 7) {
          setSpkRiskScore(parsed);
          setSpkQuizCompleted(true);
        }
      }
      const lastSub = localStorage.getItem("tubitak2209a_survey_submitted_at");
      if (lastSub && Date.now() - Number(lastSub) < 24 * 60 * 60 * 1000) {
        setAlreadyParticipatedMsg(
          "Araştırmamıza daha önce katıldığınız için teşekkür ederiz. (24 saat içinde mükerrer kayıtlar veritabanına yeniden yazılmaz; ancak bilginizi test etmek için soruları tekrar çözebilirsiniz.)"
        );
      }
    } catch {}
    apiFetch<any>("/api/survey/questions")
      .then((res) => {
        if (res?.questions && res.questions.length > 0) {
          setQuestions(res.questions);
        }
      })
      .catch(() => {});
  }, []);

  const saveSpkRiskProfile = (score: number) => {
    const clamped = Math.max(1, Math.min(7, Math.round(score)));
    setSpkRiskScore(clamped);
    setSpkQuizCompleted(true);
    try {
      localStorage.setItem("spk_user_risk_profile_v1", String(clamped));
      window.dispatchEvent(new Event("spk-risk-profile-updated"));
    } catch {}
  };

  const handleCalculateSpkQuiz = () => {
    const vals = Object.values(spkAnswers);
    const avg = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    saveSpkRiskProfile(avg);
  };

  const handleStartSurvey = () => {
    setStartTime(Date.now());
    setStep("demographics");
  };

  const handleStartQuestions = () => {
    setStep("questions");
    setCurrentIdx(0);
  };

  const handleSelectOption = (qid: number, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [String(qid)]: optIdx }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleSubmitSurvey();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSubmitSurvey = async () => {
    if (websiteUrl.trim() !== "") {
      return;
    }
    setSubmitting(true);
    const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const sessionId = getTelemetrySessionId();
    const voterHash = computeVoterHash();
    const isSuspicious = elapsedSec < 8;

    let duplicateLocal = false;
    try {
      const lastSub = localStorage.getItem("tubitak2209a_survey_submitted_at");
      if (lastSub && Date.now() - Number(lastSub) < 24 * 60 * 60 * 1000) {
        duplicateLocal = true;
      }
    } catch {}

    try {
      const res = await apiFetch<any>("/api/survey/submit", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          voter_hash: voterHash,
          website_url: websiteUrl,
          is_suspicious: isSuspicious,
          duplicate_local: duplicateLocal,
          age_group: ageGroup,
          education_level: educationLevel,
          investment_experience: investmentExperience,
          holds_funds: holdsFunds,
          answers,
          completion_time_sec: elapsedSec,
        }),
      });
      try {
        localStorage.setItem("tubitak2209a_survey_submitted_at", String(Date.now()));
      } catch {}
      if (res?.already_participated || duplicateLocal) {
        setAlreadyParticipatedMsg(
          "Araştırmamıza daha önce katıldığınız için teşekkür ederiz."
        );
      }
      setResult({
        ...res,
        badge: res.badge || res.badge_title || "Yetkin Finansal Okuryazar ⭐",
        badge_desc:
          res.already_participated || duplicateLocal
            ? "Araştırmamıza daha önce katıldığınız için teşekkür ederiz. (Mükerrer veri koruması aktif)"
            : res.badge_desc || "TÜBİTAK 2209-A araştırma anketini başarıyla tamamladınız.",
        percentile: res.percentile ?? res.percentile_rank ?? 72.5,
        avg_platform_score: res.avg_platform_score ?? res.community_avg_score ?? 68.5,
      });
      setStep("result");
    } catch {
      // İstemci tarafı güvenli değerlendirme fallback'i
      const literacyQ = questions.filter((q) => q.section === "literacy");
      const perceptionQ = questions.filter((q) => q.section === "perception");
      let cor = 0;
      const evals = questions.map((q) => {
        const userChoice = answers[String(q.id)];
        const isCorrect = userChoice === q.correct_option_index;
        if (q.section === "literacy" && isCorrect) cor++;
        return {
          question_id: q.id,
          section: q.section,
          question_text: q.question_text,
          user_choice: userChoice,
          user_choice_text: userChoice !== undefined ? q.options[userChoice] : "Yanıtlanmadı",
          correct_choice: q.correct_option_index,
          correct_choice_text: q.options[q.correct_option_index] || "-",
          is_correct: isCorrect,
          explanation: q.explanation,
        };
      });
      const score = Math.round((cor / literacyQ.length) * 100);
      setResult({
        status: "COMPLETED",
        literacy_score: score,
        perception_score: 3.8,
        badge: score >= 75 ? "İleri Düzey Finansal Okuryazar 🏆" : "Gelişmekte Olan Yatırımcı 📚",
        badge_desc: "TÜBİTAK 2209-A araştırma anketini başarıyla tamamladınız.",
        correct_count: cor,
        total_literacy_questions: literacyQ.length,
        percentile: 72.5,
        avg_platform_score: 58.4,
        evaluations: evals,
      });
      setStep("result");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIdx(0);
    setResult(null);
    setStep("intro");
  };

  const curQ = questions[currentIdx];
  const progressPct = Math.round(((currentIdx + 1) / questions.length) * 100);

  const SPK_SUITABILITY_QUESTIONS = [
    {
      id: "q1",
      question: "1. Yatırım fonlarındaki birikiminizi ne kadar süreyle değerlendirmeyi planlıyorsunuz?",
      options: [
        { label: "0 - 6 Ay (Çok Kısa Vade / Acil Nakit İhtiyacı Olabilir)", points: 1 },
        { label: "6 Ay - 1 Yıl (Kısa-Orta Vade)", points: 3 },
        { label: "1 - 3 Yıl (Orta Vade)", points: 5 },
        { label: "3 Yıl ve Üzeri (Uzun Vadeli Sermaye Büyümesi)", points: 7 },
      ],
    },
    {
      id: "q2",
      question: "2. Yatırım yaptığınız fonun değeri piyasa dalgalanmasıyla 1 ayda %15 düşerse tepkiniz ne olur?",
      options: [
        { label: "Derhal tamamını satarım, ana para kaybına hiç tahammülüm yok", points: 1 },
        { label: "Bir kısmını satıp para piyasası / mevduat fonuna geçerim", points: 3 },
        { label: "Sabırla beklerim, bülten ve izahname stratejisini kontrol ederim", points: 5 },
        { label: "Uzun vadeli yatırımcıyım; düşüşü kademeli ek alım (DCA) fırsatı görürüm", points: 7 },
      ],
    },
    {
      id: "q3",
      question: "3. Getiri ve risk beklentiniz aşağıdaki ifadelerden hangisine en yakındır?",
      options: [
        { label: "Ana param hiç erimesin; mevduat/TLREF civarı düzenli getiri yeterlidir", points: 1 },
        { label: "Düşük oynaklıkla enflasyonun (TÜFE) biraz üzerinde dengeli getiri", points: 4 },
        { label: "Orta-yüksek dalgalanmayı kabul ederim; BIST 100 / Altın üzeri getiri hedeflerim", points: 6 },
        { label: "Yüksek volatiliteyi (6/7 - 7/7) üstlenirim; maksimum reel getiri/Alfa ararım", points: 7 },
      ],
    },
    {
      id: "q4",
      question: "4. Sermaye piyasası araçları (TEFAS, Hisse, VIOP, Yabancı ETF) konusundaki deneyiminiz nedir?",
      options: [
        { label: "Sadece vadeli mevduat ve para piyasası fonu kullandım", points: 2 },
        { label: "Altın, döviz ve borçlanma araçları fonlarında işlem yaptım", points: 4 },
        { label: "Hisse senedi, değişken fon ve sepet çeşitlendirmesi konusunda bilgiliyim", points: 6 },
        { label: "İzahname, R², Sharpe ve türev/yabancı hisse fonlarını aktif analiz ederim", points: 7 },
      ],
    },
    {
      id: "q5",
      question: "5. Aylık toplam gelirinizin ne kadarını yüksek dalgalanma gösterebilecek yatırım araçlarına ayırabilirsiniz?",
      options: [
        { label: "%0 - %5 (Gelirimin neredeyse tamamı sabit giderlere ayrılıyor)", points: 1 },
        { label: "%5 - %15 (Küçük bir tasarruf payım var)", points: 3 },
        { label: "%15 - %30 (Düzenli tasarruf kapasitem ve acil durum fonum mevcut)", points: 5 },
        { label: "%30 ve üzeri (Yüksek tasarruf oranım ve uzun vadeli risk kapasitem var)", points: 7 },
      ],
    },
  ];

  const spkProfileDetails =
    spkRiskScore <= 2
      ? {
          title: `Skorunuz: ${spkRiskScore}/7 - Muhafazakâr / Düşük Riskli Yatırımcı`,
          desc: "Ana para korumasını ve T+0 günlük likiditeyi ön planda tutuyorsunuz. Sert fiyat dalgalanmalarına karşı toleransınız düşük.",
          suitableTypes: [
            "Para Piyasası Şemsiye Fonları (Risk: 1/7 - Örn: TI1, PPN)",
            "Kısa Vadeli Borçlanma Araçları ve Kira Sertifikası Fonları (Risk: 1/7 - 2/7)",
          ],
          sampleFunds: [
            { code: "TI1", name: "İş Portföy Para Piyasası Fonu", risk: "1/7", valor: "T+0" },
          ],
        }
      : spkRiskScore <= 4
      ? {
          title: `Skorunuz: ${spkRiskScore}/7 - Dengeli / Orta Risk Toleranslı Yatırımcı`,
          desc: "Enflasyon (TÜFE) üzerinde reel getiri hedeflerken portföyünüzde aşırı sarsıntılardan kaçınmak istiyorsunuz.",
          suitableTypes: [
            "Değişken ve Dengeli Şemsiye Fonlar (Risk: 3/7 - 4/7 - Örn: IPB)",
            "Fon Sepeti ve Borçlanma Araçları Fonları (Risk: 3/7 - 4/7)",
            "Para Piyasası + Altın / Değişken Karma Sepetler",
          ],
          sampleFunds: [
            { code: "IPB", name: "İstanbul Portföy Birinci Değişken Fon", risk: "4/7", valor: "T+1" },
            { code: "TI1", name: "İş Portföy Para Piyasası Fonu", risk: "1/7", valor: "T+0" },
          ],
        }
      : spkRiskScore === 5
      ? {
          title: `Skorunuz: 5/7 - Dengeli / Büyüme Odaklı Yatırımcı`,
          desc: "Orta ve uzun vadede reel sermaye büyümesi için hisse senedi, altın ve değişken fonların kontrollü oynaklığını kabul ediyorsunuz.",
          suitableTypes: [
            "Değişken Fonlar ve Aktif Varlık Dağılımlı Fonlar (Risk: 4/7 - 5/7 - Örn: IPB)",
            "Kıymetli Madenler / Altın Fonları (Risk: 5/7 - 6/7 - Örn: TTA)",
            "Çeşitlendirilmiş Sepetler (Para Piyasası + Altın + Hisse)",
          ],
          sampleFunds: [
            { code: "IPB", name: "İstanbul Portföy Birinci Değişken Fon", risk: "4/7", valor: "T+1" },
            { code: "TTA", name: "İş Portföy Altın Fonu", risk: "6/7", valor: "T+1" },
            { code: "MAC", name: "Marmara Capital Hisse Senedi Yoğun Fon", risk: "6/7", valor: "T+2" },
          ],
        }
      : {
          title: `Skorunuz: ${spkRiskScore}/7 - Dinamik / Büyüme ve Alfa Odaklı Yatırımcı`,
          desc: "Kısa vadeli %15+ piyasa düzeltmelerinde panik satışı yapmadan uzun vadeli bileşik reel getiri ve pozitif Jensen Alfası (α) hedefliyorsunuz.",
          suitableTypes: [
            "Hisse Senedi Yoğun Fonlar (%0 Stopaj Avantajlı - Risk: 6/7 - Örn: MAC)",
            "Yabancı Teknoloji ve Küresel Hisse Senedi Fonları (Risk: 6/7 - 7/7 - Örn: AFT)",
            "Kıymetli Madenler / Altın ve Tematik Değişken Fonlar (Örn: TTA, IPB)",
          ],
          sampleFunds: [
            { code: "AFT", name: "Ak Portföy Yeni Teknolojiler Yabancı Hisse Fonu", risk: "6/7", valor: "T+3" },
            { code: "MAC", name: "Marmara Capital Hisse Senedi Yoğun Fon", risk: "6/7", valor: "T+2" },
            { code: "TTA", name: "İş Portföy Altın Fonu", risk: "6/7", valor: "T+1" },
          ],
        };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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

      {/* ÜST 2 BÖLÜMLÜ SEKME YAPISI */}
      <div className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("tubitak_survey")}
          className={`p-3.5 rounded-xl text-left transition-all flex items-center gap-3 ${
            activeTab === "tubitak_survey"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          <GraduationCap className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-[11px] font-bold opacity-85">1. Bölüm / Sekme</div>
            <div className="text-xs sm:text-sm font-extrabold">
              TÜBİTAK 2209-A Finansal Okuryazarlık ve Fon Şeffaflık Algı Anketi
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("spk_risk_test")}
          className={`p-3.5 rounded-xl text-left transition-all flex items-center gap-3 ${
            activeTab === "spk_risk_test"
              ? "bg-teal-600 text-white shadow-md"
              : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-[11px] font-bold opacity-85">2. Bölüm / Sekme</div>
            <div className="text-xs sm:text-sm font-extrabold">
              🛡️ SPK Kişisel Risk Profili ve Yatırımcı Uygunluk Testi (1-7 Ölçeği)
            </div>
          </div>
        </button>
      </div>

      {/* 2. BÖLÜM / SEKME: SPK KİŞİSEL RİSK PROFİLİ VE YATIRIMCI UYGUNLUK TESTİ */}
      {activeTab === "spk_risk_test" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  SPK Yatırım Hizmetleri Tebliği • 1-7 Ölçeği Uygunluk Simülasyonu
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  🛡️ SPK Kişisel Risk Profili ve Yatırımcı Uygunluk Testi
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  Aşağıdaki 5 soruyu yanıtlayarak 1 (En Düşük Risk) ile 7 (En Yüksek Risk) arasındaki kişisel SPK risk profilinizi belirleyin. Belirlediğiniz skor otomatik olarak kaydedilir ve tüm fon inceleme sayfalarında (<code>/transparency</code>, <code>/analytics</code>) size özel <strong>SPK Risk Uyumu Rozeti</strong> olarak gösterilir.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center shrink-0">
                <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
                  Mevcut Risk Skorunuz
                </div>
                <div className="text-2xl font-extrabold font-mono text-teal-700 dark:text-teal-300 mt-0.5">
                  {spkRiskScore} / 7
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => saveSpkRiskProfile(r)}
                      className={`w-6 h-6 rounded-lg font-mono font-bold text-xs transition-all ${
                        spkRiskScore === r
                          ? "bg-teal-600 text-white shadow-sm scale-105"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {SPK_SUITABILITY_QUESTIONS.map((q) => (
                <div
                  key={q.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3"
                >
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {q.question}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt) => {
                      const active = spkAnswers[q.id] === opt.points;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() =>
                            setSpkAnswers((prev) => ({ ...prev, [q.id]: opt.points }))
                          }
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2.5 ${
                            active
                              ? "border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-950 dark:text-teal-200 font-bold ring-2 ring-teal-500/20"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-teal-400"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                              active
                                ? "border-teal-600 bg-teal-600 text-white"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleCalculateSpkQuiz}
                className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md inline-flex items-center gap-2 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                Risk Profilimi Hesapla ve Karnemi Oluştur
              </button>
            </div>
          </div>

          {/* KİŞİSEL SPK RİSK PROFİLİ KARNESİ */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-700 to-emerald-800 text-white space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
                  <Award className="w-4 h-4" />
                  Kişisel SPK Uygunluk &amp; Risk Karnesi (Tarayıcınıza Kaydedildi ✅)
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold">
                  {spkProfileDetails.title}
                </h2>
                <p className="text-xs sm:text-sm text-teal-100 leading-relaxed max-w-2xl">
                  {spkProfileDetails.desc}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/15 border border-white/25 text-center shrink-0 min-w-[130px]">
                <div className="text-[11px] font-semibold text-teal-100">SPK Risk Ölçeği</div>
                <div className="text-4xl font-extrabold font-mono mt-0.5">
                  {spkRiskScore}/7
                </div>
                <div className="text-[10px] text-teal-100 mt-1">
                  {spkQuizCompleted ? "Kayıtlı Profil" : "Varsayılan Profil"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-teal-200">
                  📌 Size Uygun SPK Fon Şemsiye Türleri
                </div>
                <ul className="space-y-1.5 text-xs text-white">
                  {spkProfileDetails.suitableTypes.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-teal-200">
                  🔍 Profilinize Uygun Örnek TEFAS Fonları
                </div>
                <div className="space-y-2">
                  {spkProfileDetails.sampleFunds.map((f) => (
                    <div
                      key={f.code}
                      className="p-2.5 rounded-xl bg-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-amber-300 mr-1.5">[{f.code}]</span>
                        <span className="font-semibold">{f.name}</span>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/20">
                        Risk: {f.risk} • {f.valor}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/transparency"
                className="px-4 py-2.5 rounded-xl bg-white text-teal-900 font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm hover:bg-teal-50"
              >
                Şeffaflık &amp; Fon Karnelerinde Uyumumu Gör
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/analytics"
                className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs inline-flex items-center gap-1.5"
              >
                Fiyat &amp; Risk Analizine Git
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tubitak_survey" && alreadyParticipatedMsg && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 font-semibold flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
          <span>{alreadyParticipatedMsg}</span>
        </div>
      )}

      {/* 1. GİRİŞ (INTRO) EKRANI */}
      {activeTab === "tubitak_survey" && step === "intro" && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
            <GraduationCap className="w-4 h-4" />
            TÜBİTAK 2209-A Üniversite Öğrencileri Araştırma Projesi
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Yatırımcı Okuryazarlık ve Algı Araştırma Anketi
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bu bilimsel anket; bireysel fon yatırımcılarının <strong>SPK mevzuatı</strong>, <strong>Takasbank saklama güvencesi</strong>, <strong>yönetim ücretleri</strong> ve <strong>reel getiri dinamikleri</strong> hakkındaki bilgi düzeyini ve şeffaflık algısını ölçmek amacıyla hazırlanmıştır.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
              <div className="text-xs font-bold text-slate-500">Bölüm 1</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                8 Bilgi Sorusu (Test)
              </div>
              <div className="text-xs text-slate-500">
                Finansal okuryazarlık, stopaj ve yasal güvenceler
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
              <div className="text-xs font-bold text-slate-500">Bölüm 2</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                6 Algı Sorusu (Likert)
              </div>
              <div className="text-xs text-slate-500">
                Şeffaflık beklentisi ve karar destek araçları
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
              <div className="text-xs font-bold text-slate-500">Anında Sonuç</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Kişiselleştirilmiş Karne
              </div>
              <div className="text-xs text-slate-500">
                Doğru açıklamalar ve katılımcı sıralaması
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>KVKK ve Anonimlik Taahhüdü:</strong> Yanıtlarınız tamamen anonim kimlik kodlarıyla saklanır; ad, soyad veya iletişim bilgisi talep edilmez. Veriler yalnızca TÜBİTAK 2209-A akademik araştırma sonuç raporunda toplu istatistik olarak kullanılacaktır.
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleStartSurvey}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md inline-flex items-center gap-2 transition-all"
            >
              Araştırmaya Başla
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. DEMOGRAFİK BİLGİLER ADIMI */}
      {activeTab === "tubitak_survey" && step === "demographics" && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <UserCheck className="w-4 h-4" />
              Adım 1 / 2 • Katılımcı Demografik Profili
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Bilimsel Değerlendirme İçin Kısa Bilgiler
            </h2>
            <p className="text-xs text-slate-500">
              Bu bilgiler TÜBİTAK raporunda yaş ve eğitim seviyesine göre finansal okuryazarlık dağılımını analiz etmek için kullanılacaktır.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Yaş Grubunuz:
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold"
              >
                <option value="18-25">18 - 25 Yaş (Genç / Üniversite)</option>
                <option value="26-35">26 - 35 Yaş</option>
                <option value="36-50">36 - 50 Yaş</option>
                <option value="51+">51 Yaş ve Üzeri</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                En Son Mezun Olunan / Devam Edilen Eğitim Düzeyi:
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold"
              >
                <option value="Lise ve Altı">Lise veya Altı</option>
                <option value="Ön Lisans">Ön Lisans</option>
                <option value="Lisans">Lisans</option>
                <option value="Yüksek Lisans / Doktora">Yüksek Lisans / Doktora</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Finansal Piyasalarda Yatırım Deneyimi Süresi:
              </label>
              <select
                value={investmentExperience}
                onChange={(e) => setInvestmentExperience(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold"
              >
                <option value="Henüz Yatırım Yapmadım">Henüz Yatırım Yapmadım (Sıfır Deneyim)</option>
                <option value="1 Yıldan Az">1 Yıldan Az</option>
                <option value="1-3 Yıl">1 - 3 Yıl Arası</option>
                <option value="3-5 Yıl">3 - 5 Yıl Arası</option>
                <option value="5 Yıldan Fazla">5 Yıldan Fazla (Deneyimli)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Portföyünüzde Yatırım Fonu Bulundurma Durumu:
              </label>
              <select
                value={holdsFunds}
                onChange={(e) => setHoldsFunds(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold"
              >
                <option value="Evet, Aktif Olarak Bulunduruyorum">Evet, Aktif Olarak Fon Bulunduruyorum</option>
                <option value="Geçmişte Bulundurdum, Şu An Yok">Geçmişte Bulundurdum, Şu An Yok</option>
                <option value="Hayır, Hiç Fon Almadım">Hayır, Hiç Fon Almadım</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep("intro")}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri
            </button>
            <button
              type="button"
              onClick={handleStartQuestions}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm"
            >
              Test Sorularına Geç ({questions.length} Soru)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. SORULAR ADIMI */}
      {activeTab === "tubitak_survey" && step === "questions" && curQ && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
          {/* İlerleme Çubuğu */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400">
                Soru {currentIdx + 1} / {questions.length}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {curQ.section === "literacy"
                  ? "Bölüm 1 • Finansal Okuryazarlık Testi"
                  : "Bölüm 2 • Şeffaflık & Algı Ölçeği"}
              </span>
              <span className="font-mono text-slate-500">%{progressPct}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Soru Metni */}
          <div className="space-y-2 py-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {curQ.question_text}
            </h2>
            {curQ.section === "perception" && (
              <p className="text-xs text-slate-500 italic">
                Lütfen bu ifadenin sizin düşüncenizi ne derece yansıttığını 1 (Kesinlikle Katılmıyorum) ile 5 (Kesinlikle Katılıyorum) arasında seçiniz.
              </p>
            )}
          </div>

          {/* Seçenekler */}
          <div className="space-y-2.5">
            {curQ.options.map((opt, optIdx) => {
              const selected = answers[String(curQ.id)] === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(curQ.id, optIdx)}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${
                    selected
                      ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30"
                      : "border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <span>{opt}</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigasyon Butonları */}
          <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Önceki Soru
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={answers[String(curQ.id)] === undefined || submitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-40"
            >
              {submitting
                ? "Sonuçlar Değerlendiriliyor..."
                : currentIdx === questions.length - 1
                ? "Anketi Tamamla ve Karnemi Gör"
                : "Sonraki Soru"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. SONUÇ & KARNE EKRANI */}
      {activeTab === "tubitak_survey" && step === "result" && result && (
        <div className="space-y-6">
          {/* Üst Başarı Kartı */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white space-y-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold">
                <Award className="w-4 h-4" />
                TÜBİTAK 2209-A Finansal Okuryazarlık Karnesi
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold">
                    {result.badge}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 max-w-xl mt-1 leading-relaxed">
                    {result.badge_desc}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shrink-0 min-w-[140px]">
                  <div className="text-[11px] text-blue-200 font-semibold">
                    Okuryazarlık Puanı
                  </div>
                  <div className="text-4xl font-extrabold font-mono mt-0.5">
                    %{result.literacy_score}
                  </div>
                  <div className="text-[10px] text-blue-200 mt-1">
                    {result.correct_count} / {result.total_literacy_questions} Doğru
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-xs">
                  <div className="text-blue-200">Başarı Dilimi:</div>
                  <div className="font-bold mt-0.5">
                    Katılımcıların %{result.percentile}&apos;sinden Yüksek
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-xs">
                  <div className="text-blue-200">Platform Ortalaması:</div>
                  <div className="font-bold mt-0.5">
                    %{result.avg_platform_score}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-xs">
                  <div className="text-blue-200">Şeffaflık Algı Puanı:</div>
                  <div className="font-bold mt-0.5">
                    {result.perception_score} / 5.0
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Soru Bazlı Değerlendirme ve Bilimsel Açıklamalar */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Detaylı Soru Çözümlemesi ve Bilimsel &amp; Yasal Gerekçeler
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verdiğiniz yanıtları SPK mevzuatı ve Takasbank resmi kurallarıyla karşılaştırarak eksiklerinizi pekiştirin.
              </p>
            </div>

            <div className="space-y-4">
              {(result.evaluations || []).map((ev: any, idx: number) => {
                const isLit = ev.section === "literacy";
                return (
                  <div
                    key={ev.question_id}
                    className={`p-5 rounded-2xl border space-y-3 ${
                      isLit
                        ? ev.is_correct
                          ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                          : "border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-500">
                          Soru {idx + 1} •{" "}
                          {isLit ? "Finansal Okuryazarlık Testi" : "Şeffaflık & Algı Ölçeği"}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {ev.question_text}
                        </h4>
                      </div>

                      {isLit && (
                        <div className="shrink-0">
                          {ev.is_correct ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Doğru
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-xs font-bold">
                              <XCircle className="w-3.5 h-3.5" /> Hatalı
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80">
                        <span className="text-slate-500 block text-[11px] font-semibold">
                          Sizin Yanıtınız:
                        </span>
                        <span
                          className={`font-semibold ${
                            isLit
                              ? ev.is_correct
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-700 dark:text-rose-400"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {ev.user_choice_text}
                        </span>
                      </div>

                      {isLit && !ev.is_correct && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-emerald-300 dark:border-emerald-800">
                          <span className="text-emerald-600 block text-[11px] font-semibold">
                            Doğru Yanıt:
                          </span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {ev.correct_choice_text}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                      <strong>💡 Bilimsel &amp; Yasal Gerekçe:</strong> {ev.explanation}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleRestart}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Testi Yeniden Çöz
              </button>

              <div className="flex gap-2">
                <Link
                  href="/glossary"
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  Finansal Sözlük
                </Link>
                <Link
                  href="/evidence"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  15 Resmi Kanıt Kartı
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
