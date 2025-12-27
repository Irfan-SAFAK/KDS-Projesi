// controllers/katmanController.js - AKILLI KARAR DESTEK MODU
const db = require('../db');

const izinVerilenTablolar = [
    'mahalleler',
    'okullar',
    'saglik_ocaklari',
    'spor_tesisleri',
    'kutuphaneler',
    'parklar_yesil_alanlar',
    'bos_araziler',
    'afet_toplanma_alanlari'
];

exports.getKatmanData = async (req, res) => {
    const tabloAdi = req.params.tabloAdi;

    if (!izinVerilenTablolar.includes(tabloAdi)) {
        return res.status(400).json({ error: 'Geçersiz tablo ismi veya yetkisiz erişim.' });
    }

    try {
        // ================================================
        // ADIM 1: PARAMETRELER TABLOSUNDAN HEDEFLERİ ÇEK
        // ================================================
        const [parametreler] = await db.query("SELECT * FROM parametreler");
        const kurallar = {
            okul: parametreler.find(p => p.parametre_adi === 'okul') || { deger: 5000 },
            saglik: parametreler.find(p => p.parametre_adi === 'saglik_ocagi') || { deger: 10000 },
            spor: parametreler.find(p => p.parametre_adi === 'spor_tesisi') || { deger: 15000 },
            kutuphane: parametreler.find(p => p.parametre_adi === 'kutuphane') || { deger: 25000 },
            park: parametreler.find(p => p.parametre_adi === 'park') || { deger: 2000 },
            afet: parametreler.find(p => p.parametre_adi === 'afet_toplanma_alani') || { deger: 1000 }
        };

        // ================================================
        // ADIM 2: MAHALLELER İÇİN ÖZEL AKILLI ANALİZ
        // ================================================
        if (tabloAdi === 'mahalleler') {
            const query = `
                SELECT 
                    m.mahalle_id,
                    m.mahalle_adi,
                    m.toplam_nufus,
                    ST_AsGeoJSON(m.sinirlar) as geojson,
                    (SELECT COUNT(*) FROM okullar WHERE mahalle_id = m.mahalle_id) as sayi_okul,
                    (SELECT COUNT(*) FROM saglik_ocaklari WHERE mahalle_id = m.mahalle_id) as sayi_saglik,
                    (SELECT COUNT(*) FROM spor_tesisleri WHERE mahalle_id = m.mahalle_id) as sayi_spor,
                    (SELECT COUNT(*) FROM kutuphaneler WHERE mahalle_id = m.mahalle_id) as sayi_kutuphane,
                    (SELECT COUNT(*) FROM parklar_yesil_alanlar WHERE mahalle_id = m.mahalle_id) as sayi_park,
                    (SELECT COUNT(*) FROM afet_toplanma_alanlari WHERE mahalle_id = m.mahalle_id) as sayi_afet
                FROM mahalleler m
            `;

            const [rows] = await db.query(query);

            const geoJsonResult = {
                type: "FeatureCollection",
                features: rows.map(row => {
                    if (!row.geojson) return null;

                    let geometry;
                    if (typeof row.geojson === 'string') {
                        geometry = JSON.parse(row.geojson);
                    } else {
                        geometry = row.geojson;
                    }

                    // ================================================
                    // AKILLI ANALİZ - DURUM BELİRLE
                    // ================================================
                    const nufus = row.toplam_nufus || 0;
                    const analizSonucu = analizEtMahalle(row, nufus, kurallar);

                    // Properties oluştur
                    const properties = {
                        mahalle_id: row.mahalle_id,
                        mahalle_adi: row.mahalle_adi,
                        toplam_nufus: row.toplam_nufus,
                        sayi_okul: row.sayi_okul,
                        sayi_saglik: row.sayi_saglik,
                        sayi_spor: row.sayi_spor,
                        sayi_kutuphane: row.sayi_kutuphane,
                        sayi_park: row.sayi_park,
                        sayi_afet: row.sayi_afet,
                        analiz_sonucu: analizSonucu // AKILLI ANALIZ SONUCU
                    };

                    return {
                        type: "Feature",
                        geometry: geometry,
                        properties: properties
                    };
                }).filter(f => f !== null)
            };

            console.log(`✅ Mahalleler akıllı analiz ile gönderildi (${geoJsonResult.features.length} mahalle)`);
            return res.json(geoJsonResult);
        }

        // ================================================
        // ADIM 3: DİĞER TABLOLAR İÇİN STANDART İŞLEM
        // ================================================
        const query = `SELECT *, ST_AsGeoJSON(koordinat) as geojson FROM ${tabloAdi}`;
        const [rows] = await db.query(query);

        const geoJsonResult = {
            type: "FeatureCollection",
            features: rows.map(row => {
                if (!row.geojson) return null;

                let geometry;
                if (typeof row.geojson === 'string') {
                    geometry = JSON.parse(row.geojson);
                } else {
                    geometry = row.geojson;
                }
                
                delete row.geojson;
                delete row.koordinat;

                return {
                    type: "Feature",
                    geometry: geometry,
                    properties: row 
                };
            }).filter(f => f !== null)
        };

        res.json(geoJsonResult);

    } catch (error) {
        console.error("Veritabanı Hatası:", error);
        res.status(500).json({ error: 'Veriler çekilirken bir sorun oluştu.' });
    }
};

// ================================================
// AKILLI ANALİZ FONKSİYONU
// ================================================
function analizEtMahalle(row, nufus, kurallar) {
    const yetersizlikler = [];
    let kritikSeviye = 0; // 0: NORMAL, 1-2: UYARI, 3+: KRİTİK

    // OKUL ANALİZİ (Nüfus > 3000 ise kontrol et)
    if (nufus > 3000 && row.sayi_okul < 1) {
        yetersizlikler.push('Okul Yetersiz');
        kritikSeviye += 2; // Okul çok önemli
    }

    // SAĞLIK ANALİZİ (Nüfus > 2000 ise kontrol et)
    if (nufus > 2000 && row.sayi_saglik < 1) {
        yetersizlikler.push('Sağlık Ocağı Yetersiz');
        kritikSeviye += 3; // Sağlık en kritik
    }

    // PARK ANALİZİ (Her mahallede olmalı)
    if (row.sayi_park < 1) {
        yetersizlikler.push('Park Yetersiz');
        kritikSeviye += 1;
    }

    // AFET ALANI ANALİZİ (Nüfus > 1000 ise kontrol et)
    if (nufus > 1000 && row.sayi_afet < 1) {
        yetersizlikler.push('Afet Alanı Yetersiz');
        kritikSeviye += 2;
    }

    // SPOR TESİSİ ANALİZİ (Nüfus > 5000 ise kontrol et)
    if (nufus > 5000 && row.sayi_spor < 1) {
        yetersizlikler.push('Spor Tesisi Yetersiz');
        kritikSeviye += 1;
    }

    // KÜTÜPHANE ANALİZİ (Nüfus > 5000 ise kontrol et)
    if (nufus > 5000 && row.sayi_kutuphane < 1) {
        yetersizlikler.push('Kütüphane Yetersiz');
        kritikSeviye += 1;
    }

    // DURUM BELİRLE
    let durum = 'NORMAL';
    let renk = '#10b981'; // Yeşil
    let aciklama = 'Tüm donatılar yeterli seviyede';

    if (kritikSeviye >= 4) {
        durum = 'KRİTİK';
        renk = '#ef4444'; // Kırmızı
        aciklama = 'Acil müdahale gerekli: ' + yetersizlikler.join(', ');
    } else if (kritikSeviye >= 1) {
        durum = 'UYARI';
        renk = '#f59e0b'; // Turuncu
        aciklama = 'İyileştirme önerilir: ' + yetersizlikler.join(', ');
    }

    return {
        durum: durum,
        renk: renk,
        kritik_seviye: kritikSeviye,
        yetersizlikler: yetersizlikler,
        aciklama: aciklama,
        toplam_tesis: (row.sayi_okul || 0) + (row.sayi_saglik || 0) + 
                      (row.sayi_spor || 0) + (row.sayi_kutuphane || 0) + 
                      (row.sayi_park || 0) + (row.sayi_afet || 0)
    };
}