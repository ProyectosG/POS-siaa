const express = require('express');
const router = express.Router();
const controller = require('../controllers/superdev.controller');

// POST /api/superdev/entrar → token de SuperDeveloper (45 min)
router.post('/entrar', controller.entrar);

module.exports = router;
