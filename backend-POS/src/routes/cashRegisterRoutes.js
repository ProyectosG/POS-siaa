const express = require('express');
const router = express.Router();
const cashRegisterController = require('../controllers/cashRegisterController');
const { requireLevel, NIVELES } = require('../middleware/auth');

const soloGerente = requireLevel(NIVELES.GERENTE);

// 🔥 ABRIR / VALIDAR CAJA (cualquier usuario con sesión)
router.post('/abrir', cashRegisterController.abrirCaja);

// Consulta (nunca devuelve la clave de la caja): Gerente o superior, como el
// catálogo; un Cajero no necesita saber qué números de caja existen
router.get('/', soloGerente, cashRegisterController.getAll);
router.get('/:id', soloGerente, cashRegisterController.getById);

// Catálogo de cajas: Gerente o superior
router.post('/', soloGerente, cashRegisterController.create);
router.put('/:id', soloGerente, cashRegisterController.update);
router.delete('/:id', soloGerente, cashRegisterController.delete);

module.exports = router;
