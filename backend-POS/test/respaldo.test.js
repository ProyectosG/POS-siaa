// "Respaldar ahora" del SuperDeveloper: GET /api/superdev/respaldo
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
let baseUrl;
const tokens = {};

// Descarga el respaldo con un token; devuelve { status, nombre, bytes }
async function descargar(token) {
  const res = await fetch(`${baseUrl}/api/superdev/respaldo`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const disposicion = res.headers.get('content-disposition') || '';
  const nombre = (disposicion.match(/filename="?([^";]+)"?/) || [])[1];
  return { status: res.status, nombre, bytes: Buffer.from(await res.arrayBuffer()) };
}

// Abre una copia descargada y hace una consulta
async function consultarCopia(bytes, sql) {
  const archivo = path.join(process.env.BACKUP_DIR, `revision_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`);
  fs.writeFileSync(archivo, bytes);
  const c = new sqlite3.Database(archivo, sqlite3.OPEN_READONLY);
  const fila = await dbGet(c, sql);
  await new Promise((r) => c.close(r));
  fs.rmSync(archivo, { force: true });
  return fila;
}

const manuales = () => fs.readdirSync(process.env.BACKUP_DIR).filter((f) => f.startsWith('pos_respaldo_'));

before(async () => {
  ({ db, baseUrl } = await iniciar());
  tokens.admin = await login('admin');
  tokens.cajero = await login('cajero');
  tokens.sd = (await api('POST', '/api/superdev/entrar', { body: { nickname: 'superdev', password: 'clave-super-de-prueba' } })).data.token;

  const cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Respaldo' } })).data.id;
  const prod = (await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Taza', category_id: cat, precio_menudeo: 80, iva: 16, stock: 5, activo: true },
  })).data.id;
  // Una venta que queda en pos.db-wal (la base trabaja en WAL)
  const v = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: { type: 'contado', total_esperado: 80, details: [{ product_id: prod, quantity: 1, tipo_precio: 'menudeo' }], payments: [{ method: 'efectivo', amount: 80 }] },
  });
  assert.equal(v.status, 201, JSON.stringify(v.data));
});

after(detener);

test('solo el SuperDeveloper: sin token 401, cualquier otro usuario 403', async () => {
  assert.equal((await descargar(null)).status, 401);
  assert.equal((await descargar(tokens.admin)).status, 403);
  assert.equal((await descargar(tokens.cajero)).status, 403);
});

test('descarga una base SQLite completa, con lo que estaba en el -wal y la misma versión', async () => {
  const r = await descargar(tokens.sd);
  assert.equal(r.status, 200);
  assert.match(r.nombre, /^pos_respaldo_\d{4}-\d{2}-\d{2}_\d{6}_\d{3}\.db$/);
  assert.equal(r.bytes.subarray(0, 16).toString('latin1'), 'SQLite format 3\u0000');

  const ventas = (await dbGet(db, 'SELECT COUNT(*) AS n FROM sales')).n;
  assert.equal((await consultarCopia(r.bytes, 'SELECT COUNT(*) AS n FROM sales')).n, ventas);
  assert.equal((await consultarCopia(r.bytes, 'SELECT total FROM sales ORDER BY id DESC LIMIT 1')).total, 8000);
  assert.equal((await consultarCopia(r.bytes, 'PRAGMA user_version')).user_version, (await dbGet(db, 'PRAGMA user_version')).user_version);
  assert.equal((await consultarCopia(r.bytes, 'PRAGMA quick_check')).quick_check, 'ok');

  // Y queda una copia igual en backups/
  const copia = path.join(process.env.BACKUP_DIR, r.nombre);
  assert.ok(fs.existsSync(copia));
  assert.equal(fs.statSync(copia).size, r.bytes.length);
});

test('pedido mientras corre una transacción: la copia la trae completa, nunca a medias', async () => {
  const { enTransaccion } = require('../src/config/transaccion');
  // La transacción escribe A, espera y escribe B; el respaldo se pide en medio
  const larga = enTransaccion(async (tx) => {
    await tx.categories.create({ data: { family: 'Mitad A' } });
    await new Promise((r) => setTimeout(r, 400));
    await tx.categories.create({ data: { family: 'Mitad B' } });
  });
  await new Promise((r) => setTimeout(r, 100));
  const r = await descargar(tokens.sd);
  await larga;
  assert.equal(r.status, 200);
  const { n } = await consultarCopia(r.bytes, `SELECT COUNT(*) AS n FROM categories WHERE family IN ('Mitad A', 'Mitad B')`);
  assert.equal(n, 2, 'el respaldo esperó a que la transacción terminara');
});

test('en backups/ quedan solo los 10 respaldos manuales más recientes; los de migraciones y reset no se tocan', async () => {
  // Respaldos de otro tipo que no deben borrarse
  fs.writeFileSync(path.join(process.env.BACKUP_DIR, 'pos_backup_1700000000000.db'), 'reset');
  fs.writeFileSync(path.join(process.env.BACKUP_DIR, 'pos_antes_fase1_1700000000000.db'), 'migracion');
  fs.writeFileSync(path.join(process.env.BACKUP_DIR, 'notas.txt'), 'otro');

  const nombres = [];
  for (let i = 0; i < 12; i++) {
    const r = await descargar(tokens.sd);
    assert.equal(r.status, 200);
    nombres.push(r.nombre);
  }
  const quedan = manuales().sort();
  assert.equal(quedan.length, 10);
  assert.deepEqual(quedan, nombres.slice(-10).sort(), 'se conservan los 10 más recientes');
  for (const f of ['pos_backup_1700000000000.db', 'pos_antes_fase1_1700000000000.db', 'notas.txt']) {
    assert.ok(fs.existsSync(path.join(process.env.BACKUP_DIR, f)), `${f} sigue`);
  }
});
