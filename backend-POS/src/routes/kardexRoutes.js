const express = require('express');
const router = express.Router();
const kardexController = require('../controllers/kardexController');
const { requireLevel, NIVELES } = require('../middleware/auth');

// Kardex: Gerente o superior. Solo consulta: los movimientos los registran
// ventas, entradas, salidas y altas de producto.
router.use(requireLevel(NIVELES.GERENTE));

// Obtener kardex por producto
router.get('/product/:product_id', kardexController.getByProduct);

module.exports = router;
