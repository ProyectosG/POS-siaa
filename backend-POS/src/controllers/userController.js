// controllers/userController.js (o el nombre que uses)
const db = require('../config/database'); // Asegúrate de que esto sea la conexión sqlite3 correcta

// GET /api/users - Listar todos los usuarios
exports.getAll = async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, nickname, full_name, phone, email, access_level, photo_url FROM users', [], (err, rows) => {
        if (err) {
          console.error('Error en db.all:', err);
          return reject(err);
        }
        resolve(rows);
      });
    });

    // Quitamos password por seguridad (nunca exponerlo)
    const safeUsers = users.map(user => {
      const { password, ...safe } = user;
      return safe;
    });

    res.json(safeUsers);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error interno al cargar usuarios' });
  }
};

// GET /api/users/:id
exports.getById = async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, nickname, full_name, phone, email, access_level, photo_url FROM users WHERE id = ?',
        [req.params.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/nickname/:nickname
exports.getByNickname = async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, nickname, full_name, phone, email, access_level, photo_url FROM users WHERE nickname = ?',
        [req.params.nickname],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users - Crear usuario
exports.create = async (req, res) => {
  try {
    const { nickname, full_name, phone, email, password, access_level = 'user', photo_url } = req.body;

    if (!nickname || !password) {
      return res.status(400).json({ error: 'nickname y password son requeridos' });
    }

    const id = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (nickname, full_name, phone, email, password, access_level, photo_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nickname, full_name || null, phone || null, email || null, password, access_level, photo_url || null],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.status(201).json({ id, message: 'Usuario creado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id - Actualizar usuario
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // No actualizar password si viene vacío
    if (data.password === '') delete data.password;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const fields = Object.keys(data)
      .filter(key => key !== 'id') // Evitar actualizar id
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);
    values.push(id);

    await new Promise((resolve, reject) => {
      db.run(`UPDATE users SET ${fields} WHERE id = ?`, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/:id
exports.delete = async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/:id/photo - Actualizar foto
exports.updatePhoto = async (req, res) => {
  try {
    const { photo_url } = req.body;

    if (!photo_url) {
      return res.status(400).json({ error: 'photo_url es requerido' });
    }

    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET photo_url = ? WHERE id = ?', [photo_url, req.params.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Foto actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/login
exports.login = async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) {
      return res.status(400).json({ error: 'nickname y password requeridos' });
    }

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE nickname = ?', [nickname], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user || user.password !== password) {  // ← En producción: usa bcrypt.compare
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Quitar password de la respuesta
    const { password: _, ...safeUser } = user;

    res.json({ user: safeUser, message: 'Login exitoso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;