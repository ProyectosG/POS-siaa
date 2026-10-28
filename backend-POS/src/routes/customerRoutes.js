const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const customerAccount = require('../controllers/customerAccount.controller');
const { requireLevel, NIVELES } = require('../middleware/auth');

const soloGerente = requireLevel(NIVELES.GERENTE);

// Consulta y alta: cualquier usuario con sesión
router.get('/:id/estado-cuenta', customerAccount.getEstadoCuenta);
router.get('/', customerController.getAll);
router.get('/:id/statement', customerController.getStatement);
router.get('/:id/balance-history', customerController.getBalanceHistory);
router.get('/search/:q', customerController.search);
router.get('/:id', customerController.getById);
router.post('/', customerController.create);

// Edición y baja: Gerente o superior
router.put('/:id', soloGerente, customerController.update);
router.delete('/:id', soloGerente, customerController.delete);

module.exports = router;
