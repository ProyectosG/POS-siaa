// src/demo/demo.js
// Modo demo (MODO_DEMO=1): la base se borra y se vuelve a sembrar en cada
// arranque, y lo sensible queda bloqueado en el servidor. Sin MODO_DEMO nada de
// esto se activa. Este archivo no abre la base: server.js lo carga ANTES que
// config/database.js para poder borrar el archivo.
const fs = require('fs');
const path = require('path');

const NOMBRE_BASE_DEMO = 'demo.db';
const NO_DISPONIBLE = 'No disponible en la demo';

const esDemo = () => process.env.MODO_DEMO === '1';

// Borra la base de la demo (y su -wal y -shm). Candado: solo si DB_PATH apunta
// a un archivo llamado demo.db, para no borrar nunca una base real por error.
function borrarBaseDemo() {
  const ruta = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : null;
  if (!ruta || path.basename(ruta) !== NOMBRE_BASE_DEMO) {
    throw new Error(`MODO_DEMO=1 exige DB_PATH apuntando a un archivo ${NOMBRE_BASE_DEMO} (está: ${ruta || 'vacío'})`);
  }
  for (const sufijo of ['', '-wal', '-shm']) fs.rmSync(ruta + sufijo, { force: true });
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
}

// Rutas bloqueadas en la demo (relativas a /api). Express no distingue
// mayúsculas en las rutas: las expresiones tampoco.
const BLOQUEADAS = [
  // Usuarios: se pueden ver, no cambiar
  ['POST', /^\/users\/?$/i],
  ['PUT', /^\/users\/[^/]+\/?$/i],
  ['DELETE', /^\/users\/[^/]+\/?$/i],
  ['PATCH', /^\/users\/[^/]+\/photo\/?$/i],
  // Cajas: cambiar la clave de la caja dejaría fuera a los demás visitantes
  ['POST', /^\/cash-registers\/?$/i],
  ['PUT', /^\/cash-registers\/[^/]+\/?$/i],
  ['DELETE', /^\/cash-registers\/[^/]+\/?$/i],
  // SuperDeveloper (entrar y respaldo) y reset
  ['*', /^\/superdev(\/|$)/i],
  ['*', /^\/reset(\/|$)/i],
  // Configuración y clave de precios (sin precio libre)
  ['PUT', /^\/settings\/?$/i],
  ['POST', /^\/settings\/validar-clave-precio\/?$/i],
  // Impresión del ticket (la vista previa, /tickets/:id/text, sí funciona)
  ['GET', /^\/tickets\/[^/]+\/print\/?$/i],
];

// Middleware para /api: responde 403 en lo bloqueado (va antes de la autenticación)
function bloqueoDemo(req, res, next) {
  const bloqueada = BLOQUEADAS.some(([metodo, ruta]) =>
    (metodo === '*' || metodo === req.method) && ruta.test(req.path));
  if (bloqueada) return res.status(403).json({ error: NO_DISPONIBLE });
  next();
}

module.exports = { esDemo, borrarBaseDemo, bloqueoDemo, NOMBRE_BASE_DEMO, NO_DISPONIBLE };
