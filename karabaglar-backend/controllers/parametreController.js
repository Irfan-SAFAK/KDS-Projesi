// controllers/parametreController.js
const db = require('../db');

// Tüm parametreleri getir
exports.getAllParametreler = async (req, res) => {
    try {
        const [parametreler] = await db.query(
            'SELECT id, parametre_adi, deger, birim, aciklama FROM parametreler ORDER BY parametre_adi'
        );
        
        res.json({
            success: true,
            data: parametreler
        });
    } catch (error) {
        console.error('Parametreler Getirme Hatası:', error);
        res.status(500).json({ 
            success: false,
            error: 'Parametreler getirilirken bir hata oluştu.' 
        });
    }
};

// Parametreleri toplu güncelle
exports.guncelleParametreler = async (req, res) => {
    try {
        const { parametreler } = req.body;

        if (!parametreler || !Array.isArray(parametreler)) {
            return res.status(400).json({ 
                success: false,
                error: 'Geçersiz veri formatı. Parametreler dizisi bekleniyor.' 
            });
        }

        // Transaction başlat (hepsi başarılı olursa kaydet)
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Her parametreyi güncelle
            for (const param of parametreler) {
                if (!param.id || param.deger === undefined) {
                    throw new Error('Her parametre için id ve deger gerekli.');
                }

                await connection.query(
                    'UPDATE parametreler SET deger = ? WHERE id = ?',
                    [param.deger, param.id]
                );
            }

            await connection.commit();
            
            res.json({
                success: true,
                message: 'Parametreler başarıyla güncellendi.',
                updatedCount: parametreler.length
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Parametre Güncelleme Hatası:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Parametreler güncellenirken bir hata oluştu.' 
        });
    }
};

