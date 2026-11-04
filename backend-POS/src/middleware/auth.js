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
const DURACION_TOKEN_CAJA = '12h';

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

// Token de caja: lo entrega POST /cash-registers/abrir, ligado a la caja y al
// usuario. Viaja en el encabezado X-Caja-Token.
function firmarTokenCaja(caja, user) {
  return jwt.sign(
    { tipo: 'caja', caja_id: caja.id, numero_caja: caja.numero_caja, id_user: user.id },
    getSecret(),
    { expiresIn: DURACION_TOKEN_CAJA }
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
    // Con el mismo secreto se firman tokens de otro tipo (caja, precio libre): no son sesiones
    if (payload.tipo) return res.status(401).json({ error: 'Sesión vencida o token inválido' });
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

// Exige un token de caja válido de este usuario y deja la caja en req.caja. Nunca
// se confía en una caja del cuerpo o de la dirección. Sin caja válida: 400 y el
// encabezado X-Caja-Requerida, con el que el navegador regresa a elegir caja.
async function requireCaja(req, res, next) {
  const sinCaja = () => res
    .status(400)
    .set('X-Caja-Requerida', '1')
    .json({ error: 'Esta operación necesita una caja abierta: selecciona tu caja e inténtalo de nuevo' });

  const token = req.get('X-Caja-Token');
  if (!token) return sinCaja();

  let datos;
  try {
    datos = jwt.verify(token, getSecret());
  } catch {
    return sinCaja();
  }
  if (datos.tipo !== 'caja' || datos.id_user !== req.user.id) return sinCaja();

  try {
    const { prisma } = require('../config/prisma');
    const caja = await prisma.cash_registers.findUnique({
      where: { id: datos.caja_id },
      select: { id: true, numero_caja: true },
    });
    if (!caja || caja.numero_caja !== datos.numero_caja) return sinCaja();
    req.caja = { id: caja.id, numero: caja.numero_caja };
    next();
  } catch (err) {
    console.error('❌ Error al revisar la caja:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
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
  firmarTokenCaja,
  requireAuth,
  requireCaja,
  requireLevel,
  requireSuperDev,
  tieneNivel,
};
