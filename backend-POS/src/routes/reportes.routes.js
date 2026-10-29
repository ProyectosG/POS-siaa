const express = require('express');
const reportesController = require('../controllers/reportes.controller');
const { requireLevel, NIVELES } = require('../middleware/auth');

const router = express.Router();

// Reportes: Gerente o superior
router.get('/utilidad', requireLevel(NIVELES.GERENTE), reportesController.utilidad);

module.exports = router;
