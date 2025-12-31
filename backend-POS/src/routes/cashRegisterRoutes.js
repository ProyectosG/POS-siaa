const express = require('express');
const router = express.Router();
const cashRegisterController = require('../controllers/cashRegisterController');

router.get('/', cashRegisterController.getAll);
router.get('/:id', cashRegisterController.getById);
router.post('/', cashRegisterController.create);
router.put('/:id', cashRegisterController.update);
router.delete('/:id', cashRegisterController.delete);

module.exports = router;