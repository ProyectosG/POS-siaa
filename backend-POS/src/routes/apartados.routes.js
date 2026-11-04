const express = require('express');
const router = express.Router();
const controller = require('../controllers/apartados.controller');
const { requireCaja } = require('../middleware/auth');

router.get('/:customerId', controller.getApartadosByCustomer);
// Cobrar exige una caja abierta: el abono cuenta en la caja que lo cobró
router.post('/abono', requireCaja, controller.registrarAbono);

module.exports = router;
