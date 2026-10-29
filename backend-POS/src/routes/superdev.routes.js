const express = require('express');
const router = express.Router();
const controller = require('../controllers/superdev.controller');
const { requireSuperDev } = require('../middleware/auth');

// POST /api/superdev/entrar → token de SuperDeveloper (45 min)
router.post('/entrar', controller.entrar);

// GET /api/superdev/respaldo → descarga un respaldo de la base (solo SuperDeveloper)
router.get('/respaldo', requireSuperDev, controller.respaldo);

module.exports = router;
