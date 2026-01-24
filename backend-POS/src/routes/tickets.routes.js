const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');

router.get('/:id/text', ticketController.getTicketText);
router.get('/:id/print', ticketController.printById);

module.exports = router;
