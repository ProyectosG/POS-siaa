const express = require('express');
const router = express.Router();
const controller = require('../controllers/settings.controller');

// Obtener configuración
router.get('/', controller.getSettings);

// Actualizar configuración
router.put('/', controller.updateSettings);

module.exports = router;
