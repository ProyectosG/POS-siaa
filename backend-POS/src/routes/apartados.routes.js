const express = require('express');
const router = express.Router();
const controller = require('../controllers/apartados.controller');

router.get('/:customerId', controller.getApartadosByCustomer);
router.post('/abono', controller.registrarAbono);

module.exports = router;
