# Karabağlar KDS Projesi

Bu proje, **Karar Destek Sistemleri** ve **Sunucu Tabanlı Programlama** dersleri kapsamında hazırlanmıştır.

## Projenin Amacı
Karabağlar ilçesi için mekansal verileri yönetmek ve karar destek süreçlerine yardımcı olacak bir web tabanlı yönetim paneli sunmaktır.

## Kurulum
Gerekli paketleri yüklemek için terminalde şu komutu çalıştırın:
npm install

## Çalıştırma
Projeyi başlatmak için:
node server.js

## API Endpoint Listesi

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | `/` | Sunucu durumunu kontrol eder. |
| GET | `/api/parametreler` | Sistemdeki tüm parametreleri listeler. |
| POST | `/api/parametreler/guncelle` | Parametre değerlerini günceller. |
| GET | `/api/dashboard/mahalle-analizi` | Mahalle bazlı analiz verilerini getirir. |

## Veritabanı Şeması (ER Diyagramı)
Proje klasörü içerisinde `ER_Diyagrami.png` dosyası mevcuttur.