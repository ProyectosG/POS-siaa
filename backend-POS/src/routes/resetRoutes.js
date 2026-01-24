const express = require('express');
const router = express.Router();
const resetController = require('../controllers/resetController');

// POST /api/reset/tables → Resetear tablas selectivas
router.post('/tables', resetController.resetTables);

// POST /api/reset/balances → Resetear saldos y stocks
router.post('/balances', resetController.resetBalances);

module.exports = router;