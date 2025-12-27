// routes/parametreRoutes.js
const express = require('express');
const router = express.Router();
const parametreController = require('../controllers/parametreController');

// GET /api/parametreler - Tüm parametreleri getir
router.get('/', parametreController.getAllParametreler);

// POST /api/parametreler/guncelle - Parametreleri güncelle
router.post('/guncelle', parametreController.guncelleParametreler);

module.exports = router;

