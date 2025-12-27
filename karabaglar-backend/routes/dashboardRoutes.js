// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
// Controller dosyasını çağırıyoruz (Bir üst klasördeki controllers'a git)
const dashboardController = require('../controllers/dashboardController');

// Adres: /api/dashboard/analiz
// EĞER BURADA HATA ALIRSAN: dashboardController dosyasında 'getMahalleAnalizi' yok demektir.
router.get('/analiz', dashboardController.getMahalleAnalizi);

module.exports = router; 
// YUKARIDAKİ SATIR ÇOK ÖNEMLİ: Bunu yazmazsan server.js dosyası "handler must be a function" hatası verir!