const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireLevel, tieneNivel, NIVELES } = require('../middleware/auth');

const soloAdmin = requireLevel(NIVELES.ADMIN);

// El propio usuario o un Administrador
const propioOAdmin = (req, res, next) => {
  const esPropio =
    (req.params.id !== undefined && String(req.user.id) === String(req.params.id)) ||
    (req.params.nickname !== undefined && req.user.nickname === req.params.nickname);
  if (esPropio || tieneNivel(req.user, NIVELES.ADMIN)) return next();
  return res.status(403).json({ error: 'No tienes permiso para esta acción' });
};

// 🔥 ESPECÍFICAS PRIMERO
router.post('/login', userController.login); // pública (ver server.js)
router.get('/nickname/:nickname', propioOAdmin, userController.getByNickname);
router.patch('/:id/photo', propioOAdmin, userController.updatePhoto);

// 🔹 CRUD: solo Administrador
router.get('/', soloAdmin, userController.getAll);
router.post('/', soloAdmin, userController.create);
router.get('/:id', soloAdmin, userController.getById);
router.put('/:id', soloAdmin, userController.update);
router.delete('/:id', soloAdmin, userController.delete);

module.exports = router;
