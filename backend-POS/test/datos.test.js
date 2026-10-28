// Pruebas de la clave de precios y de la lista de apartados
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
let tokens;

before(async () => {
  ({ db } = await iniciar());
  tokens = { cajero: await login('cajero'), admin: await login('admin') };
});

after(detener);

test('la clave de precios ya no sale en GET /api/settings', async () => {
  const r = await api('GET', '/api/settings', { token: tokens.cajero });
  assert.equal(r.status, 200);
  assert.equal('dynamic_price_auth_key' in r.data, false);

  // Tampoco en la respuesta del PUT
  const put = await api('PUT', '/api/settings', { token: tokens.admin, body: { ticket_width: 58 } });
  assert.equal('dynamic_price_auth_key' in put.data, false);
});

test('la clave de precios se valida en el servidor y solo el Administrador la cambia', async () => {
  // La clave por omisión (1234) quedó con hash al arrancar y sigue sirviendo
  let r = await api('POST', '/api/settings/validar-clave-precio', { token: tokens.cajero, body: { clave: '1234' } });
  assert.deepEqual(r.data, { valida: true });
  r = await api('POST', '/api/settings/validar-clave-precio', { token: tokens.cajero, body: { clave: '0000' } });
  assert.deepEqual(r.data, { valida: false });

  // Cajero no la cambia
  r = await api('PUT', '/api/settings', { token: tokens.cajero, body: { dynamic_price_auth_key: '9999' } });
  assert.equal(r.status, 403);

  // Administrador sí; se guarda con hash
  r = await api('PUT', '/api/settings', { token: tokens.admin, body: { dynamic_price_auth_key: '9876' } });
  assert.equal(r.status, 200);
  const row = await dbGet(db, 'SELECT dynamic_price_auth_key AS k FROM settings');
  assert.match(row.k, /^\$2[aby]\$/);

  r = await api('POST', '/api/settings/validar-clave-precio', { token: tokens.cajero, body: { clave: '9876' } });
  assert.equal(r.data.valida, true);

  // Vacía = no se cambia
  await api('PUT', '/api/settings', { token: tokens.admin, body: { dynamic_price_auth_key: '' } });
  r = await api('POST', '/api/settings/validar-clave-precio', { token: tokens.cajero, body: { clave: '9876' } });
  assert.equal(r.data.valida, true);
});

test('la lista de apartados encuentra las ventas guardadas con type "apartado"', async () => {
  // Datos: un cliente, un producto y un apartado como lo guarda el frontend
  const cat = await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Ropa', subfamily: 'Playeras' } });
  const catId = cat.data.id ?? (await dbGet(db, 'SELECT id FROM categories LIMIT 1')).id;
  await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Playera', category_id: catId, precio_menudeo: 100, stock: 10, activo: true },
  });
  const prod = await dbGet(db, "SELECT id FROM products WHERE articulo = 'Playera'");
  const cliente = await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Rosa' } });
  const customerId = cliente.data.id;

  const venta = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'apartado',
      customer_id: customerId,
      total_esperado: 100,
      details: [{ product_id: prod.id, quantity: 1, tipo_precio: 'menudeo' }],
      payments: [{ method: 'efectivo', amount: 30, payment_type: 'anticipo' }],
    },
  });
  assert.equal(venta.status, 201, JSON.stringify(venta.data));

  // Una venta vieja guardada en mayúsculas también aparece (montos en centavos)
  await new Promise((resolve, reject) =>
    db.run(
      `INSERT INTO sales (date, type, customer_id, subtotal, total, paid, pending_balance, status)
       VALUES ('2026-01-01', 'APARTADO', ?, 5000, 5000, 1000, 4000, 'pending')`,
      [customerId],
      (err) => (err ? reject(err) : resolve())
    )
  );

  let lista = await api('GET', `/api/apartados/${customerId}`, { token: tokens.cajero });
  assert.equal(lista.status, 200);
  assert.equal(lista.data.length, 2);
  assert.ok(lista.data.some((v) => v.id === venta.data.id));

  // Abono que liquida el apartado: deja de aparecer
  const abono = await api('POST', '/api/apartados/abono', {
    token: tokens.cajero,
    body: {
      sale_id: venta.data.id,
      customer_id: customerId,
      amount: 70,
      pagos: [{ method: 'efectivo', amount: 70, payment_type: 'abono' }],
    },
  });
  assert.equal(abono.status, 200, JSON.stringify(abono.data));
  assert.equal(abono.data.status, 'paid');

  lista = await api('GET', `/api/apartados/${customerId}`, { token: tokens.cajero });
  assert.equal(lista.data.length, 1);
  assert.equal(lista.data[0].id === venta.data.id, false);
});

test('un abono no se puede aplicar a la venta de otro cliente', async () => {
  const otro = await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Otro' } });
  const apartado = await dbGet(db, "SELECT id FROM sales WHERE type = 'APARTADO' LIMIT 1");
  const r = await api('POST', '/api/apartados/abono', {
    token: tokens.cajero,
    body: { sale_id: apartado.id, customer_id: otro.data.id, amount: 5, pagos: [{ method: 'efectivo', amount: 5 }] },
  });
  assert.equal(r.status, 400);
});
