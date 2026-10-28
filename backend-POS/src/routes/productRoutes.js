const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireLevel, NIVELES } = require('../middleware/auth');

const soloGerente = requireLevel(NIVELES.GERENTE);

// Consulta: cualquier usuario con sesión
router.get('/barcode/:code', productController.getByBarcode);
router.get('/', productController.getAll);
router.get('/search', productController.searchByName);
router.get('/:id', productController.getById);

// Catálogo: Gerente o superior
router.post('/', soloGerente, productController.create);
router.put('/:id', soloGerente, productController.update);
router.delete('/:id', soloGerente, productController.delete);

module.exports = router;
