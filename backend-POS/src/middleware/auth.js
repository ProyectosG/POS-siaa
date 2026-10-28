// src/middleware/auth.js
// Autenticación con JWT y permisos por rol. Todo se decide en el servidor.
const jwt = require('jsonwebtoken');

// Niveles de acceso (users.access_level)
const NIVELES = {
  CAJERO: 1,
  SUPERVISOR: 50,
  GERENTE: 90,
  ADMIN: 99,
};

const DURACION_TOKEN = '12h';
const DURACION_TOKEN_SUPERDEV = '45m';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está configurado en .env');
  return secret;
}

// Token de un usuario normal: id, nickname y access_level
function firmarToken(user) {
  return jwt.sign(
    { id: user.id, nickname: user.nickname, access_level: Number(user.access_level) },
    getSecret(),
    { expiresIn: DURACION_TOKEN }
  );
}

// Token del SuperDeveloper (id 0, no existe en la tabla users)
function firmarTokenSuperDev(nickname) {
  return jwt.sign(
    { id: 0, nickname, access_level: NIVELES.ADMIN, superdev: true },
    getSecret(),
    { expiresIn: DURACION_TOKEN_SUPERDEV }
  );
}

// Exige un token válido y deja los datos del usuario en req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autorizado: falta el token' });
  }

  try {
    const payload = jwt.verify(token, getSecret());
    req.user = {
      id: payload.id,
      nickname: payload.nickname,
      access_level: Number(payload.access_level) || 0,
      superdev: payload.superdev === true,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión vencida o token inválido' });
  }
}

// El SuperDeveloper pasa cualquier nivel
function tieneNivel(user, nivel) {
  return Boolean(user && (user.superdev || user.access_level >= nivel));
}

function requireLevel(nivel) {
  return (req, res, next) => {
    if (!tieneNivel(req.user, nivel)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

function requireSuperDev(req, res, next) {
  if (!req.user || !req.user.superdev) {
    return res.status(403).json({ error: 'Acceso denegado. Solo SuperDeveloper.' });
  }
  next();
}

module.exports = {
  NIVELES,
  firmarToken,
  firmarTokenSuperDev,
  requireAuth,
  requireLevel,
  requireSuperDev,
  tieneNivel,
};
