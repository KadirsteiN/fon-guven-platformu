export type GlossaryCategory =
  | "Temel Kavramlar"
  | "Hukuk & Güvenlik"
  | "Risk & Performans"
  | "Vergi & Kesintiler";

export interface GlossaryTerm {
  term: string;
  category: GlossaryCategory;
  tip: string; // 💡 Akıllı İpucu (halk diliyle)
  spk: string; // ⚖️ SPK Mevzuatı & Resmi Karşılığı
  importance: string; // 🔍 Yatırımcı İçin Önemi
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  "Temel Kavramlar",
  "Hukuk & Güvenlik",
  "Risk & Performans",
  "Vergi & Kesintiler",
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ───────────── TEMEL KAVRAMLAR ─────────────
  {
    term: "Yatırım Fonu",
    category: "Temel Kavramlar",
    tip: "Birçok kişinin parasını havuzda toplayıp uzman bir şirketin kurallara uygun şekilde hisse, tahvil, altın gibi varlıklara yatırdığı ortak kumbaradır.",
    spk: "6362 sayılı SPKn md. 52: Yatırım fonu, katılma payı karşılığında toplanan paralarla, portföy işletmeciliği ilkeleri çerçevesinde portföy oluşturmak amacıyla kurulan ve tüzel kişiliği bulunmayan malvarlığıdır. Kuruluş ve işleyişi SPK III-52.1 Yatırım Fonlarına İlişkin Esaslar Tebliği ile düzenlenir.",
    importance: "Fon bir 'banka mevduatı' değildir; değeri yatırım yapılan varlıkların fiyatına göre günlük değişir. Hangi varlıklara yatırım yaptığını (fon türü) öğrenmeden alım yapılmamalıdır.",
  },
  {
    term: "Birim Pay (Katılma Payı)",
    category: "Temel Kavramlar",
    tip: "Fon havuzundaki payınızın en küçük parçasıdır. Fonun değeri bölünerek 'pay' fiyatı çıkar; kaç pay aldıysanız o kadar sahipsiniz.",
    spk: "Fon toplam değerinin dolaşımdaki pay sayısına bölünmesiyle bulunan birim pay değeri (fiyat) her iş günü hesaplanır ve TEFAS/KAP üzerinden kamuya açıklanır (SPK III-52.1).",
    importance: "Fiyatın düşük ya da yüksek olması fonun ucuz/pahalı olduğunu göstermez; fonları kıyaslarken fiyat değil getiri yüzdesi kullanılmalıdır (bu yüzden platformda 100 bazlı normalizasyon uygulanır).",
  },
  {
    term: "Portföy",
    category: "Temel Kavramlar",
    tip: "Bir fonun veya yatırımcının sahip olduğu tüm yatırım araçlarının toplamıdır; 'sepetin içindekiler' gibi düşünün.",
    spk: "SPKn md. 3 ve III-52.1 uyarınca fon portföyü, izahnamede belirlenen yatırım stratejisi ve portföy sınırlamalarına uygun biçimde oluşturulur.",
    importance: "Portföy dağılımı (ör. %80 hisse, %20 tahvil) fonun risk seviyesini belirler. Aylık portföy dağılım raporları KAP'ta yayımlanır.",
  },
  {
    term: "Portföy Büyüklüğü (Fon Toplam Değeri)",
    category: "Temel Kavramlar",
    tip: "Fonun toplam kaç lira yönettiğini gösterir. Büyük fon her zaman iyi fon demek değildir ama genellikle likiditesi yüksektir.",
    spk: "Fon toplam değeri; fon portföyündeki varlıkların rayiç değerleri toplamından borçların düşülmesiyle bulunur ve günlük olarak TEFAS'ta ilan edilir.",
    importance: "Çok küçük fonlarda tek bir büyük çıkış fiyatı etkileyebilir; büyüklüğün zaman içinde düşüp düşmediğini izlemek yatırımcı güvenini yansıtır.",
  },
  {
    term: "Hisse Senedi Yoğun Fon",
    category: "Temel Kavramlar",
    tip: "Paranın büyük kısmını borsadaki şirket hisselerine yatıran fondur. Kazanç potansiyeli yüksek, dalgalanma da yüksektir.",
    spk: "SPK III-52.1: Portföyünün en az %80'i sürekli olarak Türk şirketlerinin hisse senetlerinden oluşan fonlar 'hisse senedi yoğun fon' sayılır.",
    importance: "Kısa vadede sert düşüşler yaşanabilir; uzun vade ve risk toleransı gerektirir. Stopaj avantajı bu fon türüne özgüdür.",
  },
  {
    term: "Değişken Fon",
    category: "Temel Kavramlar",
    tip: "Yönetici piyasa koşuluna göre hisse, tahvil, altın arasında oranları serbestçe değiştirebilir; 'esnek' bir fon türüdür.",
    spk: "Değişken fonlar, portföy sınırlamalarında sabit bir varlık yoğunluğu şartı aramayan ancak izahnamedeki stratejiye bağlı kalan fonlardır (SPK III-52.1).",
    importance: "Getirisi yöneticinin kararlarına bağlıdır; yönetici geçmişi ve fonun risk değeri dikkatle incelenmelidir.",
  },
  {
    term: "Para Piyasası Fonu",
    category: "Temel Kavramlar",
    tip: "Paranın çok kısa vadeli, düşük riskli araçlarda (ters repo, kısa vadeli bono) beklediği 'likit' fondur. Banka mevduatına alternatif olarak kullanılır.",
    spk: "Ağırlıklı ortalama vadesi kısa olan ve portföyü para ve sermaye piyasası araçlarından oluşan fonlardır; SPK III-52.1 vade ve portföy sınırlamalarına tabidir.",
    importance: "Düşük riskli olsa da getiri garantisi yoktur ve mevduat gibi devlet sigortası (TMSF) kapsamında değildir.",
  },
  {
    term: "Borçlanma Araçları Fonu",
    category: "Temel Kavramlar",
    tip: "Devlet tahvili, özel sektör bonosu gibi 'borç senetlerine' yatıran fondur. Faizler düşünce değer kazanır, yükselince kaybeder.",
    spk: "Portföyünün en az %80'i kamu/özel sektör borçlanma araçlarından oluşan fonlardır; ortalama vade ve kredi riski limitleri izahnamede belirtilir.",
    importance: "Faiz riski ve kredi (temerrüt) riski taşır. Portföy vadesi uzadıkça faiz değişimine duyarlılık artar.",
  },
  {
    term: "Fon Sepeti Fonu",
    category: "Temel Kavramlar",
    tip: "Doğrudan hisse almak yerine başka yatırım fonlarını (sepet içinde sepet) alan fondur.",
    spk: "Portföyünün en az %80'ini diğer yatırım fonu katılma paylarına yatıran fonlardır; yatırım yapılan fon sayısı ve oranlarına ilişkin sınırlamalar III-52.1'de yer alır.",
    importance: "İkinci bir yönetim ücreti katmanı olabilir; toplam maliyeti (TGO) mutlaka karşılaştırın.",
  },
  {
    term: "Serbest Fon",
    category: "Temel Kavramlar",
    tip: "Standart fonlara göre daha az kısıtlaması olan, riskli stratejiler (açığa satış, kaldıraç) kullanabilen fondur; genellikle yüksek tutarlı alıma ve nitelikli yatırımcıya yöneliktir.",
    spk: "SPK III-52.1 (Serbest Fonlar bölümü): Portföy sınırlamalarından muaf olabilen, katılma payları nitelikli yatırımcılara satılan ve minimum yatırım tutarı bulunan fonlardır.",
    importance: "Risk ve kaybetme olasılığı çok yüksek olabilir; yalnızca riski tam anlayan nitelikli yatırımcılar için uygundur.",
  },
  {
    term: "Kıymetli Madenler Fonu",
    category: "Temel Kavramlar",
    tip: "Fon portföyünü altın, gümüş gibi kıymetli madenlere (veya bunlara dayalı sertifikalara) yatıran fondur.",
    spk: "Portföyünün asgari oranı altın/kıymetli maden ve bunlara dayalı sermaye piyasası araçlarından oluşan fonlardır; SPK III-52.1 portföy sınırlamaları geçerlidir.",
    importance: "Getiri hem ons fiyatına hem de dolar/TL kuruna bağlıdır. Enflasyona karşı koruma beklentisiyle tercih edilir ancak garanti vermez.",
  },
  {
    term: "Katılım Fonu",
    category: "Temel Kavramlar",
    tip: "Faiz içeren araçlara yatırım yapmayan, kira sertifikası ve katılım esaslı araçlarla çalışan faizsiz finans prensipli fondur.",
    spk: "Portföyü faizsiz finans ilkelerine uygun varlıklardan oluşan fonlardır; uygunluk, Katılım Finans Danışma Kurulu ve ilgili SPK düzenlemeleri çerçevesinde denetlenir.",
    importance: "Faizsiz finans hassasiyeti olan yatırımcılar için önemlidir; yatırım evreni dar olduğundan getiri/risk profili diğer fonlardan farklı olabilir.",
  },
  {
    term: "TEFAS",
    category: "Temel Kavramlar",
    tip: "Fonların alınıp satıldığı resmi elektronik platformdur; tüm fonların günlük fiyatı, büyüklüğü ve yatırımcı sayısı burada şeffafça görülür.",
    spk: "Türkiye Elektronik Fon Alım Satım Platformu (TEFAS), Takasbank tarafından işletilir; yatırım fonu katılma paylarının alım-satımı ve fon verilerinin kamuya duyurulması için SPK'nın izniyle faaliyet gösterir.",
    importance: "Bu platformdaki tüm fiyatlar TEFAS kaynaklıdır; kendi araştırmanızı doğrudan tefas.gov.tr üzerinden doğrulayabilirsiniz.",
  },
  {
    term: "Valör",
    category: "Temel Kavramlar",
    tip: "Para ve pay transferinin gerçekten gerçekleştiği tarihtir. 'T+1' demek, işlemden 1 iş günü sonra parayı alırsınız demektir.",
    spk: "Alım ve satım valörleri fon izahnamesinde belirtilir; TEFAS'ta işlem saatleri ve valör kuralları fon bazında farklılık gösterebilir.",
    importance: "Paranıza ihtiyaç duyduğunuz tarihte nakde erişim gecikebilir; bu süre fon getirisi hesaplamalarında genellikle dikkate alınmaz.",
  },
  {
    term: "TÜFE (Enflasyon)",
    category: "Temel Kavramlar",
    tip: "Ürün ve hizmet fiyatlarının genel artışıdır. Paranızın alım gücü enflasyon kadar erir.",
    spk: "TÜFE, TÜİK tarafından aylık yayımlanan resmi fiyat endeksidir. SPK düzenlemelerinde getiri karşılaştırmalarında kullanılan bir ölçüt olarak anılabilir.",
    importance: "Nominal getiriniz enflasyonun altındaysa reel olarak kaybediyorsunuz demektir. Reel Getiri Simülatörü bu etkiyi hesaplar.",
  },
  {
    term: "Reel Getiri",
    category: "Temel Kavramlar",
    tip: "Enflasyondan arındırılmış gerçek kazanç: yatırımınız yüzde 40 kazandırdı, enflasyon yüzde 33 ise reel kazanç yaklaşık yüzde 5 civarıdır.",
    spk: "Resmî bir mevzuat tanımı olmayıp finans literatüründe (1+nominal)/(1+enflasyon)-1 formülüyle hesaplanır.",
    importance: "Yüksek görünen getiriler enflasyon ve vergi sonrası çok düşük çıkabilir; karar vermeden önce net ve reel getiriye bakın.",
  },
  {
    term: "Brüt Getiri / Net Getiri",
    category: "Temel Kavramlar",
    tip: "Brüt: kesintiler öncesi kazanç. Net: yönetim ücreti, vergi gibi kesintiler düşüldükten sonra cebinize kalan kazanç.",
    spk: "TEFAS'ta ilan edilen birim pay fiyatı yönetim ücretleri düşülmüş fiyattır; stopaj ise satış/itfa anında ayrıca kesilir.",
    importance: "Fonları karşılaştırırken yalnızca brüt getiriye bakmak yanıltıcıdır; toplam maliyet ve vergi etkisi sonucu belirler.",
  },

  // ───────────── HUKUK & GÜVENLİK ─────────────
  {
    term: "İzahname",
    category: "Hukuk & Güvenlik",
    tip: "Fonun 'kullanım kılavuzu ve sözleşmesidir': ne yapacağı, hangi riskleri aldığı ve hangi ücretleri kestiği burada yazar.",
    spk: "SPKn md. 52 ve SPK III-52.1: Kurucu tarafından hazırlanan, SPK onayına tabi, fonun yatırım stratejisi, riskleri, ücretleri ve yönetimine ilişkin esasları içeren belgedir; KAP'ta yayımlanır.",
    importance: "Fon bir şeyi izahnamede yazandan farklı yapamaz. Yatırım stratejisi, alım-satım valörü ve ücret tablosu için en güvenilir kaynaktır.",
  },
  {
    term: "Yatırımcı Bilgi Formu (YBF)",
    category: "Hukuk & Güvenlik",
    tip: "İzahnamenin 2 sayfalık özetidir; risk, maliyet ve geçmiş performansı sade bir dille tek bakışta gösterir.",
    spk: "SPK III-52.1: Her fon için hazırlanması ve KAP'ta güncel tutulması zorunlu, standart formatlı 'Yatırımcı Bilgi Formu' yayımlanır.",
    importance: "İzahnameyi okumaya vaktiniz yoksa mutlaka YBF'yi okuyun; risk değeri ve toplam gider oranı bu formda yer alır.",
  },
  {
    term: "Portföy Saklayıcısı (Takasbank Güvencesi)",
    category: "Hukuk & Güvenlik",
    tip: "Fonun varlıklarını gözeten bağımsız 'kasa' kurumudur. Fonu yöneten şirket paraya doğrudan dokunamaz.",
    spk: "SPKn md. 56 ve SPK III-56.1 Portföy Saklama Hizmetine İlişkin Esaslar Tebliği: Fon malvarlığı, kurucudan bağımsız bir portföy saklayıcısı (örn. Takasbank veya yetkili banka) nezdinde saklanır ve işlemlerin mevzuata uygunluğu denetlenir.",
    importance: "Yönetici şirket batsa dahi fon malvarlığı saklayıcıda ayrı tutulduğundan yatırımcının payı korunur; güvenin hukuki temelidir.",
  },
  {
    term: "Fon Malvarlığı Ayrılığı (SPKn Md. 52-53)",
    category: "Hukuk & Güvenlik",
    tip: "Fonun parası yönetici şirketin parası değildir; ayrı bir cüzdan gibi korunur, şirketin borcu için haczedilemez.",
    spk: "6362 sayılı SPKn md. 52-53: Fon malvarlığı kurucunun malvarlığından ayrıdır; kurucunun alacaklıları tarafından haczedilemez, rehnedilemez ve teminat gösterilemez.",
    importance: "Aracı kurum veya portföy yönetim şirketi iflas etse bile fon malvarlığı yatırımcılar için korunur; fonlara güvenin ana dayanağıdır.",
  },
  {
    term: "SPK (Sermaye Piyasası Kurulu)",
    category: "Hukuk & Güvenlik",
    tip: "Borsa, fon ve sermaye piyasasını denetleyen devlet kurumudur; hakemlik değil 'kurallara uyulup uyulmadığına' bakar.",
    spk: "6362 sayılı SPKn uyarınca kurulan SPK; izahname onaylama, fon ve kurucu izni verme, denetim ve idari yaptırım uygulama yetkisine sahiptir.",
    importance: "SPK onayı, fonun getiri sağlayacağı anlamına gelmez; yalnızca mevzuata uygunluğu ifade eder.",
  },
  {
    term: "KAP (Kamuyu Aydınlatma Platformu)",
    category: "Hukuk & Güvenlik",
    tip: "Şirket ve fonların resmi duyurularını yayımladığı ücretsiz, herkese açık internet sitesidir.",
    spk: "Kamuyu aydınlatma yükümlülükleri SPKn ve Kamuyu Aydınlatma Tebliği kapsamında KAP üzerinden yerine getirilir; fon izahnameleri, YBF, portföy dağılım raporları burada yayımlanır.",
    importance: "Bir fon hakkında en güvenilir ve güncel bilgi kaynağıdır; sosyal medya iddiaları yerine KAP belgesini esas alın.",
  },
  {
    term: "Portföy Yönetim Şirketi (PYŞ)",
    category: "Hukuk & Güvenlik",
    tip: "Fonu kuran ve yatırım kararlarını veren uzman şirkettir; fon yöneticisinin çalıştığı kurumdur.",
    spk: "SPKn md. 54 ve III-55.1: SPK'dan faaliyet izni almış, fon portföyünü izahname ve yatırımcı çıkarı doğrultusunda sadakat ve özen borcuyla yöneten anonim ortaklıktır.",
    importance: "Şirketin geçmişi, yönettiği fon sayısı ve uzmanlığı fon kalitesinin göstergelerindendir.",
  },
  {
    term: "Kurucu",
    category: "Hukuk & Güvenlik",
    tip: "Fonu kuran kurumdur (portföy yönetim şirketi veya yetkili banka/aracı kurum).",
    spk: "SPKn ve III-52.1: Fon kurucusu, fonun kuruluşundan ve izahname/içtüzük uyarınca yönetilmesinden sorumludur; kurucu değişikliği SPK iznine tabidir.",
    importance: "Fonun hukuki sorumlusunun kim olduğunu bilmek yatırımcı hakları açısından önemlidir.",
  },
  {
    term: "Yatırım Danışmanlığı",
    category: "Hukuk & Güvenlik",
    tip: "Size kişiye özel 'şunu al, bunu sat' demek, yalnızca yetkili kuruluşların yapabileceği ve sözleşme gerektiren bir hizmettir.",
    spk: "SPKn md. 37 ve ilgili tebliğ: Yatırım danışmanlığı yalnızca aracı kurumlar, portföy yönetim şirketleri ve mevduat kabul etmeyen bankalar tarafından, müşteri ile imzalanan sözleşme çerçevesinde sunulabilir.",
    importance: "Bu platform dahil genel bilgi içerikleri yatırım danışmanlığı değildir; kişisel kararlarınızda yetkili kuruluşlardan hizmet alın.",
  },
  {
    term: "Risk Değeri (1-7)",
    category: "Hukuk & Güvenlik",
    tip: "Fonun 'risk termometresi'dir: 1 en sakin, 7 en riskli demektir. Fonun geçmiş dalgalanmasına göre hesaplanır.",
    spk: "SPK III-52.1 ve YBF düzenlemeleri uyarınca fonun getirisindeki oynaklığa göre 1 ile 7 arasında standart bir risk değeri belirlenir ve Yatırımcı Bilgi Formunda gösterilir.",
    importance: "Risk değeri 6-7 olan fonda ciddi kayıp yaşanabilir; kendi risk toleransınıza uygun fon seçin.",
  },
  {
    term: "Kamuyu Aydınlatma Yükümlülüğü",
    category: "Hukuk & Güvenlik",
    tip: "Fonun önemli gelişmeleri ve belgeleri herkese açık biçimde duyurma zorunluluğudur.",
    spk: "SPKn md. 15 ve ilgili tebliğ: Fon ve kurucular, fiyat, portföy dağılımı, ücretler ve özel durumları ilgili süre ve formatta KAP/TEFAS aracılığıyla duyurur.",
    importance: "Şeffaflık güvenin ön şartıdır; belgesi kamuya açıklanmayan bir iddia güvenilir kabul edilmemelidir.",
  },

  // ───────────── RİSK & PERFORMANS ─────────────
  {
    term: "Volatilite",
    category: "Risk & Performans",
    tip: "Fiyatın ne kadar sert inip çıktığının ölçüsüdür. Volatilite yüksekse yolculuk çok sarsıntılıdır.",
    spk: "Resmî bir mevzuat tanımı olmayıp, günlük getirilerin standart sapmasının yıllıklandırılmasıyla hesaplanır; fonun risk değeri (1-7) bu oynaklık esasına dayanır.",
    importance: "Aynı getiriyi sağlayan iki fondan oynaklığı düşük olan genellikle daha tercih edilir; platformda bu değer doğrulanabilir formülle hesaplanır.",
  },
  {
    term: "Maksimum Düşüş (Max Drawdown)",
    category: "Risk & Performans",
    tip: "Zirveden dibe yaşanmış en büyük kayıp yüzdesidir: 'En kötü dönemde parayı yüzde kaç eritmiştim?' sorusunun cevabı.",
    spk: "Mevzuatta tanımlı bir terim değildir; fiyat serisinde zirve değerden sonraki en büyük yüzdesel düşüş olarak hesaplanır.",
    importance: "Kayıp dönemlerine psikolojik olarak dayanıp dayanamayacağınızı gösterir; yüksek getiri çoğu zaman büyük düşüşlerle birlikte gelir.",
  },
  {
    term: "Sharpe Oranı",
    category: "Risk & Performans",
    tip: "Aldığınız her birim risk karşılığında ne kadar fazladan getiri elde ettiğinizi gösterir; yüksek oran daha verimli demektir.",
    spk: "Mevzuatta tanımlı değildir; (portföy getirisi – risksiz getiri) / standart sapma formülüyle hesaplanan, performans ölçüm literatüründe yaygın kullanılan orandır.",
    importance: "Sadece getiriye bakmak yerine riskle düzeltilmiş getiriye bakmak daha sağlıklı karşılaştırma sağlar.",
  },
  {
    term: "Benchmark (Karşılaştırma Ölçütü)",
    category: "Risk & Performans",
    tip: "Fonun başarısını ölçmek için kıyaslandığı 'çıta' endekstir (örn. BIST 100). Fon çıtanın üstündeyse başarılı sayılır.",
    spk: "SPK III-52.1: Fonlar izahnamede ve YBF'de performansı ölçülecek karşılaştırma ölçütünü açıklar ve getiri sunumlarında bu ölçütle kıyas yapar.",
    importance: "Fonu kendi ölçütüyle karşılaştırarak yönetici gerçekten değer katıyor mu görebilirsiniz.",
  },
  {
    term: "100 Bazlı Normalizasyon",
    category: "Risk & Performans",
    tip: "Farklı fiyatlı fonları adil kıyaslamak için hepsini başlangıçta 100 TL kabul edip gelişimini izleme yöntemidir.",
    spk: "Mevzuat terimi değil; N(t) = (Fiyat(t) / Fiyat(0)) × 100 formülüyle hesaplanan standart karşılaştırma tekniğidir.",
    importance: "1.700 TL'lik fon ile 0,60 TL'lik fon birebir kıyaslanamaz; normalizasyon bunu mümkün kılar.",
  },
  {
    term: "Ters Repo",
    category: "Risk & Performans",
    tip: "Fonun elindeki parayı çok kısa süreliğine (genelde 1 gün) karşılığında teminat alarak ödünç vermesidir; düşük riskli kısa vadeli getiri aracıdır.",
    spk: "Borsa İstanbul Repo-Ters Repo Pazarı'nda veya BIST dışında yapılan işlemler SPK III-52.1 portföy sınırlamalarına tabidir; fonlar ters repo ile nakdini değerlendirebilir.",
    importance: "Para piyasası fonlarının ana getiri kaynağıdır; karşı taraf riski teminat ile sınırlandırılır.",
  },
  {
    term: "Türev Araçlar (VİOP)",
    category: "Risk & Performans",
    tip: "Değeri başka bir varlığa (döviz, endeks, altın) bağlı sözleşmelerdir; hem korunma hem kaldıraçlı spekülasyon için kullanılabilir.",
    spk: "Fonlar, izahnamede belirtilen amaç ve sınırlar dâhilinde Vadeli İşlem ve Opsiyon Piyasası (VİOP) gibi organize piyasalardaki türev işlemlerini kullanabilir (SPK III-52.1).",
    importance: "Kaldıraç kayıpları büyütebilir; izahnamede türev kullanımı ve riski açıkça incelenmelidir.",
  },
  {
    term: "Eurobond",
    category: "Risk & Performans",
    tip: "Türkiye devletinin veya şirketlerinin yurt dışında döviz cinsinden çıkardığı borç senetleridir.",
    spk: "Eurobond'lar yabancı para borçlanma araçlarıdır; Eurobond fonlarının portföy ve kur riski sınırlamaları izahnamede tanımlanır.",
    importance: "Döviz getirisi sağlar ancak kur ve ülke kredi riski taşır; TL'ye dönüşte kur hareketi sonucu belirler.",
  },
  {
    term: "Çeşitlendirme",
    category: "Risk & Performans",
    tip: "'Tüm yumurtaları aynı sepete koyma' ilkesidir: farklı varlıklara dağıtarak tek bir varlığın düşüşünden korunursunuz.",
    spk: "SPK III-52.1'deki portföy sınırlamaları (tek ihraççıya yatırım üst limitleri vb.) fonlarda çeşitlendirmeyi zorunlu kılar.",
    importance: "Sanal Sepet Laboratuvarı ile farklı fon ağırlıklarının toplam riski nasıl değiştirdiğini deneyebilirsiniz.",
  },
  {
    term: "Likidite Riski",
    category: "Risk & Performans",
    tip: "İstediğiniz anda, istediğiniz fiyattan nakde dönememe riskidir.",
    spk: "Fonların likit varlık oranı ve iade yükümlülüklerine ilişkin esaslar SPK III-52.1'de düzenlenir; olağanüstü durumlarda fon iadeleri geçici olarak durdurulabilir.",
    importance: "Özellikle serbest fonlarda ve az işlem gören varlıklarda önemlidir; valör süresi uzun fonlarda nakde erişim geç olabilir.",
  },
  {
    term: "Kur Riski",
    category: "Risk & Performans",
    tip: "Yatırımın değerinin döviz kuru hareketlerinden etkilenme riskidir.",
    spk: "Yabancı para cinsinden varlıklara yatırım yapan fonlarda kur riski izahnamede ve YBF'de risk bölümünde açıklanır.",
    importance: "Yabancı hisse ve Eurobond fonlarında getiri; varlığın performansı kadar dolar/TL kuruna da bağlıdır.",
  },
  {
    term: "Geçmiş Performans Uyarısı",
    category: "Risk & Performans",
    tip: "Geçmişte çok kazandırmış olmak gelecekte de kazandıracağı anlamına gelmez.",
    spk: "SPK reklam ve tanıtım kuralları uyarınca fon getiri sunumlarında 'geçmiş performans gelecek getirinin garantisi değildir' uyarısı zorunludur.",
    importance: "Yalnızca son dönem getirisine bakarak fon seçmek en sık yapılan hatadır; maliyet, risk ve strateji de incelenmelidir.",
  },

  // ───────────── VERGİ & KESİNTİLER ─────────────
  {
    term: "Stopaj",
    category: "Vergi & Kesintiler",
    tip: "Fonu satarken kazancınızdan devletin önceden kestiği vergidir; vergiyi sizin yerinize fon kurumu öder.",
    spk: "Gelir Vergisi Kanunu Geçici md. 67 ve Cumhurbaşkanı Kararı uyarınca fon kazançlarından fon türüne göre stopaj kesilir (örn. hisse senedi yoğun fonlarda %0). Güncel oranlar GİB mevzuatından teyit edilmelidir.",
    importance: "Aynı brüt getiriyi sağlayan iki fonun net getirisi, stopaj oranı farkı yüzünden çok değişebilir.",
  },
  {
    term: "Yönetim Ücreti",
    category: "Vergi & Kesintiler",
    tip: "Fon yöneticisinin hizmeti için fon malvarlığından her gün çok küçük oranlarda kesilen ücrettir.",
    spk: "SPK III-52.1 ve izahname: Yıllık azami fon yönetim ücreti izahnamede belirtilir; ücret günlük olarak hesaplanıp fon fiyatına yansıtılır.",
    importance: "Uzun vadede küçük görünen ücret farkları bile bileşik etkiyle ciddi tutarlara ulaşır; fon fiyatı zaten yönetim ücreti düşülmüş olarak ilan edilir.",
  },
  {
    term: "Toplam Gider Oranı (TGO)",
    category: "Vergi & Kesintiler",
    tip: "Fonun bir yılda ortalama fon büyüklüğünün yüzde kaçını her türlü masraf olarak harcadığını gösteren toplam maliyet oranıdır.",
    spk: "SPK III-52.1: Fon toplam gider kesintisi (yönetim, saklama, denetim, kurul vb.) için azami oranlar belirlenmiş olup fon, TGO'yu YBF'de yıllık olarak açıklar.",
    importance: "Getirisi benzer fonlardan TGO'su düşük olan daha avantajlıdır; tüm maliyetleri tek rakamda görmenizi sağlar.",
  },
  {
    term: "Performans Ücreti",
    category: "Vergi & Kesintiler",
    tip: "Yönetici, belirlenen çıtanın üstünde başarı sağlarsa kazanca ortak olarak aldığı ek ücrettir.",
    spk: "Bazı fonlarda izahnamede tanımlanan performans (başarı) ücreti, belirlenen eşik ve ölçüt aşıldığında fon varlığından tahakkuk ettirilir (SPK III-52.1).",
    importance: "Başarı ücreti net getiriyi düşürebilir; hangi ölçüt ve yüzdeye göre hesaplandığı izahnameden okunmalıdır.",
  },
  {
    term: "Fon Çıkış / Erken Satış Komisyonu",
    category: "Vergi & Kesintiler",
    tip: "Bazı fonlarda belirli süreden önce satış yaparsanız ödediğiniz ek bedeldir.",
    spk: "İzahnamede belirtilen koşullarla uygulanabilen alım-satım ve iade bedeli kesintileri SPK III-52.1 kapsamında kamuya açıklanmalıdır.",
    importance: "Kısa vadeli işlem planlıyorsanız bu kesintiler getirinizi azaltabilir; izahnamedeki ücret tablosuna bakın.",
  },
  {
    term: "Aracı Kurum / Banka Komisyonu",
    category: "Vergi & Kesintiler",
    tip: "Fonları aldığınız banka veya aracı kurumun işlem için kesebildiği hizmet bedelidir; TEFAS'ta çoğu fonda sıfırdır.",
    spk: "Dağıtım kuruluşlarının fon alım-satımında tahsil edebileceği komisyonlar sözleşme ve tarife kapsamında açıklanır; TEFAS işlemlerinde fon alım satım komisyon uygulamaları kurumlara göre değişebilir.",
    importance: "Aynı fonu farklı kurumlardan alırken toplam maliyet farklı olabilir; komisyon tarifesini karşılaştırın.",
  },
];
