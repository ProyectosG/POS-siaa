const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 🔥 ESPECÍFICAS PRIMERO
router.post('/login', userController.login);
router.get('/nickname/:nickname', userController.getByNickname);
router.patch('/:id/photo', userController.updatePhoto);

// 🔹 CRUD
router.get('/', userController.getAll);
router.post('/', userController.create);
router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

module.exports = router;
