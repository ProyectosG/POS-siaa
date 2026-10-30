// Prueba de la migración de la Fase 1 sobre una base vieja (montos en pesos)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;

const correr = (conexion, sql, params = []) =>
  new Promise((resolve, reject) => conexion.run(sql, params, (err) => (err ? reject(err) : resolve())));

before(async () => {
  ({ db } = await iniciar({
    // Datos como los dejaba la versión anterior: pesos con decimales y el saldo
    // del apartado sumando el anticipo (75) en vez de lo pendiente (175)
    antesDeMigrar: async (vieja) => {
      await correr(vieja, `INSERT INTO categories (id, family) VALUES (1, 'Ropa')`);
      await correr(vieja, `INSERT INTO products (id, articulo, precio_menudeo, stock, category_id) VALUES (1, 'Blusa', 250.1, 5, 1)`);
      await correr(vieja, `INSERT INTO customers (id, first_name, current_balance) VALUES (1, 'María', 75)`);
      await correr(vieja,
        `INSERT INTO sales (id, date, type, customer_id, subtotal, tax_total, total, paid, pending_balance, status)
         VALUES (1, '2026-01-10', 'apartado', 1, 215.6, 34.5, 250.1, 75, 175.1, 'pending')`);
      await correr(vieja, `INSERT INTO payments (id, sale_id, method, amount, payment_type, date) VALUES (1, 1, 'efectivo', 75, 'anticipo', '2026-01-10')`);
      // Un corte Z viejo que cubrió el ticket 1 (todavía sin last_payment_id)
      await correr(vieja, `INSERT INTO cuts (type, date, desde, hasta, total_sales, first_ticket, last_ticket) VALUES ('Z', '2026-01-10', '1', '1', 250.1, 1, 1)`);
    },
  }));
});

after(detener);

test('el dinero viejo queda en centavos enteros', async () => {
  assert.equal((await dbGet(db, 'SELECT precio_menudeo FROM products WHERE id = 1')).precio_menudeo, 25010);
  const venta = await dbGet(db, 'SELECT total, paid, pending_balance FROM sales WHERE id = 1');
  assert.deepEqual({ ...venta }, { total: 25010, paid: 7500, pending_balance: 17510 });
  assert.equal((await dbGet(db, 'SELECT amount FROM payments WHERE sale_id = 1')).amount, 7500);
});

test('el saldo del cliente se recalcula con lo pendiente y deja historial', async () => {
  const cliente = await dbGet(db, 'SELECT current_balance FROM customers WHERE id = 1');
  assert.equal(cliente.current_balance, 17510);

  const ajuste = await dbGet(db, 'SELECT previous_balance, amount, new_balance FROM customer_balance_history WHERE customer_id = 1');
  assert.deepEqual({ ...ajuste }, { previous_balance: 7500, amount: 10010, new_balance: 17510 });

  // Por el API sale en pesos
  const token = await login('cajero');
  const r = await api('GET', '/api/customers/1', { token });
  assert.equal(r.data.current_balance, 175.1);
});

test('se respaldó la base antes de migrar y la versión quedó marcada', async () => {
  const respaldos = fs.readdirSync(process.env.BACKUP_DIR).filter((f) => f.startsWith('pos_antes_fase1_'));
  assert.equal(respaldos.length, 1);
  assert.equal((await dbGet(db, 'PRAGMA user_version')).user_version, 6);
});

test('los cortes viejos quedan con el último pago que cubrieron (migración 2)', async () => {
  const corte = await dbGet(db, 'SELECT total_sales, last_payment_id FROM cuts LIMIT 1');
  assert.equal(corte.total_sales, 25010);
  assert.equal(corte.last_payment_id, 1);
});

test('con WAL: la base queda en modo WAL y el respaldo de la migración trae los datos de antes', async () => {
  assert.equal((await dbGet(db, 'PRAGMA journal_mode')).journal_mode, 'wal');

  // Los datos viejos se escribieron con la base ya en WAL (estaban en pos.db-wal
  // al respaldar); el respaldo debe tenerlos tal como estaban: en pesos
  const path = require('path');
  const sqlite3 = require('sqlite3');
  const archivo = fs.readdirSync(process.env.BACKUP_DIR).find((f) => f.startsWith('pos_antes_fase1_'));
  const respaldo = new sqlite3.Database(path.join(process.env.BACKUP_DIR, archivo), sqlite3.OPEN_READONLY);
  const fila = await dbGet(respaldo, 'SELECT precio_menudeo FROM products WHERE id = 1');
  const venta = await dbGet(respaldo, 'SELECT total, pending_balance FROM sales WHERE id = 1');
  const version = (await dbGet(respaldo, 'PRAGMA user_version')).user_version;
  await new Promise((r) => respaldo.close(r));
  assert.equal(fila.precio_menudeo, 250.1);
  assert.deepEqual({ ...venta }, { total: 250.1, pending_balance: 175.1 });
  assert.equal(version, 0);
});
