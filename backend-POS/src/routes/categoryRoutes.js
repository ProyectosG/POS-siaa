const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { requireLevel, NIVELES } = require('../middleware/auth');

const soloGerente = requireLevel(NIVELES.GERENTE);

router.get('/', categoryController.getAll);
router.post('/', soloGerente, categoryController.create);
router.put('/:id', soloGerente, categoryController.update);
router.delete('/:id', soloGerente, categoryController.delete);

module.exports = router;
