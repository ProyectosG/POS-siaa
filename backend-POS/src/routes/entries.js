// routes/entries.js
const express = require('express');
const router = express.Router();
const entryController = require('../controllers/entryController');

router.get('/', entryController.getAll);
router.get('/:id', entryController.getById);
router.post('/', entryController.create);

module.exports = router;