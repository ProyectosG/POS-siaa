// src/controllers/superdev.controller.js
// Acceso del SuperDeveloper con credenciales de .env (SUPERDEV_USER / SUPERDEV_PASSWORD)
const crypto = require('crypto');
const { firmarTokenSuperDev } = require('../middleware/auth');

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

// Intentos fallidos por equipo (IP), en memoria: ip → { fallos, bloqueadoHasta }
const intentos = new Map();

// Comparación en tiempo constante: se comparan los SHA-256 (mismo largo siempre)
function igualesSeguro(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

exports.entrar = (req, res) => {
  const usuarioEnv = process.env.SUPERDEV_USER;
  const passwordEnv = process.env.SUPERDEV_PASSWORD;

  // Sin credenciales en .env el SuperDeveloper queda apagado
  if (!usuarioEnv || !passwordEnv) {
    return res.status(404).json({ error: 'SuperDeveloper desactivado' });
  }

  const ip = req.ip || 'desconocido';
  const ahora = Date.now();
  const registro = intentos.get(ip) || { fallos: 0, bloqueadoHasta: 0 };

  if (registro.bloqueadoHasta > ahora) {
    const minutos = Math.ceil((registro.bloqueadoHasta - ahora) / 60000);
    return res.status(429).json({ error: `Demasiados intentos. Espera ${minutos} min.` });
  }

  const { nickname = '', password = '' } = req.body || {};

  // Se evalúan las dos comparaciones siempre, para no revelar cuál falló
  const usuarioOk = igualesSeguro(nickname, usuarioEnv);
  const passwordOk = igualesSeguro(password, passwordEnv);

  if (!(usuarioOk && passwordOk)) {
    registro.fallos += 1;
    if (registro.fallos >= MAX_INTENTOS) {
      registro.fallos = 0;
      registro.bloqueadoHasta = ahora + BLOQUEO_MS;
    }
    intentos.set(ip, registro);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  intentos.delete(ip);

  const user = { id: 0, nickname: 'SUPERdeveloper', access_level: 99, isSuperDev: true };
  res.json({ token: firmarTokenSuperDev(user.nickname), user });
};

// Solo para las pruebas: limpia el registro de intentos
exports._limpiarIntentos = () => intentos.clear();
