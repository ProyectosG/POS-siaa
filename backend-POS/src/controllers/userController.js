// controllers/userController.js
const db = require('../config/database');
const { firmarToken, NIVELES } = require('../middleware/auth');
const { hashear, comparar, esHash } = require('../utils/seguridad');

// Columnas que se pueden devolver (nunca password)
const COLUMNAS_PUBLICAS = 'id, nickname, full_name, phone, email, access_level, photo_url';

// Campos que se pueden modificar en PUT /api/users/:id (el resto se ignora)
const CAMPOS_EDITABLES = ['nickname', 'full_name', 'phone', 'email', 'password', 'access_level', 'photo_url'];

// Niveles válidos: 1 Cajero, 50 Supervisor, 90 Gerente, 99 Administrador
const NIVELES_VALIDOS = Object.values(NIVELES);

// Hash de relleno para que un usuario inexistente tarde lo mismo en el login
const HASH_RELLENO = require('bcrypt').hashSync('usuario-inexistente', 10);

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    })
  );

const contarAdministradores = async () => {
  const row = await dbGet('SELECT COUNT(*) AS total FROM users WHERE access_level >= ?', [NIVELES.ADMIN]);
  return row.total;
};

// GET /api/users - Listar todos los usuarios
exports.getAll = async (req, res) => {
  try {
    const users = await dbAll(`SELECT ${COLUMNAS_PUBLICAS} FROM users`);
    res.json(users);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error interno al cargar usuarios' });
  }
};

// GET /api/users/:id
exports.getById = async (req, res) => {
  try {
    const user = await dbGet(`SELECT ${COLUMNAS_PUBLICAS} FROM users WHERE id = ?`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/nickname/:nickname
exports.getByNickname = async (req, res) => {
  try {
    const user = await dbGet(`SELECT ${COLUMNAS_PUBLICAS} FROM users WHERE nickname = ?`, [req.params.nickname]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users - Crear usuario (solo Administrador, ver rutas)
exports.create = async (req, res) => {
  try {
    const { nickname, full_name, phone, email, password, photo_url } = req.body;
    const access_level = Number(req.body.access_level ?? NIVELES.CAJERO);

    if (!nickname || !password) {
      return res.status(400).json({ error: 'nickname y password son requeridos' });
    }
    if (!NIVELES_VALIDOS.includes(access_level)) {
      return res.status(400).json({ error: `access_level inválido. Permitidos: ${NIVELES_VALIDOS.join(', ')}` });
    }

    const passwordHash = await hashear(password);

    const result = await dbRun(
      `INSERT INTO users (nickname, full_name, phone, email, password, access_level, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nickname, full_name || null, phone || null, email || null, passwordHash, access_level, photo_url || null]
    );

    res.status(201).json({ id: result.lastID, message: 'Usuario creado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id - Actualizar usuario
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    // Solo campos de la lista fija; lo demás se ignora
    const data = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (req.body[campo] !== undefined) data[campo] = req.body[campo];
    }

    // No actualizar password si viene vacío
    if (data.password === '' || data.password === null) delete data.password;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const actual = await dbGet('SELECT id, access_level FROM users WHERE id = ?', [id]);
    if (!actual) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (data.access_level !== undefined) {
      const nuevoNivel = Number(data.access_level);

      if (nuevoNivel !== Number(actual.access_level)) {
        // Solo un Administrador cambia niveles
        if (!(req.user.superdev || req.user.access_level >= NIVELES.ADMIN)) {
          return res.status(403).json({ error: 'Solo un Administrador puede cambiar el nivel de acceso' });
        }
        // Nadie cambia su propio nivel
        if (String(req.user.id) === String(id)) {
          return res.status(403).json({ error: 'No puedes cambiar tu propio nivel de acceso' });
        }
        if (!NIVELES_VALIDOS.includes(nuevoNivel)) {
          return res.status(400).json({ error: `access_level inválido. Permitidos: ${NIVELES_VALIDOS.join(', ')}` });
        }
        // Siempre debe quedar al menos un Administrador
        if (actual.access_level >= NIVELES.ADMIN && nuevoNivel < NIVELES.ADMIN && (await contarAdministradores()) <= 1) {
          return res.status(409).json({ error: 'No se puede bajar de nivel al último Administrador' });
        }
      }
      data.access_level = nuevoNivel;
    }

    if (data.password !== undefined) {
      data.password = esHash(data.password) ? data.password : await hashear(data.password);
    }

    const campos = Object.keys(data);
    const setClause = campos.map((campo) => `${campo} = ?`).join(', ');
    const values = campos.map((campo) => data[campo]);
    values.push(id);

    await dbRun(`UPDATE users SET ${setClause} WHERE id = ?`, values);

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/:id
exports.delete = async (req, res) => {
  try {
    const actual = await dbGet('SELECT id, access_level FROM users WHERE id = ?', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (actual.access_level >= NIVELES.ADMIN && (await contarAdministradores()) <= 1) {
      return res.status(409).json({ error: 'No se puede eliminar al último Administrador' });
    }

    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/users/:id/photo - Actualizar foto
exports.updatePhoto = async (req, res) => {
  try {
    const { photo_url } = req.body;

    if (!photo_url) {
      return res.status(400).json({ error: 'photo_url es requerido' });
    }

    await dbRun('UPDATE users SET photo_url = ? WHERE id = ?', [photo_url, req.params.id]);
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

    const user = await dbGet('SELECT * FROM users WHERE nickname = ?', [nickname]);

    // Si el usuario no existe se compara igual contra un hash de relleno (mismo tiempo de respuesta)
    const valido = await comparar(password, user ? user.password : HASH_RELLENO);

    if (!user || !valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Quitar password de la respuesta
    const { password: _, ...safeUser } = user;

    res.json({ user: safeUser, token: firmarToken(safeUser), message: 'Login exitoso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;
