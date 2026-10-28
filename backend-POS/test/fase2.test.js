// Pruebas de la Fase 2: abonos en el corte, stock solo por kardex, impresión del
// corte, autorización de precio de un solo uso y reset de las tablas auxiliares
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
const tokens = {};
const ids = {};

const contar = async (tabla) => (await dbGet(db, `SELECT COUNT(*) AS n FROM ${tabla}`)).n;

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);

  const cat = await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Ropa' } });
  const alta = await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Vestido', category_id: cat.data.id, precio_menudeo: 300, stock: 7, activo: true },
  });
  ids.vestido = alta.data.id;
  ids.cliente = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Ana' } })).data.id;
});

after(detener);

test('el stock inicial del alta queda en el kardex', async () => {
  const k = await dbGet(db, 'SELECT movement_type, previous_stock, moved_quantity, new_stock FROM kardex WHERE product_id = ?', [ids.vestido]);
  assert.deepEqual({ ...k }, { movement_type: 'ALTA', previous_stock: 0, moved_quantity: 7, new_stock: 7 });
});

test('editar un producto no cambia su stock (solo ventas, entradas y salidas)', async () => {
  const r = await api('PUT', `/api/products/${ids.vestido}`, { token: tokens.admin, body: { precio_menudeo: 300, stock: 999 } });
  assert.equal(r.status, 200);
  assert.equal((await dbGet(db, 'SELECT stock FROM products WHERE id = ?', [ids.vestido])).stock, 7);
});

test('un abono a un apartado de antes del último corte entra en el corte siguiente', async () => {
  // Apartado con anticipo de 90 y corte X que lo cubre
  const venta = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'apartado',
      customer_id: ids.cliente,
      total_esperado: 300,
      details: [{ product_id: ids.vestido, quantity: 1, tipo_precio: 'menudeo' }],
      payments: [{ method: 'efectivo', amount: 90 }],
    },
  });
  assert.equal(venta.status, 201, JSON.stringify(venta.data));

  const x1 = await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X' } });
  assert.equal(x1.status, 201, JSON.stringify(x1.data));
  assert.equal((await dbGet(db, 'SELECT total_recibido FROM cuts WHERE id = ?', [x1.data.id])).total_recibido, 9000);

  // Sin movimientos nuevos no hay corte
  assert.equal((await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X' } })).status, 400);

  // Abono al apartado viejo: no hay tickets nuevos, pero sí un cobro
  const abono = await api('POST', '/api/apartados/abono', {
    token: tokens.cajero,
    body: { sale_id: venta.data.id, pagos: [{ method: 'efectivo', amount: 60 }] },
  });
  assert.equal(abono.status, 200, JSON.stringify(abono.data));

  const actual = await api('GET', '/api/cuts/current', { token: tokens.cajero });
  assert.equal(actual.data.total_abonos, 60);
  assert.equal(actual.data.total_recibido, 60);
  assert.equal(actual.data.ticketRange.first_ticket, null);
  assert.equal(actual.data.hay_movimientos, true);

  const x2 = await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X' } });
  assert.equal(x2.status, 201, JSON.stringify(x2.data));
  const corte = await dbGet(db, 'SELECT total_abonos, total_sales, first_ticket, last_ticket FROM cuts WHERE id = ?', [x2.data.id]);
  assert.deepEqual({ ...corte }, { total_abonos: 6000, total_sales: 0, first_ticket: null, last_ticket: venta.data.id });

  // El Z (desde el último Z, que no hay) junta la venta, el anticipo y el abono
  const z = await api('GET', '/api/cuts/current-z', { token: tokens.gerente });
  assert.equal(z.data.ventas.total_ventas_monto, 300);
  assert.equal(z.data.total_recibido, 150);
});

test('imprimir el corte en curso: X cualquiera, Z solo Gerente o superior', async () => {
  // Sin impresora conectada responde 200 en modo prueba con el texto del ticket
  const x = await api('GET', '/api/cuts/print/current?tipo=X', { token: tokens.cajero });
  assert.equal(x.status, 200, JSON.stringify(x.data));
  assert.ok(x.data.message);

  assert.equal((await api('GET', '/api/cuts/print/current?tipo=Z', { token: tokens.cajero })).status, 403);
  const z = await api('GET', '/api/cuts/print/current?tipo=Z', { token: tokens.gerente });
  assert.equal(z.status, 200, JSON.stringify(z.data));
  if (z.data.ticketText) assert.match(z.data.ticketText, /CORTE Z/);
});

test('la autorización de precio libre sirve una sola vez', async () => {
  const aut = await api('POST', '/api/settings/validar-clave-precio', {
    token: tokens.cajero,
    body: { clave: '1234', product_id: ids.vestido, precio: 250 },
  });
  assert.ok(aut.data.autorizacion);

  const venta = () => api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'contado',
      total_esperado: 250,
      details: [{ product_id: ids.vestido, quantity: 1, autorizacion_precio: aut.data.autorizacion }],
      payments: [{ method: 'efectivo', amount: 250 }],
    },
  });

  assert.equal((await venta()).status, 201);
  const segunda = await venta();
  assert.equal(segunda.status, 400);
  assert.match(segunda.data.error, /ya se usó/);
});

test('el reset de ventas también vacía las claves de operación y autorizaciones usadas', async () => {
  assert.ok((await contar('idempotencia')) > 0);
  assert.ok((await contar('autorizaciones_usadas')) > 0);

  const sd = await api('POST', '/api/superdev/entrar', { body: { nickname: 'superdev', password: 'clave-super-de-prueba' } });
  const r = await api('POST', '/api/reset/tables', {
    token: sd.data.token,
    clave: crypto.randomUUID(),
    body: { tables: ['sale_details', 'payments', 'sales'] },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(await contar('sales'), 0);
  assert.equal(await contar('idempotencia'), 0);
  assert.equal(await contar('autorizaciones_usadas'), 0);
});
