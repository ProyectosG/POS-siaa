const express = require('express');
const router = express.Router();
const outController = require('../controllers/outController');
const { requireLevel, NIVELES } = require('../middleware/auth');

// Salidas de inventario: Gerente o superior
router.use(requireLevel(NIVELES.GERENTE));

router.post('/', outController.create);
router.get('/', outController.getAll);
router.get('/:id', outController.getById);

module.exports = router;
