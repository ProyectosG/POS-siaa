// Pruebas de la Fase 1: el servidor calcula el dinero, transacciones, idempotencia,
// centavos, zona horaria y precio libre autorizado
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { iniciar, detener, api, login, dbGet } = require('./helpers');
const { aCentavos, aPesos } = require('../src/utils/dinero');
const { ahoraNegocio } = require('../src/utils/fechas');

let db;
const tokens = {};
const ids = {};

const contar = async (tabla) => (await dbGet(db, `SELECT COUNT(*) AS n FROM ${tabla}`)).n;
const stock = async (id) => (await dbGet(db, 'SELECT stock FROM products WHERE id = ?', [id])).stock;

// Venta de contado de un renglón, pagada exacta en efectivo
const ventaContado = (productId, total, extra = {}) => ({
  type: 'contado',
  total_esperado: total,
  details: [{ product_id: productId, quantity: 1, tipo_precio: 'menudeo' }],
  payments: [{ method: 'efectivo', amount: total }],
  ...extra,
});

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);

  const cat = await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Ropa', subfamily: 'Blusas' } });
  const nuevo = async (body) => {
    await api('POST', '/api/products', { token: tokens.admin, body: { category_id: cat.data.id, activo: true, ...body } });
    return (await dbGet(db, 'SELECT id FROM products WHERE articulo = ?', [body.articulo])).id;
  };
  // Blusa con IVA incluido; la Gorra no lleva IVA y solo hay una
  ids.blusa = await nuevo({ articulo: 'Blusa', precio_menudeo: 300, precio_mayoreo: 250, iva: 1, stock: 20 });
  ids.gorra = await nuevo({ articulo: 'Gorra', precio_menudeo: 33.33, stock: 1 });
  ids.calcetin = await nuevo({ articulo: 'Calcetín', precio_menudeo: 50, stock: 100 });

  ids.cliente = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'María' } })).data.id;
});

after(detener);

test('dinero: pesos ↔ centavos sin errores de redondeo', () => {
  assert.equal(aCentavos(0.1 + 0.2), 30);
  assert.equal(aCentavos(1.005), 101);
  assert.equal(aCentavos('19.99'), 1999);
  assert.equal(aPesos(1999), 19.99);
  assert.equal(aCentavos(''), null);
});

test('fechas: una sola zona horaria (América/Mexico_City) aunque sea otro día en UTC', () => {
  // 03:30 del 15 en UTC son las 21:30 del 14 en el centro de México
  assert.deepEqual(ahoraNegocio(new Date('2026-01-15T03:30:00Z')), { date: '2026-01-14', time: '21:30:00' });
});

test('los precios del catálogo se guardan en centavos y salen en pesos', async () => {
  const fila = await dbGet(db, 'SELECT precio_menudeo FROM products WHERE id = ?', [ids.gorra]);
  assert.equal(fila.precio_menudeo, 3333);
  const p = await api('GET', `/api/products/${ids.gorra}`, { token: tokens.cajero });
  assert.equal(p.data.precio_menudeo, 33.33);
});

test('sin Idempotency-Key la venta se rechaza', async () => {
  const r = await api('POST', '/api/sales', { token: tokens.cajero, clave: null, body: ventaContado(ids.blusa, 300) });
  assert.equal(r.status, 400);
});

test('precio alterado desde el navegador → 409 y no se registra nada', async () => {
  const ventas = await contar('sales');
  const antes = await stock(ids.blusa);

  const r = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'contado',
      total_esperado: 1,
      details: [{ product_id: ids.blusa, quantity: 1, price: 1, subtotal: 1, tipo_precio: 'menudeo' }],
      payments: [{ method: 'efectivo', amount: 1 }],
      total: 1,
    },
  });
  assert.equal(r.status, 409);
  assert.equal(r.data.total_servidor, 300);
  assert.equal(await contar('sales'), ventas);
  assert.equal(await stock(ids.blusa), antes);
});

test('venta de contado: el servidor calcula IVA incluido, cambio, fecha y guarda en centavos', async () => {
  const antes = await stock(ids.blusa);
  const r = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: ventaContado(ids.blusa, 300, { efectivo_recibido: 500 }),
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.total, 300);
  assert.equal(r.data.cambio, 200);

  const venta = await dbGet(db, 'SELECT * FROM sales WHERE id = ?', [r.data.id]);
  assert.equal(venta.total, 30000);
  assert.equal(venta.subtotal, 25862); // 300 / 1.16
  assert.equal(venta.tax_total, 4138);
  assert.equal(venta.cambio, 20000);
  assert.equal(venta.date, ahoraNegocio().date);
  assert.equal(await stock(ids.blusa), antes - 1);

  // El API responde en pesos
  const g = await api('GET', `/api/sales/${r.data.id}`, { token: tokens.cajero });
  assert.equal(g.data.total, 300);
  assert.equal(g.data.payments[0].amount, 300);
  assert.equal(g.data.details[0].base_price, 300);
});

test('el tipo de precio (mayoreo) sale del catálogo', async () => {
  const r = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'contado',
      total_esperado: 250,
      details: [{ product_id: ids.blusa, quantity: 1, tipo_precio: 'mayoreo' }],
      payments: [{ method: 'efectivo', amount: 250 }],
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.total, 250);
});

test('pago que no cubre el total de contado → 400', async () => {
  const r = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: { ...ventaContado(ids.calcetin, 50), payments: [{ method: 'efectivo', amount: 40 }] },
  });
  assert.equal(r.status, 400);
});

test('descuentos: rechazados si pasan del máximo de configuración', async () => {
  const conDescuento = (pct, total) => ({
    type: 'contado',
    total_esperado: total,
    details: [{ product_id: ids.blusa, quantity: 1, tipo_precio: 'menudeo', discount_pct: pct }],
    payments: [{ method: 'efectivo', amount: total }],
  });

  // Máximo por omisión: 0 %
  assert.equal((await api('POST', '/api/sales', { token: tokens.cajero, body: conDescuento(10, 270) })).status, 400);

  const s = await api('PUT', '/api/settings', { token: tokens.admin, body: { allow_discounts: 1, max_discount_without_auth: 10 } });
  assert.equal(s.status, 200);

  const ok = await api('POST', '/api/sales', { token: tokens.cajero, body: conDescuento(10, 270) });
  assert.equal(ok.status, 201, JSON.stringify(ok.data));
  const venta = await dbGet(db, 'SELECT total, discount_total FROM sales WHERE id = ?', [ok.data.id]);
  assert.equal(venta.total, 27000);
  assert.equal(venta.discount_total, 3000);

  assert.equal((await api('POST', '/api/sales', { token: tokens.cajero, body: conDescuento(15, 255) })).status, 400);
});

test('idempotencia: la misma clave dos veces (incluso al mismo tiempo) registra una sola venta', async () => {
  const ventas = await contar('sales');
  const antes = await stock(ids.calcetin);
  const clave = crypto.randomUUID();
  const body = ventaContado(ids.calcetin, 50);

  const [a, b] = await Promise.all([
    api('POST', '/api/sales', { token: tokens.cajero, body, clave }),
    api('POST', '/api/sales', { token: tokens.cajero, body, clave }),
  ]);
  const c = await api('POST', '/api/sales', { token: tokens.cajero, body, clave });

  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(a.data.id, b.data.id);
  assert.equal(c.data.id, a.data.id);
  assert.equal(c.data.repetida, true);
  assert.equal(await contar('sales'), ventas + 1);
  assert.equal(await stock(ids.calcetin), antes - 1);
});

test('dos ventas simultáneas de la última pieza: solo una pasa', async () => {
  assert.equal(await stock(ids.gorra), 1);
  const body = ventaContado(ids.gorra, 33.33);

  const resultados = await Promise.all([
    api('POST', '/api/sales', { token: tokens.cajero, body }),
    api('POST', '/api/sales', { token: tokens.cajero, body }),
  ]);
  const estados = resultados.map((r) => r.status).sort();
  assert.deepEqual(estados, [201, 409]);
  assert.equal(await stock(ids.gorra), 0);
});

test('apartado: el saldo del cliente sube por lo pendiente y baja con cada abono', async () => {
  const saldo = async () => (await api('GET', `/api/customers/${ids.cliente}`, { token: tokens.cajero })).data.current_balance;

  // Sin anticipo o sin cliente no hay apartado
  const sinAnticipo = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: { type: 'apartado', customer_id: ids.cliente, total_esperado: 300, details: [{ product_id: ids.blusa, quantity: 1 }], payments: [] },
  });
  assert.equal(sinAnticipo.status, 400);

  const r = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'apartado',
      customer_id: ids.cliente,
      total_esperado: 300,
      details: [{ product_id: ids.blusa, quantity: 1, tipo_precio: 'menudeo' }],
      payments: [{ method: 'efectivo', amount: 90 }],
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.pending_balance, 210);
  assert.equal(await saldo(), 210);

  const pago = await dbGet(db, 'SELECT payment_type, amount FROM payments WHERE sale_id = ?', [r.data.id]);
  assert.deepEqual({ ...pago }, { payment_type: 'anticipo', amount: 9000 });

  // Abono repetido con la misma clave: cuenta una sola vez
  const clave = crypto.randomUUID();
  const abono = { sale_id: r.data.id, customer_id: ids.cliente, amount: 60, pagos: [{ method: 'efectivo', amount: 60 }] };
  const a1 = await api('POST', '/api/apartados/abono', { token: tokens.cajero, body: abono, clave });
  const a2 = await api('POST', '/api/apartados/abono', { token: tokens.cajero, body: abono, clave });
  assert.equal(a1.status, 200, JSON.stringify(a1.data));
  assert.equal(a1.data.newPending, 150);
  assert.equal(a2.data.repetida, true);
  assert.equal(await saldo(), 150);

  // No se puede abonar más de lo que se debe
  const demas = await api('POST', '/api/apartados/abono', {
    token: tokens.cajero,
    body: { sale_id: r.data.id, pagos: [{ method: 'efectivo', amount: 151 }] },
  });
  assert.equal(demas.status, 400);
  assert.equal(await saldo(), 150);
});

test('precio libre: requiere la clave, la autorización es solo para ese producto y se limita a 5 intentos', async () => {
  const validar = (body) => api('POST', '/api/settings/validar-clave-precio', { token: tokens.cajero, body });

  // Sin autorización el precio libre no existe: el servidor usa el del catálogo
  const mala = await validar({ clave: 'equivocada', product_id: ids.calcetin, precio: 45.5 });
  assert.equal(mala.data.valida, false);
  assert.equal(mala.data.autorizacion, undefined);

  const ok = await validar({ clave: '1234', product_id: ids.calcetin, precio: 45.5 });
  assert.equal(ok.data.valida, true);
  assert.ok(ok.data.autorizacion);

  const venta = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'contado',
      total_esperado: 45.5,
      details: [{ product_id: ids.calcetin, quantity: 1, autorizacion_precio: ok.data.autorizacion }],
      payments: [{ method: 'efectivo', amount: 45.5 }],
    },
  });
  assert.equal(venta.status, 201, JSON.stringify(venta.data));
  const renglon = await dbGet(db, 'SELECT price, precio_libre FROM sale_details WHERE sale_id = ?', [venta.data.id]);
  assert.deepEqual({ ...renglon }, { price: 4550, precio_libre: 1 });

  // La autorización no sirve para otro producto ni para otro usuario
  const otroProducto = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'contado',
      total_esperado: 45.5,
      details: [{ product_id: ids.blusa, quantity: 1, autorizacion_precio: ok.data.autorizacion }],
      payments: [{ method: 'efectivo', amount: 45.5 }],
    },
  });
  assert.equal(otroProducto.status, 400);
  const otroUsuario = await api('POST', '/api/sales', {
    token: tokens.gerente,
    body: {
      type: 'contado',
      total_esperado: 45.5,
      details: [{ product_id: ids.calcetin, quantity: 1, autorizacion_precio: ok.data.autorizacion }],
      payments: [{ method: 'efectivo', amount: 45.5 }],
    },
  });
  assert.equal(otroUsuario.status, 400);

  // 5 claves equivocadas → bloqueado, aunque después mande la buena
  for (let i = 0; i < 5; i++) await validar({ clave: `mala-${i}` });
  assert.equal((await validar({ clave: '1234' })).status, 429);
  await require('../src/controllers/settings.controller')._limpiarIntentosClave();
});

test('entrada con un producto inexistente: no queda nada a medias', async () => {
  const entradas = await contar('entries');
  const antes = await stock(ids.calcetin);
  const r = await api('POST', '/api/entries', {
    token: tokens.gerente,
    body: { entry_type: 'COMPRA_PROVEEDOR', items: [{ product_id: ids.calcetin, quantity: 5 }, { product_id: 99999, quantity: 1 }] },
  });
  assert.equal(r.status, 400);
  assert.equal(await contar('entries'), entradas);
  assert.equal(await stock(ids.calcetin), antes);

  const ok = await api('POST', '/api/entries', {
    token: tokens.gerente,
    body: { entry_type: 'COMPRA_PROVEEDOR', items: [{ product_id: ids.calcetin, quantity: 5 }] },
  });
  assert.equal(ok.status, 201);
  assert.equal(await stock(ids.calcetin), antes + 5);
});

test('salida sin stock suficiente: 409 y no queda nada a medias', async () => {
  const salidas = await contar('outs');
  const antes = await stock(ids.calcetin);
  const r = await api('POST', '/api/outs', {
    token: tokens.gerente,
    body: { out_type: 'MERMA', items: [{ product_id: ids.calcetin, quantity: 1 }, { product_id: ids.gorra, quantity: 1 }] },
  });
  assert.equal(r.status, 409);
  assert.equal(await contar('outs'), salidas);
  assert.equal(await stock(ids.calcetin), antes);
});

test('corte: el servidor calcula los montos e ignora los que manda el navegador', async () => {
  const esperado = await dbGet(db, 'SELECT SUM(total) AS total FROM sales');
  const r = await api('POST', '/api/cuts', {
    token: tokens.gerente,
    body: { type: 'Z', total_sales: 1, cash_in_box: 1, first_ticket: 1, last_ticket: 1 },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));

  const corte = await dbGet(db, 'SELECT * FROM cuts WHERE id = ?', [r.data.id]);
  assert.equal(corte.total_sales, esperado.total);
  assert.equal(corte.date, ahoraNegocio().date);

  const g = await api('GET', `/api/cuts/${r.data.id}`, { token: tokens.gerente });
  assert.equal(g.data.total_sales, aPesos(esperado.total));

  // Sin ventas nuevas no hay otro corte Z
  assert.equal((await api('POST', '/api/cuts', { token: tokens.gerente, body: { type: 'Z' } })).status, 400);
});
