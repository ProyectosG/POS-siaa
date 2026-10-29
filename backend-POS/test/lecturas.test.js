// Pruebas de la tanda de lecturas con Prisma: ventas, tickets, estado de cuenta,
// entradas, salidas y cortes
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
const tokens = {};
const ids = {};

const correr = (sql, params = []) =>
  new Promise((res, rej) => db.run(sql, params, (e) => (e ? rej(e) : res())));

async function vender(body) {
  const r = await api('POST', '/api/sales', { token: tokens.cajero, body });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.id;
}

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);

  const cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Ropa' } })).data.id;
  ids.blusa = (await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Blusa Roja', codigo_barras: 'BR1', presentacion: 'CH', category_id: cat, precio_menudeo: 250, iva: 16, stock: 10, activo: true },
  })).data.id;
  ids.ana = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Ana', last_name_paternal: 'Ruiz', phone: '5551112222' } })).data.id;

  // Contado, apartado y crédito de Ana
  ids.contado = await vender({
    type: 'contado', total_esperado: 250,
    details: [{ product_id: ids.blusa, quantity: 1, tipo_precio: 'menudeo' }],
    payments: [{ method: 'efectivo', amount: 250 }],
  });
  ids.apartado = await vender({
    type: 'apartado', customer_id: ids.ana, total_esperado: 500,
    details: [{ product_id: ids.blusa, quantity: 2, tipo_precio: 'menudeo' }],
    payments: [{ method: 'efectivo', amount: 100 }],
  });
  ids.credito = await vender({
    type: 'credito', customer_id: ids.ana, total_esperado: 250,
    details: [{ product_id: ids.blusa, quantity: 1, tipo_precio: 'menudeo' }],
    payments: [],
  });
  const abono = await api('POST', '/api/apartados/abono', {
    token: tokens.cajero, body: { sale_id: ids.apartado, pagos: [{ method: 'tarjeta', amount: 50, bank: 'BBVA', last4: '1234' }] },
  });
  assert.equal(abono.status, 200, JSON.stringify(abono.data));

  // Después de vender, el producto cambia de nombre en el catálogo
  assert.equal((await api('PUT', `/api/products/${ids.blusa}`, { token: tokens.gerente, body: { articulo: 'Blusa Roja (nueva temporada)' } })).status, 200);
});

after(detener);

test('lista de ventas: la más reciente primero, en pesos', async () => {
  const r = await api('GET', '/api/sales', { token: tokens.gerente });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.map((v) => v.id), [ids.credito, ids.apartado, ids.contado]);
  const apartado = r.data.find((v) => v.id === ids.apartado);
  assert.equal(apartado.total, 500);
  assert.equal(apartado.paid, 150);
  assert.equal(apartado.pending_balance, 350);
  assert.match(apartado.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('detalle de una venta: renglones con el nombre guardado al vender, pagos, cliente y cajero', async () => {
  const r = await api('GET', `/api/sales/${ids.apartado}`, { token: tokens.cajero });
  assert.equal(r.status, 200);
  assert.equal(r.data.type, 'apartado');
  assert.equal(r.data.total, 500);

  assert.equal(r.data.details.length, 1);
  const renglon = r.data.details[0];
  assert.equal(renglon.articulo, 'Blusa Roja'); // no el nombre nuevo del catálogo
  assert.equal(renglon.quantity, 2);
  assert.equal(renglon.price, 250);
  assert.equal(renglon.subtotal, 431.03); // sin IVA: 500 / 1.16
  assert.equal(renglon.products, undefined);

  assert.deepEqual(r.data.payments.map((p) => [p.payment_type, p.method, p.amount]), [['anticipo', 'efectivo', 100], ['abono', 'tarjeta', 50]]);
  assert.deepEqual(r.data.client, { id: ids.ana, first_name: 'Ana', last_name_paternal: 'Ruiz', last_name_maternal: null, phone: '5551112222' });
  assert.deepEqual(r.data.user, { id: 1, name: 'cajero' });

  // Un renglón viejo sin nombre guardado usa el del catálogo
  await correr('UPDATE sale_details SET articulo = NULL WHERE sale_id = ?', [ids.contado]);
  const viejo = await api('GET', `/api/sales/${ids.contado}`, { token: tokens.cajero });
  assert.equal(viejo.data.details[0].articulo, 'Blusa Roja (nueva temporada)');
  assert.equal(viejo.data.client, null);

  assert.equal((await api('GET', '/api/sales/9999', { token: tokens.cajero })).status, 404);
  assert.equal((await api('GET', '/api/sales/abc', { token: tokens.cajero })).status, 404);
});

test('rango de tickets por fecha', async () => {
  const hoy = (await dbGet(db, 'SELECT date FROM sales WHERE id = ?', [ids.contado])).date;
  const r = await api('GET', `/api/sales/range?desde=${hoy}&hasta=${hoy}`, { token: tokens.cajero });
  assert.deepEqual(r.data, { firstTicket: ids.contado, lastTicket: ids.credito });
  const vacio = await api('GET', '/api/sales/range?desde=2000-01-01&hasta=2000-01-31', { token: tokens.cajero });
  assert.deepEqual(vacio.data, { firstTicket: null, lastTicket: null });
  assert.equal((await api('GET', '/api/sales/range', { token: tokens.cajero })).status, 400);
});

test('texto del ticket con el nombre guardado; 404 si la venta no existe', async () => {
  const r = await api('GET', `/api/tickets/${ids.apartado}/text`, { token: tokens.cajero });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.match(r.data.ticketText, /Blusa Roja/);
  assert.doesNotMatch(r.data.ticketText, /nueva temporada/);
  assert.equal((await api('GET', '/api/tickets/9999/text', { token: tokens.cajero })).status, 404);
});

test('estado de cuenta (statement): ventas del cliente con renglones, pagos e historial', async () => {
  const r = await api('GET', `/api/customers/${ids.ana}/statement`, { token: tokens.cajero });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.map((v) => v.id), [ids.credito, ids.apartado]);

  const apartado = r.data[1];
  assert.equal(apartado.nickname_user, 'cajero');
  assert.equal(apartado.pending_balance, 350);
  assert.equal(apartado.details[0].articulo, 'Blusa Roja');
  assert.deepEqual(apartado.payments.map((p) => p.amount), [100, 50]);
  // Historial de esa venta: la deuda del apartado (+400) y el abono (-50)
  assert.deepEqual(apartado.balance_history.map((h) => h.amount).sort((a, b) => a - b), [-50, 400]);

  assert.deepEqual((await api('GET', '/api/customers/9999/statement', { token: tokens.cajero })).data, []);
});

test('historial de saldo en orden cronológico con su tipo de movimiento', async () => {
  const r = await api('GET', `/api/customers/${ids.ana}/balance-history`, { token: tokens.cajero });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.map((m) => [m.amount, m.movement_type]), [
    [400, 'Venta / Cargo'],
    [250, 'Venta / Cargo'],
    [-50, 'Abono / Pago'],
  ]);
  assert.equal(r.data[2].new_balance, 600);
});

test('estado de cuenta resumido: saldo actual y movimientos (el más reciente primero); 404', async () => {
  const r = await api('GET', `/api/customers/${ids.ana}/estado-cuenta`, { token: tokens.cajero });
  assert.equal(r.status, 200);
  assert.equal(r.data.current_balance, 600);
  assert.deepEqual(r.data.movements.map((m) => m.amount), [-50, 250, 400]);
  assert.equal((await api('GET', '/api/customers/9999/estado-cuenta', { token: tokens.cajero })).status, 404);
});

test('apartados pendientes del cliente (sin créditos ni pagados)', async () => {
  const r = await api('GET', `/api/apartados/${ids.ana}`, { token: tokens.cajero });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, [{ id: ids.apartado, date: r.data[0].date, total: 500, paid: 150, pending_balance: 350, status: 'pending' }]);
});

test('entradas y salidas: lista y detalle con artículo, presentación y código', async () => {
  const e = await api('POST', '/api/entries', {
    token: tokens.gerente,
    body: { entry_type: 'ENTRADA', movement_reason: 'COMPRA_PROVEEDOR', items: [{ product_id: ids.blusa, quantity: 4 }] },
  });
  assert.equal(e.status, 201, JSON.stringify(e.data));
  const lista = await api('GET', '/api/entries', { token: tokens.gerente });
  assert.equal(lista.data.length, 1);
  const entrada = await api('GET', `/api/entries/${lista.data[0].id}`, { token: tokens.gerente });
  assert.equal(entrada.data.entry_type, 'ENTRADA');
  assert.deepEqual(
    entrada.data.items.map((i) => [i.product_id, i.quantity, i.articulo, i.presentacion, i.codigo_barras]),
    [[ids.blusa, 4, 'Blusa Roja (nueva temporada)', 'CH', 'BR1']]
  );
  assert.equal((await api('GET', '/api/entries/9999', { token: tokens.gerente })).status, 404);

  const s = await api('POST', '/api/outs', {
    token: tokens.gerente,
    body: { out_type: 'SALIDA', movement_reason: 'MERMA', items: [{ product_id: ids.blusa, quantity: 1 }] },
  });
  assert.equal(s.status, 201, JSON.stringify(s.data));
  const salidas = await api('GET', '/api/outs', { token: tokens.gerente });
  assert.equal(salidas.data.length, 1);
  const salida = await api('GET', `/api/outs/${salidas.data[0].id}`, { token: tokens.gerente });
  assert.equal(salida.data.items[0].codigo_barras, 'BR1');
  assert.equal(salida.data.nickname_user, 'gerente');
  assert.equal((await api('GET', '/api/outs/abc', { token: tokens.gerente })).status, 404);
});

test('cortes: lista con filtros por tipo y fechas, detalle en pesos y 404', async () => {
  assert.equal((await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X' } })).status, 201);
  // Un corte Z viejo, sembrado con otra fecha
  await correr(`INSERT INTO cuts (type, date, desde, hasta, total_sales, total_recibido) VALUES ('Z', '2025-12-31', '1', '1', 10000, 10000)`);

  const todos = await api('GET', '/api/cuts', { token: tokens.gerente });
  assert.equal(todos.data.length, 2);
  assert.equal(todos.data[1].date, '2025-12-31'); // el más reciente primero

  const soloZ = await api('GET', '/api/cuts?type=Z', { token: tokens.gerente });
  assert.deepEqual(soloZ.data.map((c) => [c.type, c.total_sales]), [['Z', 100]]);
  const enDiciembre = await api('GET', '/api/cuts?fromDate=2025-12-01&toDate=2025-12-31', { token: tokens.gerente });
  assert.equal(enDiciembre.data.length, 1);

  const x = todos.data[0];
  assert.equal(x.type, 'X');
  assert.equal(x.total_recibido, 400); // 250 + 100 + 50
  const detalle = await api('GET', `/api/cuts/${x.id}`, { token: tokens.gerente });
  assert.deepEqual(detalle.data, x);
  assert.equal((await api('GET', '/api/cuts/9999', { token: tokens.gerente })).status, 404);
});
