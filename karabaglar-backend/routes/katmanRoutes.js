// routes/katmanRoutes.js
const express = require('express');
const router = express.Router();
const katmanController = require('../controllers/katmanController');

// Birisi /api/katman/okullar dediğinde bu çalışacak
router.get('/:tabloAdi', katmanController.getKatmanData);

module.exports = router;