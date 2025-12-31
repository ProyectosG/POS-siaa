const User = require('../models/User');

exports.getAll = async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByNickname = async (req, res) => {
  try {
    const user = await User.findByNickname(req.params.nickname);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nickname, full_name, phone, email, password, access_level, photo_url } = req.body;
    if (!nickname || !password) return res.status(400).json({ error: 'nickname y password requeridos' });

    const id = await User.create({ nickname, full_name, phone, email, password, access_level, photo_url });
    res.status(201).json({ id, message: 'Usuario creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.password === '') delete data.password; // opcional: no actualizar si vacío

    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    values.push(id);

    await db.run(`UPDATE users SET ${fields} WHERE id = ?`, values);
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await db.run(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePhoto = async (req, res) => {
  try {
    await User.updatePhoto(req.params.id, req.body.photo_url);
    res.json({ message: 'Foto actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ error: 'nickname y password requeridos' });

    const user = await User.findByNickname(nickname);
    if (!user || user.password !== password) {  // Mejora: usa bcrypt en producción
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Quita password antes de enviar
    delete user.password;
    res.json({ user, message: 'Login exitoso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const db = require('../config/database'); // agregar arriba