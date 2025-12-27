// server.js - KARABAĞLAR KDS AKILLI BACKEND
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Veritabanı bağlantısı

// Rotaları içeri alıyoruz
const katmanRoutes = require('./routes/katmanRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const parametreRoutes = require('./routes/parametreRoutes'); 

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json());
app.use(express.static('public')); 

// Rotaları Tanımla
app.use('/api/katman', katmanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/parametreler', parametreRoutes); 

// Ana sayfa kontrolü
app.get('/', (req, res) => {
    res.send('Karabağlar KDS API (Akıllı Modül) Çalışıyor 🚀');
});

// =================================================================
// 🧠 YENİ: AKILLI SENARYO VE MALİYET HESAPLAMA MOTORU
// =================================================================
app.post('/api/senaryo/hesapla', async (req, res) => {
    try {
        // Frontend'den gelen veriler: tesisTuru (okul, park...), mesafe (300, 500...)
        const { tesisTuru, mesafe } = req.body;

        // 1. ADIM: Tesis Türüne Göre Akıllı Fiyat Listesi
        // (Sunumda bu fiyatların değiştiğini göreceksin)
        const fiyatListesi = {
            'okul': { fiyat: 15000000, tablo: 'okullar', isim: 'Okul' },
            'saglik': { fiyat: 5000000, tablo: 'saglik_ocaklari', isim: 'Sağlık Ocağı' },
            'park': { fiyat: 750000, tablo: 'parklar_yesil_alanlar', isim: 'Park' },
            'spor': { fiyat: 1200000, tablo: 'spor_tesisleri', isim: 'Spor Tesisi' },
            'kutuphane': { fiyat: 2500000, tablo: 'kutuphaneler', isim: 'Kütüphane' },
            'afet': { fiyat: 100000, tablo: 'afet_toplanma_alanlari', isim: 'Afet Alanı' }
        };

        // Varsayılan olarak park seçili olsun (hata almamak için)
        const secilen = fiyatListesi[tesisTuru] || fiyatListesi['park'];

        // 2. ADIM: Veritabanından "Eksik Olan" Mahalleleri Bul
        // (SQL ilişkilerini kurduğumuz için bu sorgu hatasız çalışacak)
        const sql = `
            SELECT m.mahalle_adi, m.toplam_nufus
            FROM mahalleler m
            LEFT JOIN ${secilen.tablo} t ON m.id = t.mahalle_id
            GROUP BY m.id
            HAVING COUNT(t.id) = 0 
        `;
        // Not: HAVING COUNT(t.id) = 0 demek, o mahallede o tesisten hiç yok demek.

        const [eksikMahalleler] = await db.query(sql);

        // 3. ADIM: Dinamik Maliyet Hesabı
        let toplamMaliyet = 0;
        let etkilenenNufus = 0;

        eksikMahalleler.forEach(mahalle => {
            let mahalleMaliyeti = secilen.fiyat;

            // EKSTRA ZEKA: Eğer mahalle çok kalabalıksa (20.000+), daha büyük tesis lazım (+%50 Maliyet)
            if (mahalle.toplam_nufus > 20000) {
                mahalleMaliyeti = mahalleMaliyeti * 1.5;
            }

            toplamMaliyet += mahalleMaliyeti;
            etkilenenNufus += mahalle.toplam_nufus;
        });

        // 4. ADIM: Mesafe Çarpanı (Kullanıcının Slider Hareketine Tepki)
        // Eğer kullanıcı "300m" gibi sıkı bir mesafe seçerse, maliyet artar (Daha sık tesis lazım varsayımı)
        if (mesafe && mesafe < 500) {
            toplamMaliyet = toplamMaliyet * 1.2; // %20 artış
        }

        // Sonucu Frontend'e Gönder
        res.json({
            success: true,
            ozet: {
                tesis: secilen.isim,
                eksik_mahalle_sayisi: eksikMahalleler.length,
                toplam_maliyet: toplamMaliyet,
                etkilenen_nufus: etkilenenNufus,
                para_birimi: "TL"
            },
            detaylar: eksikMahalleler // Hangi mahallelerde eksik olduğunu listelemek istersen
        });

    } catch (err) {
        console.error("Senaryo Hesaplama Hatası:", err);
        res.status(500).json({ error: err.message });
    }
});
// =================================================================

// Grafik API Uçları (Senin eski kodların aynen duruyor)
app.get('/api/grafik/dagilim', async (req, res) => {
    try {
        const [okul] = await db.query('SELECT COUNT(*) as sayi FROM okullar');
        const [saglik] = await db.query('SELECT COUNT(*) as sayi FROM saglik_ocaklari');
        const [park] = await db.query('SELECT COUNT(*) as sayi FROM parklar_yesil_alanlar');
        const [spor] = await db.query('SELECT COUNT(*) as sayi FROM spor_tesisleri');
        const [kutuphane] = await db.query('SELECT COUNT(*) as sayi FROM kutuphaneler');
        const [afet] = await db.query('SELECT COUNT(*) as sayi FROM afet_toplanma_alanlari');

        res.json({
            labels: ['Okullar', 'Sağlık Ocakları', 'Parklar & Yeşil Alan', 'Spor Tesisleri', 'Kütüphaneler', 'Afet Toplanma'],
            data: [okul[0].sayi, saglik[0].sayi, park[0].sayi, spor[0].sayi, kutuphane[0].sayi, afet[0].sayi]
        });
    } catch (err) { 
        res.status(500).json({error: err.message}); 
    }
});

app.get('/api/grafik/kritik', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT m.mahalle_adi, m.toplam_nufus,
                (CASE WHEN (SELECT COUNT(*) FROM okullar WHERE mahalle_id = m.id) = 0 THEN 1 ELSE 0 END +
                 CASE WHEN (SELECT COUNT(*) FROM saglik_ocaklari WHERE mahalle_id = m.id) = 0 THEN 1 ELSE 0 END +
                 CASE WHEN (SELECT COUNT(*) FROM parklar_yesil_alanlar WHERE mahalle_id = m.id) = 0 THEN 1 ELSE 0 END
                ) as eksik_sayi
            FROM mahalleler m HAVING eksik_sayi > 0
            ORDER BY eksik_sayi DESC LIMIT 5
        `);
        res.json({ labels: rows.map(r => r.mahalle_adi), data: rows.map(r => r.eksik_sayi) });
    } catch (err) { res.status(500).json({error: err.message}); }
});

app.get('/api/grafik/nufus', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT mahalle_adi, toplam_nufus as nufus FROM mahalleler ORDER BY toplam_nufus DESC LIMIT 5');
        res.json({ labels: rows.map(r => r.mahalle_adi), data: rows.map(r => Math.round(r.nufus / 1000)) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ve Akıllı Senaryo Modülü Aktif: http://localhost:${PORT}`);
});