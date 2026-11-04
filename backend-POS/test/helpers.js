// test/helpers.js
// Arranca el servidor contra una base SQLite TEMPORAL (nunca la real).
// node --test corre cada archivo en su propio proceso, así que cada archivo
// tiene su base nueva.
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');
const crypto = require('crypto');

let tmpDir;

// Variables de entorno de prueba. Corre al cargar este archivo: cada prueba
// lo carga primero, así la base temporal queda lista ANTES de cualquier módulo
// del servidor (dotenv no pisa variables que ya existen). POS_PRUEBAS activa la
// protección de config/database.js: fuera de la carpeta temporal no se abre nada.
function configurarEntorno() {
  process.env.POS_PRUEBAS = '1';
  limpiarCorridasViejas();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-test-'));
  process.env.DB_PATH = path.join(tmpDir, 'pos_test.db');
  process.env.BACKUP_DIR = path.join(tmpDir, 'backups');
  process.env.JWT_SECRET = 'secreto-solo-para-pruebas';
  process.env.CORS_ORIGIN = 'http://localhost:3050';
  process.env.SUPERDEV_USER = 'superdev';
  process.env.SUPERDEV_PASSWORD = 'clave-super-de-prueba';
}

// Usuarios con contraseña en TEXTO PLANO, como en una base vieja.
// El servidor debe convertirlas a hash al arrancar.
const USUARIOS = {
  cajero: { id: 1, nickname: 'cajero', password: 'caja123', access_level: 1 },
  supervisor: { id: 2, nickname: 'supervisor', password: 'super123', access_level: 50 },
  gerente: { id: 3, nickname: 'gerente', password: 'gerente123', access_level: 90 },
  admin: { id: 4, nickname: 'admin', password: 'admin123', access_level: 99 },
};

function sembrarBaseVieja() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(process.env.DB_PATH);
    db.serialize(() => {
      db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT UNIQUE, full_name TEXT, phone TEXT, email TEXT UNIQUE,
        password TEXT, access_level INTEGER, photo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      for (const u of Object.values(USUARIOS)) {
        db.run('INSERT INTO users (id, nickname, password, access_level) VALUES (?, ?, ?, ?)',
          [u.id, u.nickname, u.password, u.access_level]);
      }
      db.run(`CREATE TABLE cash_registers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_caja TEXT UNIQUE NOT NULL, tipo_caja TEXT DEFAULT 'Normal', password TEXT NOT NULL
      )`);
      db.run(`INSERT INTO cash_registers (numero_caja, password) VALUES ('1', 'caja1')`);
    });
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

let server;
let baseUrl;
let app;
let dbPrueba;

function abrirConexionPrueba() {
  return new Promise((resolve, reject) => {
    const c = new sqlite3.Database(process.env.DB_PATH, (err) => {
      if (err) return reject(err);
      c.configure('busyTimeout', 5000);
      resolve(c);
    });
  });
}

// antesDeMigrar(db): opcional; corre con las tablas ya creadas pero ANTES de las
// migraciones, para sembrar datos como los dejaba una versión vieja (pesos).
async function iniciar({ antesDeMigrar } = {}) {
  await sembrarBaseVieja();
  if (antesDeMigrar) {
    const db = require('../src/config/database');
    await db.ready;
    await antesDeMigrar(db);
  }
  app = require('../server');
  await app.ready;
  // El servidor ya cerró su conexión del arranque: las pruebas revisan la base
  // con una conexión propia
  dbPrueba = await abrirConexionPrueba();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { baseUrl, db: dbPrueba };
}

async function detener() {
  if (server) await new Promise((resolve) => server.close(resolve));
  await require('../src/config/prisma').cerrarPrisma();
  if (dbPrueba) await new Promise((resolve) => dbPrueba.close(() => resolve()));
  borrarCarpeta(tmpDir);
}

// En Windows, libsql (Prisma) a veces no suelta el archivo de la base hasta que
// termina el proceso. Si no se puede borrar ahora, la borra la siguiente corrida.
function borrarCarpeta(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    if (err.code !== 'EPERM' && err.code !== 'EBUSY') throw err;
  }
}

// Carpetas pos-test-* de corridas anteriores con más de 10 minutos
function limpiarCorridasViejas() {
  const limite = Date.now() - 10 * 60 * 1000;
  for (const nombre of fs.readdirSync(os.tmpdir())) {
    if (!nombre.startsWith('pos-test-')) continue;
    const dir = path.join(os.tmpdir(), nombre);
    try {
      if (fs.statSync(dir).mtimeMs < limite) borrarCarpeta(dir);
    } catch { /* otra corrida la borró */ }
  }
}

// Rutas que necesitan caja: si la prueba no dice otra cosa, usan la caja 1
const RUTAS_CON_CAJA = /^\/api\/(sales\/?$|apartados\/abono|cuts\/?$|cuts\/(current|current-z|print\/current)(\?|$))/;

// Token de caja por token de sesión (se abre una vez)
const cajasAbiertas = new Map();

// Abre una caja con su clave ('caja' + número) y devuelve el token de caja
async function abrirCaja(token, numero = '1') {
  const llave = `${token}|${numero}`;
  if (cajasAbiertas.has(llave)) return cajasAbiertas.get(llave);
  const { status, data } = await api('POST', '/api/cash-registers/abrir', {
    token, caja: null, body: { numero_caja: numero, password: `caja${numero}` },
  });
  if (status !== 200) return null;
  cajasAbiertas.set(llave, data.caja_token);
  return data.caja_token;
}

// Petición al API; token opcional. Los POST llevan un Idempotency-Key nuevo,
// salvo que la prueba pase uno (clave) para repetir la misma operación, o
// clave: null para mandarlo sin él. caja: token de caja; sin decirlo, las rutas
// que la piden usan la caja 1; caja: null para mandarlas sin ella.
async function api(metodo, ruta, { token, body, clave, caja } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const cajaToken = caja === undefined && token && RUTAS_CON_CAJA.test(ruta) ? await abrirCaja(token) : caja;
  if (cajaToken) headers['X-Caja-Token'] = cajaToken;
  if (metodo === 'POST' && clave !== null) headers['Idempotency-Key'] = clave || crypto.randomUUID();
  const res = await fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, data };
}

async function login(nombre) {
  const u = USUARIOS[nombre];
  const { status, data } = await api('POST', '/api/users/login', {
    body: { nickname: u.nickname, password: u.password },
  });
  if (status !== 200) throw new Error(`Login de ${nombre} falló: ${status} ${JSON.stringify(data)}`);
  return data.token;
}

const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));

const centavos = (pesos) => Math.round(pesos * 100);

// Da de alta las cajas 2 y 3 (la 1 ya viene en la base de prueba), con clave 'caja' + número
async function sembrarCajas(tokenGerente, numeros = ['2', '3']) {
  for (const n of numeros) {
    const r = await api('POST', '/api/cash-registers', { token: tokenGerente, body: { numero_caja: n, password: `caja${n}` } });
    if (r.status !== 201) throw new Error(`No se creó la caja ${n}: ${JSON.stringify(r.data)}`);
  }
}

let consecutivoProducto = 0;

// Producto con precio de menudeo (pesos), IVA opcional y stock surtido con una entrada
async function crearProducto(tokenAdmin, { precio, iva = false, stock = 100 }) {
  consecutivoProducto += 1;
  const cat = await api('POST', '/api/categories', { token: tokenAdmin, body: { family: 'Pruebas', subfamily: `S${consecutivoProducto}` } });
  const r = await api('POST', '/api/products', {
    token: tokenAdmin,
    body: { articulo: `PRODUCTO ${consecutivoProducto}`, presentacion: 'pz', unidad_medida: 'PZ', precio_menudeo: precio, iva: iva ? 16 : null, category_id: cat.data.id },
  });
  if (r.status !== 201) throw new Error(`No se creó el producto: ${JSON.stringify(r.data)}`);
  if (stock > 0) {
    const e = await api('POST', '/api/entries', {
      token: tokenAdmin,
      body: { entry_type: 'ENTRADA', movement_reason: 'COMPRA_PROVEEDOR', comments: 'prueba', items: [{ product_id: r.data.id, quantity: stock }] },
    });
    if (e.status >= 300) throw new Error(`No se surtió: ${JSON.stringify(e.data)}`);
  }
  return r.data.id;
}

// Venta de contado de 1 pieza por total (pesos) en esa caja. pagos: forma de pago
// (por omisión efectivo). Devuelve el id de la venta.
async function vender(token, caja, producto, total, extra = {}, pagos) {
  const r = await api('POST', '/api/sales', {
    token,
    caja,
    body: {
      type: 'contado',
      details: [{ product_id: producto, quantity: 1, tipo_precio: 'menudeo' }],
      payments: pagos || [{ method: 'efectivo', amount: total }],
      total_esperado: total,
      ...extra,
    },
  });
  if (r.status !== 201) throw new Error(`Venta falló: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.id;
}

async function abonar(token, caja, sale_id, customer_id, monto, method = 'efectivo') {
  const r = await api('POST', '/api/apartados/abono', {
    token, caja, body: { sale_id, customer_id, amount: monto, pagos: [{ method, amount: monto }] },
  });
  if (r.status !== 200) throw new Error(`Abono falló: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}

configurarEntorno();

module.exports = { USUARIOS, iniciar, detener, api, login, dbGet, abrirCaja, sembrarCajas, crearProducto, vender, abonar, centavos };
