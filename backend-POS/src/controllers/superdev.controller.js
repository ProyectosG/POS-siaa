// src/controllers/superdev.controller.js
// Acceso del SuperDeveloper con credenciales de .env (SUPERDEV_USER / SUPERDEV_PASSWORD)
const crypto = require('crypto');
const { firmarTokenSuperDev } = require('../middleware/auth');
const { respaldarAhora } = require('../utils/respaldos');

const { crearLimiteIntentos } = require('../utils/limiteIntentos');

// 5 intentos fallidos por equipo (IP) → 15 minutos sin poder intentar (en la base)
const intentos = crearLimiteIntentos({ prefijo: 'superdev', maximo: 5, bloqueoMs: 15 * 60 * 1000 });

// Comparación en tiempo constante: se comparan los SHA-256 (mismo largo siempre)
function igualesSeguro(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

exports.entrar = async (req, res) => {
  const usuarioEnv = process.env.SUPERDEV_USER;
  const passwordEnv = process.env.SUPERDEV_PASSWORD;

  // Sin credenciales en .env el SuperDeveloper queda apagado
  if (!usuarioEnv || !passwordEnv) {
    return res.status(404).json({ error: 'SuperDeveloper desactivado' });
  }

  const ip = req.ip || 'desconocido';
  const minutos = await intentos.minutosBloqueado(ip);
  if (minutos > 0) {
    return res.status(429).json({ error: `Demasiados intentos. Espera ${minutos} min.` });
  }

  const { nickname = '', password = '' } = req.body || {};

  // Se evalúan las dos comparaciones siempre, para no revelar cuál falló
  const usuarioOk = igualesSeguro(nickname, usuarioEnv);
  const passwordOk = igualesSeguro(password, passwordEnv);

  if (!(usuarioOk && passwordOk)) {
    await intentos.fallo(ip);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  await intentos.exito(ip);

  const user = { id: 0, nickname: 'SUPERdeveloper', access_level: 99, isSuperDev: true };
  res.json({ token: firmarTokenSuperDev(user.nickname), user });
};

// Solo para las pruebas: limpia el registro de intentos
exports._limpiarIntentos = () => intentos.limpiar();

// GET /api/superdev/respaldo → descarga un respaldo completo de la base
// ("Respaldar ahora"). Queda también una copia en backups/ (las 10 más recientes).
exports.respaldo = async (req, res) => {
  try {
    const { archivo, nombre, bytes } = await respaldarAhora();
    console.log(`💾 Respaldo manual: ${nombre} (${bytes} bytes)`);
    res.download(archivo, nombre, (err) => {
      if (err && !res.headersSent) res.status(500).json({ error: 'No se pudo enviar el respaldo' });
    });
  } catch (err) {
    console.error('❌ Respaldo manual:', err);
    res.status(500).json({ error: 'No se pudo hacer el respaldo: ' + err.message });
  }
};
