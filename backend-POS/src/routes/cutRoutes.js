const express = require('express');
const cutController = require('../controllers/cutController');
const ticketController = require('../controllers/ticket.controller');
const { requireLevel, requireCaja, tieneNivel, NIVELES } = require('../middleware/auth');

const router = express.Router();
const soloGerente = requireLevel(NIVELES.GERENTE);
const soloAdmin = requireLevel(NIVELES.ADMIN);

// El corte X lo hace cualquiera; el Z solo Gerente o superior
const permisoPorTipoCorte = (req, res, next) => {
  const tipo = String((req.body && req.body.type) || '').toUpperCase();
  if (tipo === 'X') return next();
  if (tipo === 'Z' && tieneNivel(req.user, NIVELES.GERENTE)) return next();
  if (tipo === 'Z') return res.status(403).json({ error: 'Solo Gerente o superior puede hacer el corte Z' });
  return res.status(400).json({ error: 'type debe ser X o Z' });
};

// Corte X y Corte Z General: solo Administrador, sin token de caja.
// Antes de las rutas con /:id
router.get('/general/current', soloAdmin, cutController.getGeneralActual);
router.get('/general/text', soloAdmin, ticketController.getGeneralText);
router.get('/general/print', soloAdmin, ticketController.printGeneralCurrent);
router.post('/general', soloAdmin, cutController.createGeneral);

// Obtener corte X actual de la caja del token
router.get('/current', requireCaja, cutController.getCurrentCorte);

// Obtener corte Z actual de la caja del token
router.get('/current-z', soloGerente, requireCaja, cutController.getCurrentCorteZ);

// Imprimir el corte en curso: ?tipo=X (cualquiera) o ?tipo=Z (Gerente o superior)
const permisoImpresion = (req, res, next) =>
  req.query.tipo === 'Z' ? soloGerente(req, res, next) : next();
router.get('/print/current', permisoImpresion, requireCaja, ticketController.printCorteCurrent);

// Crear nuevo corte (X o Z) de la caja del token
router.post('/', permisoPorTipoCorte, requireCaja, cutController.createCorte);

// Reporte de cortes: Gerente o superior (los generales, solo el Administrador)
router.get('/', soloGerente, cutController.getAllCuts);
router.get('/:id', soloGerente, cutController.protegerGeneral, cutController.getCutById);

// Reimprimir un corte guardado (con los montos con que se cerró): vista previa e impresión
router.get('/:id/text', soloGerente, cutController.protegerGeneral, ticketController.getCorteText);
router.get('/:id/print', soloGerente, cutController.protegerGeneral, ticketController.printCorteById);

module.exports = router;
