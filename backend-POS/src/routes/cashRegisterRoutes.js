const express = require('express');
const router = express.Router();
const cashRegisterController = require('../controllers/cashRegisterController');
const { requireLevel, NIVELES } = require('../middleware/auth');

const soloGerente = requireLevel(NIVELES.GERENTE);

// 🔥 ABRIR / VALIDAR CAJA (cualquier usuario con sesión)
router.post('/abrir', cashRegisterController.abrirCaja);

// 🔥 Buscar por numero_caja
router.get('/numero/:numero_caja', cashRegisterController.getByNumeroCaja);

// Consulta (nunca devuelve la clave de la caja)
router.get('/', cashRegisterController.getAll);
router.get('/:id', cashRegisterController.getById);

// Catálogo de cajas: Gerente o superior
router.post('/', soloGerente, cashRegisterController.create);
router.put('/:id', soloGerente, cashRegisterController.update);
router.delete('/:id', soloGerente, cashRegisterController.delete);

module.exports = router;
