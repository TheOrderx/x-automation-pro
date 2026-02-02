# 🚀 X-Otomasyon Pro Bot (v4.0)

X (Twitter) işlemlerinizi saniyeler içinde otomatize eden, modern arayüze sahip, yüksek kararlılık sunan gelişmiş bir tarayıcı eklentisidir. Algoritma dostu gecikme sistemleri, insan simülasyonu ve detaylı istatistik takibi ile hesabınızı güvenle büyütmenize yardımcı olur.

![X-Automation Banner](https://img.shields.io/badge/X--Automation-Pro--Bot-blue?style=for-the-badge&logo=twitter)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-3.5-orange?style=for-the-badge)

## ✨ Öne Çıkan Özellikler

### 🤖 Gelişmiş Etkileşim Motoru (v3.5 Güncellemesi)
- **Toplu Döngü 2.0 (Bulk Loop):** Belirlenen sayıda tweet'i teker teker açar, mention'ları (yanıtları) beğenir ve otomatik olarak bir sonraki tweet'e geçer.
- **SPA & Navigasyon Desteği:** Twitter'ın Single Page Application yapısıyla tam uyumlu; sayfa yenilenmeden yapılan geçişleri algılar ve işleme devam eder.
- **Otomatik Sahip Etkileşimi:** Yanıtları beğenirken tweet sahibini (ana tweeti) de otomatik olarak beğenerek etkileşim kalitesini artırır.
- **Akıllı Akış Kontrolü:** Eğer bir akışta yeni tweet bulunamazsa, ayarlanabilir "Boş Akış Yenileme" sınırı uyarınca sayfayı otomatik tazeler.
- **Hassas Tıklama Teknolojisi:** MouseEvent yanında **PointerEvent** desteği ve butonların iç katmanlarına (SVG) erişim yeteneği ile %100 etkileşim başarısı.
- **Keşfet Bölümü Koruması:** "Daha fazlasını keşfet" alanını otomatik algılayarak önerilen (alakasız) tweetleri etkileşim dışı bırakır.

### 🧹 Profesyonel Temizlik Araçları
- **Toplu Takipten Çıkma:** Sizi takip etmeyenleri (Non-Followers) veya onaylı olmayan (Unverified) hesapları tek tıkla ayıklayın.
- **Her Şeyi Temizle:** Tüm tweetlerinizi, beğenilerinizi, yanıtlarınızı veya retweetlerinizi tek bir komutla toplu olarak temizleyin.
- **Beyaz Liste (Whitelist):** Korunmasını istediğiniz kullanıcıları ekleyin; bot onlara asla dokunmaz.
- **Akıllı Kelime Filtresi:** Belirlediğiniz anahtar kelimelerin (ör: "kazan", "takip et", "spam") geçtiği mentleri otomatik olarak atlayın.
- **🛡️ Gelişmiş Anti-Shadowban:** Belirlenen işlem sayısına ulaştığında (ör: 30 beğeni) botun otomatik olarak uyku moduna geçmesini (ör: 10 dk) sağlayarak X arayüzündeki radardan kaçın.

### 🛡️ Güvenlik ve Algoritma Dostu Yapı
- **İnsan Simülasyonu:** Rastgele gecikmeler, staggered tıklama (basma ve çekme arası süre) ve doğal kaydırma hareketleri ile bot tespitini engeller.
- **Maksimum Yaş Filtresi:** Sadece güncel içeriklerle etkileşim kurmak için saat bazlı tweet yaşı sınırlaması.
- **Sessiz Durdurma:** İşlemleri durdurduğunuzda hata vermeden temiz bir şekilde sonlanır.

### ⚡ Ultra Hızlı Takipçi Çekimi (Turbo Scrape v4.0)
- **Ultra Turbo Mod:** Takipçi listesini "ışık hızında" kaydırarak tarar. Listede zaten kayıtlı kişiler varsa 0.35 saniyede geçer, yeni kişi bulursa 1 saniyede okur.
- **Akıllı Bitiş Algılama:** İnternet yavaşladığında veya sayfa takıldığında yanlışlıkla "Bitti" demesini engelleyen akıllı sabır mekanizması.
- **Limit Kontrolü:** "Bir sorun oluştu" veya "Yeniden dene" butonlarını algılayıp otomatik olarak tıklar ve devam eder.

### 💾 Veritabanı ve Yedekleme (YENİ)
- **Tam Yedekleme:** Tek tıkla tüm ayarlarınızı, kara listenizi ve binlerce kişilik takipçi önbelleğinizi `.json` dosyası olarak bilgisayarınıza indirin.
- **Geri Yükleme:** İndirdiğiniz yedeği seçerek farklı bir tarayıcıda veya bilgisayarda kaldığınız yerden devam edin.
- **Limitsiz Depolama:** Chrome'un 5MB depolama limiti aşıldı, artık on binlerce takipçiyi veri kaybı yaşamadan saklayabilirsiniz.

### 📊 Modern Kontrol Paneli
- **Dashboard:** Şık, koyu temalı, cam morfizmli (glassmorphism) modern UI.
- **Canlı Loglama:** Botun yaptığı her işlemi, neden atladığını veya kaçta kaç ilerlediğini anlık olarak panelden görün.
- **Gelişmiş Ayarlar:** Kaydırma hızı, tıklama hızı, sayfa yenileme sınırı gibi tüm parametreleri kendinize göre optimize edin.

## 🛠️ Kurulum

1. Bu projeyi bilgisayarınıza indirin veya klonlayın.
2. Google Chrome tarayıcınızı açın ve `chrome://extensions/` adresine gidin.
3. Sağ üst köşedeki **"Geliştirici Modu"** (Developer Mode) seçeneğini aktif hale getirin.
4. **"Paketlenmiş eklenti yükle"** (Load Unpacked) butonuna tıklayın ve proje klasörünü seçin.
5. X.com (Twitter) sayfasını yenileyin ve dashboard üzerinden otomasyonunuzu başlatın!

## 📄 Lisans

Bu proje MIT Lisansı ile lisanslanmıştır.

---
*⚠️ **Feragatname:** Bu proje eğitim ve kişisel kullanım amaçlı geliştirilmiştir. Twitter'ın (X) kullanım koşullarına aykırı aşırı işlemler yapmak hesabınızın kısıtlanmasına veya askıya alınmasına neden olabilir. Kullanım sorumluluğu kullanıcıya aittir.*
