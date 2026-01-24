const express = require('express');
const router = express.Router();
const cutController = require('../controllers/cutController');

// Rutas principales de cortes
router.get('/current', cutController.getCurrentCorte);    // ← Para calcular el corte actual (X)
router.post('/', cutController.createCorte);              // ← Para registrar el corte X o Z

// Si más adelante necesitas más rutas (ej. getById, getAll, etc.)
// router.get('/', cutController.getAll);
// router.get('/:id', cutController.getById);

module.exports = router;