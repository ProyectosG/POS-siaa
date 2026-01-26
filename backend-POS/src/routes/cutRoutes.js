// src/routes/cutRoutes.js
const express = require('express');
const router = express.Router();

// Importar controladores necesarios
const cutController = require('../controllers/cutController');
const ticketController = require('../controllers/ticket.controller');

// Rutas principales de cortes
router.get('/current', cutController.getCurrentCorte);    // Obtiene los datos del corte actual (X)
router.post('/', cutController.createCorte);              // Registra un nuevo corte (X o Z)

// Rutas para obtener cortes (opcionales, descomentadas cuando las necesites)
// router.get('/', cutController.getAll);                 // Lista todos los cortes
// router.get('/:id', cutController.getById);             // Obtiene un corte específico por ID

// Rutas para impresión de tickets de cortes
router.get('/print/current', ticketController.printCorteCurrent);   // Imprime el corte actual (X)
router.get('/print/:id', ticketController.printCorteById);          // Imprime un corte específico por ID

module.exports = router;