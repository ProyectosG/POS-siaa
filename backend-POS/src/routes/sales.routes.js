const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const { requireLevel, requireCaja, NIVELES } = require('../middleware/auth');

// Lista completa de ventas (reporte): Gerente o superior
router.get('/', requireLevel(NIVELES.GERENTE), saleController.getAll);

// ✅ PRIMERO LAS RUTAS ESPECÍFICAS
router.get('/range', saleController.getTicketRange);

// ❗ AL FINAL las rutas dinámicas
router.get('/:id', saleController.getById);

// Cobrar exige una caja abierta (X-Caja-Token)
router.post('/', requireCaja, saleController.create);

module.exports = router;
