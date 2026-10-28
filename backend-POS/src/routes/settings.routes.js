const express = require('express');
const router = express.Router();
const controller = require('../controllers/settings.controller');
const { requireLevel, NIVELES } = require('../middleware/auth');

// Obtener configuración (sin la clave de precios)
router.get('/', controller.getSettings);

// Validar la clave para liberar precios
router.post('/validar-clave-precio', controller.validarClavePrecio);

// Actualizar configuración: solo Administrador
router.put('/', requireLevel(NIVELES.ADMIN), controller.updateSettings);

module.exports = router;
