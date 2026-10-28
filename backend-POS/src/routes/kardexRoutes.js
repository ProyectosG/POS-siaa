const express = require('express');
const router = express.Router();
const kardexController = require('../controllers/kardexController');
const { requireLevel, NIVELES } = require('../middleware/auth');

// Kardex: Gerente o superior
router.use(requireLevel(NIVELES.GERENTE));

// Registrar movimiento en kardex
router.post('/', kardexController.createMovement);

// Obtener kardex por producto
router.get('/product/:product_id', kardexController.getByProduct);

module.exports = router;
