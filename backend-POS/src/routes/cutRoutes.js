const express = require('express');
const cutController = require('../controllers/cutController');

const router = express.Router();

// Obtener corte X actual
router.get('/current', cutController.getCurrentCorte);

// Obtener corte Z actual
router.get('/current-z', cutController.getCurrentCorteZ);

// Crear nuevo corte (X o Z)
router.post('/', cutController.createCorte);

// Listar TODOS los cortes (con filtros por query params)
router.get('/', cutController.getAllCuts);

// Obtener un corte específico por ID
router.get('/:id', cutController.getCutById);

module.exports = router;