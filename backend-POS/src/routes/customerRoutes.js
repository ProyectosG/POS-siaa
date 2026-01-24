const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const customerAccount = require('../controllers/customerAccount.controller');

router.get('/:id/estado-cuenta', customerAccount.getEstadoCuenta);

router.get('/', customerController.getAll);
router.get('/:id/statement', customerController.getStatement);
router.get('/:id/balance-history', customerController.getBalanceHistory);
router.get('/search/:q', customerController.search);
router.get('/:id', customerController.getById);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.delete);

module.exports = router;