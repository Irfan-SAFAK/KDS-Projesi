-- ============================================
-- DONATI ÖNERİLERİ TABLOSU VE TRIGGER OLUŞTURMA
-- ============================================
-- Bu SQL kodu phpMyAdmin'in SQL sekmesinde çalıştırılabilir.
-- Mevcut dashboard'u etkilemez, sadece yeni tablo ve trigger ekler.
-- ============================================

-- 1. ADIM: donati_onerileri tablosunu oluştur (Eğer yoksa)
CREATE TABLE IF NOT EXISTS `donati_onerileri` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mahalle_adi` varchar(100) COLLATE utf8mb4_turkish_ci NOT NULL,
  `onerilen_proje` text COLLATE utf8mb4_turkish_ci NOT NULL,
  `tarih` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mahalle_adi` (`mahalle_adi`),
  KEY `idx_tarih` (`tarih`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- 2. ADIM: Mevcut trigger'ı sil (varsa) ve yeniden oluştur
DROP TRIGGER IF EXISTS `bos_araziler_after_insert_trigger`;

DELIMITER $$

CREATE TRIGGER `bos_araziler_after_insert_trigger`
AFTER INSERT ON `bos_araziler`
FOR EACH ROW
BEGIN
    -- Yeni eklenen boş arazi için mahalle adını bul ve öneri kaydı ekle
    INSERT INTO `donati_onerileri` (`mahalle_adi`, `onerilen_proje`, `tarih`)
    SELECT 
        m.mahalle_adi,
        'Bu bölge için Park ve Yeşil Alan yapılması önerilmektedir',
        NOW()
    FROM `mahalleler` m
    WHERE m.id = NEW.mahalle_id;
END$$

DELIMITER ;

-- ============================================
-- NOTLAR:
-- ============================================
-- 1. Bu kod mevcut tabloları değiştirmez, sadece yeni tablo ve trigger ekler
-- 2. Trigger, bos_araziler tablosuna her yeni kayıt eklendiğinde otomatik çalışır
-- 3. Mahalle adı, mahalleler tablosundan JOIN ile alınır
-- 4. Tarih otomatik olarak ekleme zamanı kaydedilir
-- ============================================

