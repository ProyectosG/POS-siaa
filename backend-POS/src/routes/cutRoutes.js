const express = require('express');
const cutController = require('../controllers/cutController');
const ticketController = require('../controllers/ticket.controller');
const { requireLevel, tieneNivel, NIVELES } = require('../middleware/auth');

const router = express.Router();
const soloGerente = requireLevel(NIVELES.GERENTE);

// El corte X lo hace cualquiera; el Z solo Gerente o superior
const permisoPorTipoCorte = (req, res, next) => {
  const tipo = String((req.body && req.body.type) || '').toUpperCase();
  if (tipo === 'X') return next();
  if (tipo === 'Z' && tieneNivel(req.user, NIVELES.GERENTE)) return next();
  if (tipo === 'Z') return res.status(403).json({ error: 'Solo Gerente o superior puede hacer el corte Z' });
  return res.status(400).json({ error: 'type debe ser X o Z' });
};

// Obtener corte X actual
router.get('/current', cutController.getCurrentCorte);

// Obtener corte Z actual
router.get('/current-z', soloGerente, cutController.getCurrentCorteZ);

// Imprimir el corte en curso: ?tipo=X (cualquiera) o ?tipo=Z (Gerente o superior)
const permisoImpresion = (req, res, next) =>
  req.query.tipo === 'Z' ? soloGerente(req, res, next) : next();
router.get('/print/current', permisoImpresion, ticketController.printCorteCurrent);

// Crear nuevo corte (X o Z)
router.post('/', permisoPorTipoCorte, cutController.createCorte);

// Reporte de cortes: Gerente o superior
router.get('/', soloGerente, cutController.getAllCuts);
router.get('/:id', soloGerente, cutController.getCutById);

module.exports = router;
