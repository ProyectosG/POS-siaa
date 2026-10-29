// Pruebas del cobro de ventas a crédito con abonos (POST /api/apartados/abono)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
const tokens = {};
const ids = {};

const saldo = async (cliente) => (await dbGet(db, 'SELECT current_balance FROM customers WHERE id = ?', [cliente])).current_balance;
const venta = (id) => dbGet(db, 'SELECT paid, pending_balance, status FROM sales WHERE id = ?', [id]);
const abonar = (sale_id, monto, extra = {}) =>
  api('POST', '/api/apartados/abono', {
    token: tokens.cajero,
    clave: extra.clave,
    body: { sale_id, pagos: [{ method: 'efectivo', amount: monto }], ...extra.body },
  });

async function vender(type, customer_id, pagos = []) {
  const r = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type, customer_id, total_esperado: 300,
      details: [{ product_id: ids.prod, quantity: 1, tipo_precio: 'menudeo' }],
      payments: pagos,
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.id;
}

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);
  const cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Hogar' } })).data.id;
  ids.prod = (await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Lámpara', category_id: cat, precio_menudeo: 300, stock: 20, activo: true },
  })).data.id;
  ids.ana = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Ana' } })).data.id;
  ids.beto = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Beto' } })).data.id;
});

after(detener);

test('un abono a un crédito baja lo pendiente y el saldo del cliente, con historial', async () => {
  const credito = await vender('credito', ids.ana);
  assert.equal(await saldo(ids.ana), 30000);

  const r = await abonar(credito, 120);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.deepEqual({ newPaid: r.data.newPaid, newPending: r.data.newPending, status: r.data.status }, { newPaid: 120, newPending: 180, status: 'pending' });

  assert.deepEqual({ ...(await venta(credito)) }, { paid: 12000, pending_balance: 18000, status: 'pending' });
  assert.equal(await saldo(ids.ana), 18000);

  const h = await dbGet(db, 'SELECT amount, description FROM customer_balance_history WHERE customer_id = ? ORDER BY id DESC LIMIT 1', [ids.ana]);
  assert.equal(h.amount, -12000);
  assert.match(h.description, /Abono a crédito #\d+/);

  const pago = await dbGet(db, 'SELECT payment_type, amount FROM payments WHERE sale_id = ? ORDER BY id DESC LIMIT 1', [credito]);
  assert.deepEqual({ ...pago }, { payment_type: 'abono', amount: 12000 });
  ids.credito = credito;
});

test('pasarse de lo pendiente responde 400 y no registra nada', async () => {
  const antes = await venta(ids.credito);
  const r = await abonar(ids.credito, 180.01);
  assert.equal(r.status, 400);
  assert.match(r.data.error, /excede/);
  assert.deepEqual({ ...(await venta(ids.credito)) }, { ...antes });
  assert.equal(await saldo(ids.ana), 18000);
});

test('liquidar un crédito lo deja pagado y el cliente sin deuda', async () => {
  const r = await abonar(ids.credito, 180);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.status, 'paid');
  assert.deepEqual({ ...(await venta(ids.credito)) }, { paid: 30000, pending_balance: 0, status: 'paid' });
  assert.equal(await saldo(ids.ana), 0);

  // Ya pagado: otro abono no entra
  assert.equal((await abonar(ids.credito, 1)).status, 400);
});

test('no se abona al crédito de otro cliente ni a una venta de contado', async () => {
  const credito = await vender('credito', ids.ana);
  const otro = await abonar(credito, 50, { body: { customer_id: ids.beto } });
  assert.equal(otro.status, 400);
  assert.match(otro.data.error, /apartado ni un crédito de este cliente/);

  const contado = await vender('contado', null, [{ method: 'efectivo', amount: 300 }]);
  assert.equal((await abonar(contado, 50)).status, 400);

  assert.equal((await venta(credito)).paid, 0);
});

test('el apartado sigue aceptando abonos y su historial dice "apartado"', async () => {
  const apartado = await vender('apartado', ids.beto, [{ method: 'efectivo', amount: 100 }]);
  const r = await abonar(apartado, 50);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const h = await dbGet(db, 'SELECT description FROM customer_balance_history WHERE customer_id = ? ORDER BY id DESC LIMIT 1', [ids.beto]);
  assert.match(h.description, /Abono a apartado #\d+/);
});

test('repetir la misma clave registra el abono a crédito una sola vez', async () => {
  const credito = await vender('credito', ids.beto);
  const clave = crypto.randomUUID();
  const primero = await abonar(credito, 40, { clave });
  const segundo = await abonar(credito, 40, { clave });
  assert.equal(primero.status, 200);
  assert.equal(segundo.status, 200);
  assert.equal(segundo.data.repetida, true);
  assert.equal((await venta(credito)).paid, 4000);
  assert.equal((await dbGet(db, 'SELECT COUNT(*) AS n FROM payments WHERE sale_id = ?', [credito])).n, 1);
});

test('el corte X cuenta los abonos a crédito', async () => {
  // Corte con todo lo anterior y luego un abono nuevo a un crédito
  assert.equal((await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X' } })).status, 201);
  const credito = await vender('credito', ids.ana);
  assert.equal((await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X' } })).status, 201);
  assert.equal((await abonar(credito, 75)).status, 200);

  const actual = await api('GET', '/api/cuts/current', { token: tokens.cajero });
  assert.equal(actual.data.total_abonos, 75);
  assert.equal(actual.data.total_recibido, 75);
});
