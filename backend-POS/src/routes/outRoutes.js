const express = require('express');
const router = express.Router();
const outController = require('../controllers/outController');

router.post('/', outController.create);
router.get('/', outController.getAll);
router.get('/:id', outController.getById);

module.exports = router;
