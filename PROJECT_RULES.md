# Proje Anayasası ve Değişmez Çalışma Kuralları (`PROJECT_RULES.md`)

**Proje Adı:** Kişisel Finans, Yatırım Fonları, Finansal Şeffaflık ve Fonlara Güven Platformu (TÜBİTAK 2209-A Araştırma Projesi)

Bu projede geliştirilen tüm modüller, veri boru hatları, analiz motorları ve kullanıcı arayüzü bileşenleri aşağıdaki **6 değişmez kurala** tabidir:

---

### 1. Gerçek Veri İlkesi
Asla sahte (mock/dummy) finansal veriyi gerçek veriymiş gibi sunma. Veri çekilemezse (WAF engeli, ağ hatası, API kesintisi vb. durumlarda) hatayı gizleme ve açıkça raporla.

### 2. Örnek/Simülasyon Ayrımı
Simülasyon veya varsayım verilerini arayüzde ve veritabanında açıkça etiketle. Gerçek piyasa verileri ile senaryo/simülasyon verileri hiçbir tabloda, grafikte veya çıktıda birbirine karıştırılamaz.

### 3. Kaynak ve Kanıt Zorunluluğu
"Fonlara Neden Güvenmeliyiz?" ve "Fon Bültenleri" bölümlerindeki her resmi iddia; kaynak kurum (**SPK**, **Takasbank**, **KAP**, **PYŞ**), belge adı, tarih ve madde/sayfa numarası ile desteklenmelidir. Kaynağı doğrulanamayan hiçbir hukuki veya kurumsal iddia sisteme eklenemez.

### 4. Resmi Belge vs. Yorum Ayrımı
Yapay zekâ özetlerinde ve bültenlerde resmi/kesin veriler ile şirket/piyasa yorumları birbirinden kesin olarak ayrılmalıdır. Portföy yönetim şirketlerinin beklenti ve öngörüleri "Piyasa/Şirket Yorumu", izahname/tüzük/KAP bildirimlerindeki olgular ise "Resmi/Kesin Veri" olarak sınıflandırılmalıdır.

### 5. Hesaplama Şeffaflığı
Tüm finansal hesaplamalar (getiri, 100 bazlı normalizasyon, ağırlıklı sepet getirisi, tatil günü fiyat eşleştirmesi) yapay zekâ tahminiyle değil, doğrulanabilir Python fonksiyonlarıyla yapılmalı ve kullanılan veri tarihleri açıkça gösterilmelidir.

### 6. Mimari Yapı
Backend **Python (FastAPI + SQLite/PostgreSQL)**, Frontend **Next.js (Tailwind CSS)** olarak modüler geliştirilecektir. Katmanlar arası sorumluluk ayrımı (veri çekme, veritabanı, finansal hesaplama, API, arayüz) korunacaktır.
