// Migración 3: autorizaciones_usadas con jti NOT NULL, sobre una base que ya
// estaba en la versión 2 y tenía autorizaciones usadas
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, dbGet } = require('./helpers');

let db;

const correr = (conexion, sql) =>
  new Promise((resolve, reject) => conexion.run(sql, (err) => (err ? reject(err) : resolve())));

before(async () => {
  ({ db } = await iniciar({
    antesDeMigrar: async (vieja) => {
      // Como la dejaba la migración 2 (TEXT PRIMARY KEY admite NULL)
      await correr(vieja, 'ALTER TABLE cuts ADD COLUMN last_payment_id INTEGER');
      await correr(vieja, 'CREATE TABLE autorizaciones_usadas (jti TEXT PRIMARY KEY, sale_id INTEGER, usado TEXT NOT NULL)');
      await correr(vieja, `INSERT INTO autorizaciones_usadas VALUES ('aaa-111', 7, '2026-10-01 10:00:00')`);
      await correr(vieja, `INSERT INTO autorizaciones_usadas VALUES ('bbb-222', 8, '2026-10-02 11:00:00')`);
      await correr(vieja, `INSERT INTO autorizaciones_usadas VALUES (NULL, 9, '2026-10-03 12:00:00')`);
      await correr(vieja, 'PRAGMA user_version = 2');
    },
  }));
});

after(detener);

test('las autorizaciones usadas se conservan y jti ya no admite NULL', async () => {
  assert.ok((await dbGet(db, 'PRAGMA user_version')).user_version >= 3);

  const filas = await new Promise((res, rej) =>
    db.all('SELECT jti, sale_id, usado FROM autorizaciones_usadas ORDER BY jti', (e, r) => (e ? rej(e) : res(r))));
  assert.deepEqual(filas.map((f) => ({ ...f })), [
    { jti: 'aaa-111', sale_id: 7, usado: '2026-10-01 10:00:00' },
    { jti: 'bbb-222', sale_id: 8, usado: '2026-10-02 11:00:00' },
  ]);

  const columnas = await new Promise((res, rej) =>
    db.all('PRAGMA table_info(autorizaciones_usadas)', (e, r) => (e ? rej(e) : res(r))));
  assert.equal(columnas.find((c) => c.name === 'jti').notnull, 1);

  await assert.rejects(correr(db, `INSERT INTO autorizaciones_usadas VALUES (NULL, 1, 'x')`), /NOT NULL/);
});
