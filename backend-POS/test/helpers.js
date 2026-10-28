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

// Variables de entorno de prueba (antes de cargar server.js / dotenv)
function configurarEntorno() {
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

// antesDeMigrar(db): opcional; corre con las tablas ya creadas pero ANTES de las
// migraciones, para sembrar datos como los dejaba una versión vieja (pesos).
async function iniciar({ antesDeMigrar } = {}) {
  configurarEntorno();
  await sembrarBaseVieja();
  if (antesDeMigrar) {
    const db = require('../src/config/database');
    await db.ready;
    await antesDeMigrar(db);
  }
  app = require('../server');
  await app.ready;
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { baseUrl, db: require('../src/config/database') };
}

async function detener() {
  if (server) await new Promise((resolve) => server.close(resolve));
  await require('../src/config/transaccion').cerrarTransacciones();
  const db = require('../src/config/database');
  await new Promise((resolve) => db.close(() => resolve()));
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// Petición al API; token opcional. Los POST llevan un Idempotency-Key nuevo,
// salvo que la prueba pase uno (clave) para repetir la misma operación, o
// clave: null para mandarlo sin él.
async function api(metodo, ruta, { token, body, clave } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
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

module.exports = { USUARIOS, iniciar, detener, api, login, dbGet };
