const express = require('express');
const router = express.Router();
const entryController = require('../controllers/entryController');
const { requireLevel, NIVELES } = require('../middleware/auth');

// Entradas de inventario: Gerente o superior
router.use(requireLevel(NIVELES.GERENTE));

router.get('/', entryController.getAll);
router.get('/:id', entryController.getById);
router.post('/', entryController.create);

module.exports = router;
