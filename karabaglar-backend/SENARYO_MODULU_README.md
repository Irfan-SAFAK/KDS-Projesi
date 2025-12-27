# 📊 Dinamik Senaryo Yönetimi Modülü

Karabağlar Belediyesi Kentsel Donatı Karar Destek Sistemi (KDS) için oluşturulmuştur.

## 🎯 Özellikler

✅ **Dinamik Parametre Yönetimi**: Veritabanındaki parametreleri gerçek zamanlı olarak değiştirme  
✅ **Senaryo Testi**: Farklı parametre değerleriyle "what-if" analizleri yapma  
✅ **Modern UI**: Şık, kullanıcı dostu arayüz (yarı saydam panel, smooth animasyonlar)  
✅ **Güvenli Güncelleme**: Transaction tabanlı batch update  
✅ **Anında Yenileme**: Parametre değişikliklerinden sonra analiz otomatik yenilenir

---

## 📁 Oluşturulan Dosyalar

### Backend
```
controllers/
  └── parametreController.js     # Parametre GET ve UPDATE işlemleri

routes/
  └── parametreRoutes.js          # API endpoint tanımları

server.js                         # Yeni route ve static file middleware eklendi
```

### Frontend
```
public/
  ├── index.html                  # Ana HTML (Senaryo paneli eklendi)
  ├── styles.css                  # Modern CSS tasarım
  └── script.js                   # JavaScript mantık (API entegrasyonu)
```

---

## 🚀 Kurulum ve Kullanım

### 1. Backend'i Başlatın

```bash
cd C:\Users\PC\OneDrive\Desktop\karabaglar-backend
node server.js
```

Terminal çıktısı:
```
Sunucu http://localhost:3000 adresinde yayında.
```

### 2. Frontend'e Erişin

Tarayıcınızda şu adresi açın:
```
http://localhost:3000
```

veya

```
http://localhost:3000/index.html
```

### 3. Senaryo Panelini Açın

Ekranın **sağ üst köşesindeki** "**Senaryo Yönetimi**" butonuna tıklayın.

### 4. Parametreleri Değiştirin

- Panel açılınca tüm parametreler otomatik yüklenir
- İstediğiniz değerleri değiştirin
- "**💾 Kaydet ve Analizi Yenile**" butonuna basın

### 5. Sonuçları Görün

- Başarılı olursa: **"✅ Senaryo güncellendi!"** bildirimi
- Analiz otomatik yenilenir
- Dashboard panelinde güncel veriler gösterilir

---

## 🔌 API Endpoints

### 1. Parametreleri Getir
```http
GET http://localhost:3000/api/parametreler
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "parametre_adi": "park_kisi_basi_hedef",
      "deger": 1000,
      "birim": "kişi",
      "aciklama": "Her 1000 kişiye 1 park hedefi"
    },
    ...
  ]
}
```

### 2. Parametreleri Güncelle
```http
POST http://localhost:3000/api/parametreler/guncelle
Content-Type: application/json

{
  "parametreler": [
    { "id": 1, "deger": 1500 },
    { "id": 2, "deger": 2000 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Parametreler başarıyla güncellendi.",
  "updatedCount": 2
}
```

---

## 🎨 UI Özellikleri

### Senaryo Paneli
- **Konum**: Sağ üst köşe
- **Boyut**: 420px genişlik, responsive
- **Tasarım**: Gradient header, glassmorphism efekti
- **Animasyon**: Smooth slide-in/out

### Parametre Input Alanları
- **Validasyon**: Sadece pozitif sayılar
- **Birim Gösterimi**: Her parametrenin yanında (kişi, metre, vb.)
- **Açıklama**: Kullanıcı dostu bilgilendirme

### Toast Bildirimleri
- **Başarı**: Yeşil border, ✅ ikonu
- **Hata**: Kırmızı border, ❌ ikonu
- **Süre**: 3 saniye sonra otomatik kaybolur

---

## 🔒 Güvenlik

- ✅ **Transaction Kullanımı**: Tüm güncelleme işlemleri transaction içinde
- ✅ **Validasyon**: Frontend ve backend'de input kontrolü
- ✅ **SQL Injection Koruması**: Prepared statements kullanımı
- ✅ **CORS Koruması**: Sadece belirlenen origin'lere izin

---

## 🧪 Test Senaryoları

### Senaryo 1: Park Parametresi Değiştirme
1. Senaryo panelini açın
2. "Park Kişi Başı Hedef" parametresini **1000 → 500** yapın
3. Kaydet butonuna basın
4. Analiz sonucunda daha fazla mahallenin "YETERLİ" durumuna geçtiğini görün

### Senaryo 2: Okul Parametresi Değiştirme
1. "Okul" parametresini **5000 → 3000** yapın
2. Kaydedin
3. Küçük nüfuslu mahallelerde "GEREK YOK" → "YETERSİZ" değişikliği olabilir

### Senaryo 3: Toplu Güncelleme
1. Birden fazla parametreyi değiştirin
2. Tek seferde kaydedin
3. Tüm değişikliklerin uygulandığını görün

---

## 🐛 Hata Durumları

### Sorun: "Parametreler yüklenemedi"
**Çözüm:**
- WAMP/MySQL sunucusunun çalıştığından emin olun
- Backend'in çalıştığını kontrol edin: `http://localhost:3000`

### Sorun: "CORS hatası"
**Çözüm:**
- `server.js` dosyasında `app.use(cors())` satırının olduğundan emin olun

### Sorun: Panelde değişiklikler kayboldu
**Çözüm:**
- "İptal" butonuna bastıysanız değişiklikler geri alınır
- Tekrar düzenleyip "Kaydet" butonuna basın

---

## 📊 Veritabanı Şeması

`parametreler` tablosu:
```sql
CREATE TABLE parametreler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    parametre_adi VARCHAR(100) NOT NULL,
    deger DECIMAL(10,2) NOT NULL,
    birim VARCHAR(50),
    aciklama TEXT
);
```

---

## 🚀 Gelecek Geliştirmeler (Opsiyonel)

- [ ] **Senaryo Kaydetme**: Farklı senaryoları isimle kaydetme
- [ ] **Senaryo Karşılaştırma**: İki senaryoyu yan yana karşılaştırma
- [ ] **Export/Import**: Senaryoları JSON olarak dışa aktarma
- [ ] **Grafik Gösterimi**: Parametrelerin etkisini grafikle gösterme
- [ ] **Kullanıcı Yetkileri**: Sadece admin'lerin değişiklik yapabilmesi

---

## 📞 İletişim ve Destek

Herhangi bir sorun veya öneriniz için lütfen iletişime geçin.

**Proje**: Karabağlar Belediyesi Kentsel Donatı Karar Destek Sistemi  
**Versiyon**: 1.0.0  
**Tarih**: 2024

---

## ✅ Checklist

Modül başarıyla kurulduysa:

- [x] Backend controller oluşturuldu
- [x] Backend route eklendi
- [x] server.js güncellendi
- [x] Frontend HTML oluşturuldu
- [x] Frontend CSS tasarlandı
- [x] Frontend JavaScript entegre edildi
- [x] API testleri başarılı
- [x] UI responsive çalışıyor

🎉 **Tebrikler! Dinamik Senaryo Yönetimi modülü aktif!**

