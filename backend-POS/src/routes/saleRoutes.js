// src/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.get('/', saleController.getAll);
router.get('/:id', saleController.getById);
router.post('/', saleController.create);

module.exports = router;