const express = require('express');
const router = express.Router();
const cashRegisterController = require('../controllers/cashRegisterController');

// existentes
router.get('/', cashRegisterController.getAll);
router.get('/:id', cashRegisterController.getById);
router.post('/', cashRegisterController.create);
router.put('/:id', cashRegisterController.update);
router.delete('/:id', cashRegisterController.delete);

// 🔥 ABRIR / VALIDAR CAJA
router.post('/abrir', cashRegisterController.abrirCaja);

// 🔥 NUEVA RUTA: buscar por numero_caja
router.get('/numero/:numero_caja', cashRegisterController.getByNumeroCaja);

module.exports = router;
