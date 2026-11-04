// Migración 8: lo que aún no entra en un corte Z va a la caja de número más bajo;
// lo ya cortado queda sin caja. Los cortes viejos no entran en un general.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet, abrirCaja } = require('./helpers');

let db;

const sql = (c, s, p = []) => new Promise((res, rej) => c.run(s, p, (e) => (e ? rej(e) : res())));

before(async () => {
  ({ db } = await iniciar({
    antesDeMigrar: async (vieja) => {
      await sql(vieja, "INSERT INTO cash_registers (numero_caja, password) VALUES ('10', 'x'), ('2', 'x')");
      for (let id = 1; id <= 5; id++) {
        await sql(vieja, `INSERT INTO sales (id, date, type, subtotal, total, paid, status) VALUES (?, '2026-01-01', 'contado', 10, 10, 10, 'completed')`, [id]);
        await sql(vieja, `INSERT INTO payments (id, sale_id, method, amount, payment_type, date) VALUES (?, ?, 'efectivo', 10, 'normal', '2026-01-01')`, [id, id]);
      }
      // Z viejo hasta la venta 2; X viejo hasta la 3 (después del Z); venta 4 y 5 sin cortar
      await sql(vieja, `INSERT INTO cuts (id, type, date, desde, hasta, total_sales, total_recibido, first_ticket, last_ticket) VALUES (1, 'Z', '2026-01-01', '1', '2', 20, 20, 1, 2)`);
      await sql(vieja, `INSERT INTO cuts (id, type, date, desde, hasta, total_sales, total_recibido, pago_efectivo, cash_in_box, ventas_contado, first_ticket, last_ticket) VALUES (2, 'X', '2026-01-01', '3', '3', 10, 10, 10, 10, 10, 3, 3)`);
    },
  }));
});

after(detener);

test('la versión queda en 8 o más y las columnas existen', async () => {
  assert.ok((await dbGet(db, 'PRAGMA user_version')).user_version >= 8);
  assert.equal((await dbGet(db, "SELECT COUNT(*) n FROM sqlite_master WHERE name = 'corte_general_cortes'")).n, 1);
  assert.equal((await dbGet(db, "SELECT COUNT(*) n FROM sqlite_master WHERE type = 'index' AND name IN ('idx_sales_caja','idx_payments_caja','idx_cuts_corte_general')")).n, 3);
});

test('lo ya cortado queda sin caja; lo posterior al último Z va a la caja de número más bajo (1, no 10)', async () => {
  const caja = async (t, id) => (await dbGet(db, `SELECT caja FROM ${t} WHERE id = ?`, [id])).caja;
  for (const t of ['sales', 'payments']) {
    assert.equal(await caja(t, 2), null, t);
    assert.equal(await caja(t, 3), '1', t);
    assert.equal(await caja(t, 5), '1', t);
  }
});

test('el Z viejo sigue sin caja y el siguiente X parte del X viejo posterior a él', async () => {
  assert.equal((await dbGet(db, 'SELECT cash_register c FROM cuts WHERE id = 1')).c, null);
  assert.equal((await dbGet(db, 'SELECT cash_register c FROM cuts WHERE id = 2')).c, '1');

  const token = await login('gerente');
  const caja = await abrirCaja(token, '1');
  const x = await api('GET', '/api/cuts/current', { token, caja });
  assert.equal(x.data.ventas.total_ventas, 2); // 4 y 5: la 3 ya la cubrió el X viejo
  const z = await api('GET', '/api/cuts/current-z', { token, caja });
  assert.equal(z.data.ventas.total_ventas, 3); // 3, 4 y 5: todo lo posterior al Z viejo
});

test('el Z viejo sin caja no entra en un general; el primero nuevo sí y cuadra', async () => {
  const token = await login('gerente');
  const admin = await login('admin');
  assert.equal((await api('POST', '/api/cuts/general', { token: admin, body: { type: 'Z' } })).status, 400);

  const caja = await abrirCaja(token, '1');
  assert.equal((await api('POST', '/api/cuts', { token, caja, body: { type: 'Z' } })).status, 201);
  const g = await api('GET', '/api/cuts/general/current?tipo=Z', { token: admin });
  assert.equal(g.data.incluidos, 1);
  assert.equal(g.data.cuadra, true, JSON.stringify(g.data.diferencias));
  assert.equal((await api('POST', '/api/cuts/general', { token: admin, body: { type: 'Z' } })).status, 201);
});
