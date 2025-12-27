// controllers/dashboardController.js
const db = require('../db');

exports.getMahalleAnalizi = async (req, res) => {
    try {
        // Parametreleri çek
        const [parametreler] = await db.query("SELECT * FROM parametreler");

        // Kuralları eşleştiriyoruz
        const kurallar = {
            okul: parametreler.find(p => p.parametre_adi === 'okul') || { deger: 5000 },
            saglik: parametreler.find(p => p.parametre_adi === 'saglik_ocagi') || { deger: 10000 },
            spor: parametreler.find(p => p.parametre_adi === 'spor_tesisi') || { deger: 15000 },
            kutuphane: parametreler.find(p => p.parametre_adi === 'kutuphane') || { deger: 25000 },
            park: parametreler.find(p => p.parametre_adi === 'park') || { deger: 2000 },
            afet: parametreler.find(p => p.parametre_adi === 'afet_toplanma_alani') || { deger: 1000 },
            bos_arazi: { deger: 0 } 
        };

        // DÜZELTİLMİŞ SQL SORGUSU (m.id kullanıldı)
        const sqlSorgusu = `
            SELECT 
                m.id as mahalle_id, 
                m.mahalle_adi, 
                m.toplam_nufus,
                ST_AsGeoJSON(m.sinirlar) as sinirlar,
                COUNT(DISTINCT o.id) as sayi_okul,
                COUNT(DISTINCT s.id) as sayi_saglik,
                COUNT(DISTINCT sp.id) as sayi_spor,
                COUNT(DISTINCT k.id) as sayi_kutuphane,
                COUNT(DISTINCT p.id) as sayi_park,
                COUNT(DISTINCT b.id) as sayi_bos_arazi,
                COUNT(DISTINCT a.id) as sayi_afet,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'ad', o2.okul_adi,
                        'lat', ST_Y(o2.koordinat),
                        'lon', ST_X(o2.koordinat),
                        'tur', 'okul'
                    )
                ) FROM okullar o2 WHERE o2.mahalle_id = m.id) as okul_detaylari,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'ad', s2.kurum_adi,
                        'lat', ST_Y(s2.koordinat),
                        'lon', ST_X(s2.koordinat),
                        'tur', 'saglik'
                    )
                ) FROM saglik_ocaklari s2 WHERE s2.mahalle_id = m.id) as saglik_detaylari,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'ad', sp2.tesis_adi,
                        'lat', ST_Y(sp2.koordinat),
                        'lon', ST_X(sp2.koordinat),
                        'tur', 'spor'
                    )
                ) FROM spor_tesisleri sp2 WHERE sp2.mahalle_id = m.id) as spor_detaylari,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'ad', k2.kutuphane_adi,
                        'lat', ST_Y(k2.koordinat),
                        'lon', ST_X(k2.koordinat),
                        'tur', 'kutuphane'
                    )
                ) FROM kutuphaneler k2 WHERE k2.mahalle_id = m.id) as kutuphane_detaylari,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'ad', p2.park_adi,
                        'lat', ST_Y(p2.koordinat),
                        'lon', ST_X(p2.koordinat),
                        'tur', 'park'
                    )
                ) FROM parklar_yesil_alanlar p2 WHERE p2.mahalle_id = m.id) as park_detaylari,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'ad', a2.alan_kodu,
                        'lat', ST_Y(a2.koordinat),
                        'lon', ST_X(a2.koordinat),
                        'tur', 'afet'
                    )
                ) FROM afet_toplanma_alanlari a2 WHERE a2.mahalle_id = m.id) as afet_detaylari,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'ad', b2.parsel_no,
                        'lat', ST_Y(ST_Centroid(ST_SRID(b2.sinirlar, 0))),
                        'lon', ST_X(ST_Centroid(ST_SRID(b2.sinirlar, 0))),
                        'tur', 'bos_arazi'
                    )
                ) FROM bos_araziler b2 WHERE b2.mahalle_id = m.id) as bos_arazi_detaylari
            FROM mahalleler m
            LEFT JOIN okullar o ON m.id = o.mahalle_id
            LEFT JOIN saglik_ocaklari s ON m.id = s.mahalle_id
            LEFT JOIN spor_tesisleri sp ON m.id = sp.mahalle_id
            LEFT JOIN kutuphaneler k ON m.id = k.mahalle_id
            LEFT JOIN parklar_yesil_alanlar p ON m.id = p.mahalle_id
            LEFT JOIN bos_araziler b ON m.id = b.mahalle_id
            LEFT JOIN afet_toplanma_alanlari a ON m.id = a.mahalle_id
            GROUP BY m.id
        `;

        const [mahalleSonuclari] = await db.query(sqlSorgusu);

        const analizRaporu = mahalleSonuclari.map(mahalle => {
            // JSON detaylarını parse et
            const parseDetay = (detay) => {
                if (!detay) return [];
                if (typeof detay === 'string') {
                    try {
                        return JSON.parse(detay);
                    } catch (e) {
                        return [];
                    }
                }
                return detay;
            };

            // ANALİZ FONKSİYONLARI
            const analizOkul = (mevcut, liste) => {
                if (mevcut < 1 && mahalle.toplam_nufus > 3000) {
                    return { mevcut, gereken: 1, durum: "YETERSİZ", liste };
                } else if (mevcut < 1) {
                    return { mevcut, durum: "GEREK YOK", liste };
                } else {
                    return { mevcut, durum: "YETERLİ", liste };
                }
            };

            const analizSaglik = (mevcut, liste) => {
                if (mevcut < 1 && mahalle.toplam_nufus > 2000) {
                    return { mevcut, gereken: 1, durum: "YETERSİZ", liste };
                } else if (mevcut < 1) {
                    return { mevcut, durum: "GEREK YOK", liste };
                } else {
                    return { mevcut, durum: "YETERLİ", liste };
                }
            };

            const analizSporKutuphane = (mevcut, liste, tip) => {
                if (mevcut < 1 && mahalle.toplam_nufus > 5000) {
                    return { mevcut, gereken: 1, durum: "YETERSİZ", liste };
                } else if (mevcut < 1) {
                    return { mevcut, durum: "GEREK YOK", liste };
                } else {
                    return { mevcut, durum: "YETERLİ", liste };
                }
            };

            const analizPark = (mevcut, liste) => {
                if (mevcut < 1) {
                    return { mevcut, gereken: 1, durum: "YETERSİZ", liste };
                } else {
                    return { mevcut, durum: "YETERLİ", liste };
                }
            };

            const analizAfet = (mevcut, liste) => {
                if (mevcut < 1 && mahalle.toplam_nufus > 1000) {
                    return { mevcut, gereken: 1, durum: "YETERSİZ", liste };
                } else if (mevcut < 1) {
                    return { mevcut, durum: "GEREK YOK", liste };
                } else {
                    return { mevcut, durum: "YETERLİ", liste };
                }
            };

            return {
                mahalle_adi: mahalle.mahalle_adi,
                nufus: mahalle.toplam_nufus,
                sinirlar: mahalle.sinirlar ? (typeof mahalle.sinirlar === 'string' ? JSON.parse(mahalle.sinirlar) : mahalle.sinirlar) : null,
                analiz: {
                    okullar: analizOkul(mahalle.sayi_okul, parseDetay(mahalle.okul_detaylari)),
                    saglik_ocaklari: analizSaglik(mahalle.sayi_saglik, parseDetay(mahalle.saglik_detaylari)),
                    spor_tesisleri: analizSporKutuphane(mahalle.sayi_spor, parseDetay(mahalle.spor_detaylari), 'spor'),
                    kutuphaneler: analizSporKutuphane(mahalle.sayi_kutuphane, parseDetay(mahalle.kutuphane_detaylari), 'kutuphane'),
                    parklar_yesil_alanlar: analizPark(mahalle.sayi_park, parseDetay(mahalle.park_detaylari)),
                    afet_toplanma_alanlari: analizAfet(mahalle.sayi_afet, parseDetay(mahalle.afet_detaylari)),
                    bos_araziler: { 
                        mevcut: mahalle.sayi_bos_arazi, 
                        durum: "BİLGİ",
                        not: "Potansiyel alan.",
                        liste: parseDetay(mahalle.bos_arazi_detaylari)
                    }
                }
            };
        });

        res.json(analizRaporu);

    } catch (error) {
        console.error("Kapsamlı Analiz Hatası:", error);
        res.status(500).json({ error: 'Analiz modülü hatası.' });
    }
};