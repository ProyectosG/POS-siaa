const express = require('express');
const router = express.Router();
const controller = require('../controllers/settings.controller');
const { requireLevel, NIVELES } = require('../middleware/auth');

// Obtener configuración (sin la clave de precios)
router.get('/', controller.getSettings);

// Validar la clave para liberar precios
router.post('/validar-clave-precio', controller.validarClavePrecio);

// Respaldos automáticos: solo Administrador y SuperDeveloper (traen datos sensibles)
router.get('/respaldos', requireLevel(NIVELES.ADMIN), controller.listarRespaldos);
router.get('/respaldos/:nombre', requireLevel(NIVELES.ADMIN), controller.descargarRespaldo);

// Actualizar configuración: solo Administrador
router.put('/', requireLevel(NIVELES.ADMIN), controller.updateSettings);

module.exports = router;
