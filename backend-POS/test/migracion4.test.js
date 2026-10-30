// Migración 4: columnas de dinero de REAL a INTEGER sin que ningún monto cambie
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { iniciar, detener, api, login, dbGet } = require('./helpers');
const { CAMPOS_DINERO } = require('../src/utils/dinero');

let db;

const correr = (conexion, sql, params = []) =>
  new Promise((resolve, reject) => conexion.run(sql, params, (err) => (err ? reject(err) : resolve())));
const todas = (conexion, sql, params = []) =>
  new Promise((resolve, reject) => conexion.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

before(async () => {
  ({ db } = await iniciar({
    // Una base vieja (pesos, columnas REAL) con un poco de todo
    antesDeMigrar: async (vieja) => {
      await correr(vieja, `INSERT INTO categories (id, family) VALUES (1, 'Ropa')`);
      await correr(vieja, `INSERT INTO products (id, articulo, codigo_barras, precio_menudeo, precio_mayoreo, stock, category_id)
        VALUES (1, 'Blusa', '750-1', 250.1, 199.99, 5, 1), (2, 'Falda', '750-2', 0.01, NULL, 3, 1)`);
      await correr(vieja, `INSERT INTO customers (id, first_name, current_balance) VALUES (1, 'María', 175.1)`);
      await correr(vieja, `INSERT INTO sales (id, date, type, customer_id, subtotal, tax_total, total, paid, pending_balance, status)
        VALUES (1, '2026-01-10', 'apartado', 1, 215.6, 34.5, 250.1, 75, 175.1, 'pending'),
               (2, '2026-01-11', 'contado', NULL, 172.41, 27.58, 199.99, 199.99, 0, 'completed'),
               (3, '2026-01-12', 'contado', NULL, 1, 0, 1, 1, 0, 'completed')`);
      // Se borra la última venta: el contador de folios queda en 3
      await correr(vieja, 'DELETE FROM sales WHERE id = 3');
      await correr(vieja, `INSERT INTO sale_details (sale_id, product_id, quantity, base_price, price, subtotal, tax_amount)
        VALUES (1, 1, 1, 250.1, 250.1, 215.6, 34.5), (2, 1, 1, 199.99, 199.99, 172.41, 27.58)`);
      await correr(vieja, `INSERT INTO payments (sale_id, method, amount, payment_type, date)
        VALUES (1, 'efectivo', 75, 'anticipo', '2026-01-10'), (2, 'tarjeta', 199.99, 'normal', '2026-01-11')`);
      await correr(vieja, `INSERT INTO cuts (type, date, desde, hasta, total_sales, total_recibido, pago_efectivo, first_ticket, last_ticket)
        VALUES ('X', '2026-01-11', '1', '2', 450.09, 274.99, 75, 1, 2)`);
    },
  }));
});

after(detener);

test('las columnas de dinero quedan INTEGER y guardan enteros', async () => {
  assert.equal((await dbGet(db, 'PRAGMA user_version')).user_version, 6);
  for (const [tabla, campos] of Object.entries(CAMPOS_DINERO)) {
    const columnas = await todas(db, `PRAGMA table_info(${tabla})`);
    for (const campo of campos) {
      assert.equal(columnas.find((c) => c.name === campo).type, 'INTEGER', `${tabla}.${campo}`);
      const { n } = await dbGet(db, `SELECT COUNT(*) AS n FROM ${tabla} WHERE typeof(${campo}) NOT IN ('integer', 'null')`);
      assert.equal(n, 0, `${tabla}.${campo} sin valores que no sean enteros`);
    }
  }
});

test('ningún monto cambió (pesos × 100, sin redondeos raros)', async () => {
  const p = await dbGet(db, 'SELECT precio_menudeo, precio_mayoreo FROM products WHERE id = 1');
  assert.deepEqual({ ...p }, { precio_menudeo: 25010, precio_mayoreo: 19999 });
  assert.equal((await dbGet(db, 'SELECT precio_menudeo FROM products WHERE id = 2')).precio_menudeo, 1);
  const ventas = await todas(db, 'SELECT id, subtotal, tax_total, total, paid, pending_balance FROM sales ORDER BY id');
  assert.deepEqual(ventas.map((v) => ({ ...v })), [
    { id: 1, subtotal: 21560, tax_total: 3450, total: 25010, paid: 7500, pending_balance: 17510 },
    { id: 2, subtotal: 17241, tax_total: 2758, total: 19999, paid: 19999, pending_balance: 0 },
  ]);
  const { suma } = await dbGet(db, 'SELECT SUM(amount) AS suma FROM payments');
  assert.equal(suma, 27499);
  const corte = await dbGet(db, 'SELECT total_sales, total_recibido, pago_efectivo FROM cuts');
  assert.deepEqual({ ...corte }, { total_sales: 45009, total_recibido: 27499, pago_efectivo: 7500 });

  // Por el API sigue saliendo en pesos
  const token = await login('admin');
  assert.equal((await api('GET', '/api/products/1', { token })).data.precio_menudeo, 250.1);
  assert.equal((await api('GET', '/api/customers/1', { token })).data.current_balance, 175.1);
});

test('el contador de folios sigue donde iba (no se repite un folio borrado)', async () => {
  assert.equal((await dbGet(db, `SELECT seq FROM sqlite_sequence WHERE name = 'sales'`)).seq, 3);
  const token = await login('cajero');
  const r = await api('POST', '/api/sales', {
    token,
    body: { type: 'contado', total_esperado: 250.1, details: [{ product_id: 1, quantity: 1, tipo_precio: 'menudeo' }], payments: [{ method: 'efectivo', amount: 250.1 }] },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.id, 4);
});

test('índices y llaves foráneas siguen funcionando', async () => {
  // El código de barras sigue siendo único
  await assert.rejects(correr(db, `INSERT INTO products (articulo, codigo_barras, category_id) VALUES ('Copia', '750-1', 1)`), /UNIQUE/);
  // Ninguna llave foránea rota y siguen activas para Prisma (familia con productos → 409)
  assert.deepEqual(await todas(db, 'PRAGMA foreign_key_check'), []);
  const token = await login('gerente');
  assert.equal((await api('DELETE', '/api/categories/1', { token })).status, 409);
  // Y los movimientos que dependen de las tablas reconstruidas conservan su liga
  const renglones = await todas(db, 'SELECT s.id FROM sale_details d JOIN sales s ON s.id = d.sale_id');
  assert.ok(renglones.length >= 2);
});

test('hubo respaldo antes de migrar', async () => {
  const respaldos = fs.readdirSync(process.env.BACKUP_DIR).filter((f) => f.startsWith('pos_antes_'));
  assert.equal(respaldos.length, 1);
});

test('migración 5: las ventas anteriores quedan sin costo (no se toma el costo actual)', async () => {
  const { n, con } = await dbGet(db, 'SELECT COUNT(*) AS n, COUNT(costo_unitario) AS con FROM sale_details');
  assert.ok(n > 0);
  assert.equal(con, 0);
  assert.equal((await dbGet(db, 'SELECT COUNT(costo) AS con FROM products')).con, 0);
});
