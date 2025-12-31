const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.get('/nickname/:nickname', userController.getByNickname);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);
router.patch('/:id/photo', userController.updatePhoto);
router.post('/login', userController.login);

module.exports = router;