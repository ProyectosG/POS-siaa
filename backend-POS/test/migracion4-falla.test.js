// Migración 4: si algún monto tiene decimales, no se migra nada (no se redondea
// dinero en silencio) y la base queda como estaba
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');

let dir;
const correr = (c, sql) => new Promise((res, rej) => c.run(sql, (e) => (e ? rej(e) : res())));
const una = (c, sql) => new Promise((res, rej) => c.get(sql, (e, r) => (e ? rej(e) : res(r))));

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-test-'));
  process.env.DB_PATH = path.join(dir, 'pos_test.db');
  process.env.BACKUP_DIR = path.join(dir, 'backups');
});

after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('un monto con decimales detiene la migración 4 sin cambiar nada', async () => {
  const db = require('../src/config/database');
  await db.ready;
  const { migrar } = require('../src/config/migraciones');
  // Se aplican las migraciones 1 a 3 y se deja un monto mal (con decimales)
  await migrar().catch(() => {}); // corre todas: la 4 pasa porque la base está vacía
  await correr(db, 'PRAGMA user_version = 3');
  await correr(db, `INSERT INTO categories (id, family) VALUES (1, 'X')`);
  await correr(db, `INSERT INTO products (id, articulo, precio_menudeo, category_id) VALUES (1, 'Raro', 1234.5, 1)`);

  await assert.rejects(migrar(), /decimales/);

  assert.equal((await una(db, 'PRAGMA user_version')).user_version, 3);
  assert.equal((await una(db, 'SELECT precio_menudeo FROM products WHERE id = 1')).precio_menudeo, 1234.5);
  assert.equal((await una(db, 'PRAGMA foreign_keys')).foreign_keys, 1, 'las llaves foráneas vuelven a quedar activas');
  await new Promise((r) => db.close(r));
});
