// Reporte de utilidad: costo solo para el Administrador, costo del momento de la
// venta guardado en el renglón y cuentas del reporte (con y sin IVA, descuento,
// renglones sin costo, apartados)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet } = require('./helpers');
const { ahoraNegocio } = require('../src/utils/fechas');
const { rangoPeriodo, costoSinIva } = require('../src/utils/utilidad');

let db;
const tokens = {};
const ids = {};
const hoy = ahoraNegocio().date;

const vender = (body) => api('POST', '/api/sales', { token: tokens.cajero, body });
const reporte = (token = tokens.gerente) => api('GET', `/api/reportes/utilidad?desde=${hoy}&hasta=${hoy}`, { token });

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);
  const cat = await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Abarrotes', subfamily: 'Básicos' } });
  ids.cat = cat.data.id;
  const nuevo = async (body) => {
    const r = await api('POST', '/api/products', { token: tokens.admin, body: { category_id: ids.cat, activo: true, stock: 50, ...body } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.id;
  };
  // Arroz sin IVA; Aceite con IVA (costo neto 58 → 50 sin IVA); Jabón sin costo
  ids.arroz = await nuevo({ articulo: 'Arroz', codigo_barras: '750-arroz', precio_menudeo: 30, costo: 20 });
  ids.aceite = await nuevo({ articulo: 'Aceite', precio_menudeo: 116, iva: 1, costo: 58 });
  ids.jabon = await nuevo({ articulo: 'Jabón', precio_menudeo: 25 });
  ids.cliente = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Rosa' } })).data.id;
});

after(detener);

test('la migración 5 agrega costo y costo_unitario', async () => {
  assert.equal((await dbGet(db, 'PRAGMA user_version')).user_version, 7);
  assert.equal((await dbGet(db, `SELECT type FROM pragma_table_info('products') WHERE name = 'costo'`)).type, 'INTEGER');
  assert.equal((await dbGet(db, `SELECT type FROM pragma_table_info('sale_details') WHERE name = 'costo_unitario'`)).type, 'INTEGER');
  assert.equal((await dbGet(db, 'SELECT costo FROM products WHERE id = ?', [ids.aceite])).costo, 5800);
});

test('solo el Administrador captura el costo', async () => {
  const alta = await api('POST', '/api/products', { token: tokens.gerente, body: { articulo: 'Frijol', category_id: ids.cat, costo: 15 } });
  assert.equal(alta.status, 403);
  const cambio = await api('PUT', `/api/products/${ids.arroz}`, { token: tokens.gerente, body: { costo: 1 } });
  assert.equal(cambio.status, 403);
  // Sin costo, el gerente sí edita el producto
  assert.equal((await api('PUT', `/api/products/${ids.arroz}`, { token: tokens.gerente, body: { presentacion: '1 kg' } })).status, 200);
  assert.equal((await dbGet(db, 'SELECT costo FROM products WHERE id = ?', [ids.arroz])).costo, 2000);
});

test('el costo no sale para quien no es Administrador', async () => {
  for (const u of ['cajero', 'gerente']) {
    const t = tokens[u];
    const lista = (await api('GET', '/api/products', { token: t })).data;
    assert.ok(lista.length > 0 && lista.every((p) => !('costo' in p)), `lista ${u}`);
    assert.ok(!('costo' in (await api('GET', `/api/products/${ids.arroz}`, { token: t })).data), `por id ${u}`);
    assert.ok(!('costo' in (await api('GET', '/api/products/barcode/750-arroz', { token: t })).data), `código ${u}`);
    assert.ok((await api('GET', '/api/products/search?term=Arr', { token: t })).data.every((p) => !('costo' in p)), `búsqueda ${u}`);
  }
  assert.equal((await api('GET', `/api/products/${ids.aceite}`, { token: tokens.admin })).data.costo, 58);
});

test('la venta guarda el costo del momento y el detalle no lo muestra', async () => {
  // 2 Arroz (60) + 1 Aceite (116) = 176
  const v = await vender({
    type: 'contado', total_esperado: 176,
    details: [{ product_id: ids.arroz, quantity: 2 }, { product_id: ids.aceite, quantity: 1 }],
    payments: [{ method: 'efectivo', amount: 176 }],
  });
  assert.equal(v.status, 201, JSON.stringify(v.data));
  ids.venta1 = v.data.id;
  const r = await dbGet(db, 'SELECT costo_unitario FROM sale_details WHERE sale_id = ? AND product_id = ?', [ids.venta1, ids.arroz]);
  assert.equal(r.costo_unitario, 2000);

  const detalle = await api('GET', `/api/sales/${ids.venta1}`, { token: tokens.cajero });
  assert.equal(detalle.status, 200);
  const renglones = JSON.stringify(detalle.data);
  assert.ok(!renglones.includes('costo'), 'el detalle de la venta no trae costo');

  // El costo cambia después: la utilidad de esa venta no
  assert.equal((await api('PUT', `/api/products/${ids.arroz}`, { token: tokens.admin, body: { costo: 25 } })).status, 200);
  const rep = (await reporte()).data;
  // Arroz: venta 60, costo 40, utilidad 20. Aceite: venta 100 (sin IVA), costo 50, utilidad 50
  assert.deepEqual(rep.totales, { ventas: 1, venta_sin_iva: 160, costo: 90, utilidad: 70, margen: 43.8 });
  const arroz = rep.productos.find((p) => p.product_id === ids.arroz);
  assert.deepEqual({ cantidad: arroz.cantidad, costo: arroz.costo, utilidad: arroz.utilidad }, { cantidad: 2, costo: 40, utilidad: 20 });
  assert.equal(rep.productos[0].articulo, 'Aceite', 'ordenados por utilidad');
});

test('renglones sin costo quedan fuera y se informan aparte', async () => {
  // Jabón (sin costo, 25) + Arroz (ya con costo 25 → utilidad 5)
  const v = await vender({
    type: 'contado', total_esperado: 55,
    details: [{ product_id: ids.jabon, quantity: 1 }, { product_id: ids.arroz, quantity: 1 }],
    payments: [{ method: 'efectivo', amount: 55 }],
  });
  assert.equal(v.status, 201, JSON.stringify(v.data));
  const rep = (await reporte()).data;
  assert.deepEqual(rep.sin_costo, { renglones: 1, ventas: 1, venta_sin_iva: 25, importe: 25 });
  assert.deepEqual(rep.totales, { ventas: 2, venta_sin_iva: 190, costo: 115, utilidad: 75, margen: 39.5 });
  assert.ok(!rep.productos.some((p) => p.product_id === ids.jabon));
});

test('con descuento la utilidad baja y el costo no cambia', async () => {
  assert.equal((await api('PUT', '/api/settings', { token: tokens.admin, body: { allow_discounts: 1, max_discount_without_auth: 10 } })).status, 200);
  // Aceite con 10 %: 104.40 con IVA → 90 sin IVA; costo 50 → utilidad 40
  const antes = (await reporte()).data.totales;
  const v = await vender({
    type: 'contado', total_esperado: 104.4,
    details: [{ product_id: ids.aceite, quantity: 1, discount_pct: 10 }],
    payments: [{ method: 'efectivo', amount: 104.4 }],
  });
  assert.equal(v.status, 201, JSON.stringify(v.data));
  const despues = (await reporte()).data.totales;
  assert.equal(Math.round((despues.venta_sin_iva - antes.venta_sin_iva) * 100), 9000);
  assert.equal(Math.round((despues.costo - antes.costo) * 100), 5000);
  assert.equal(Math.round((despues.utilidad - antes.utilidad) * 100), 4000);
});

test('el apartado cuenta el día de la venta y lo pendiente sale aparte', async () => {
  const antes = (await reporte()).data;
  const v = await vender({
    type: 'apartado', customer_id: ids.cliente, total_esperado: 116,
    details: [{ product_id: ids.aceite, quantity: 1 }],
    payments: [{ method: 'efectivo', amount: 50 }],
  });
  assert.equal(v.status, 201, JSON.stringify(v.data));
  const rep = (await reporte()).data;
  assert.equal(rep.totales.utilidad - antes.totales.utilidad, 50);
  assert.deepEqual(rep.pendiente, { ventas: 1, monto: 66 });
  assert.equal(rep.dias.length, 1);
  assert.equal(rep.dias[0].fecha, hoy);
  assert.equal(rep.dias[0].ventas, rep.totales.ventas);
});

test('permisos y parámetros del reporte', async () => {
  assert.equal((await reporte(tokens.cajero)).status, 403);
  assert.equal((await reporte(tokens.admin)).status, 200);
  for (const p of ['hoy', 'semana', 'mes']) {
    const r = await api('GET', `/api/reportes/utilidad?periodo=${p}`, { token: tokens.gerente });
    assert.equal(r.status, 200, p);
    assert.equal(r.data.hasta, hoy);
  }
  assert.equal((await api('GET', '/api/reportes/utilidad?periodo=anio', { token: tokens.gerente })).status, 400);
  assert.equal((await api('GET', '/api/reportes/utilidad?desde=2026-1-1&hasta=2026-01-31', { token: tokens.gerente })).status, 400);
  assert.equal((await api('GET', '/api/reportes/utilidad?desde=2026-02-01&hasta=2026-01-31', { token: tokens.gerente })).status, 400);
});

test('semana = lunes a hoy; mes = mes en curso', () => {
  assert.deepEqual(rangoPeriodo('semana', '2026-10-29'), { desde: '2026-10-26', hasta: '2026-10-29' }); // jueves
  assert.deepEqual(rangoPeriodo('semana', '2026-10-26'), { desde: '2026-10-26', hasta: '2026-10-26' }); // lunes
  assert.deepEqual(rangoPeriodo('semana', '2026-11-01'), { desde: '2026-10-26', hasta: '2026-11-01' }); // domingo
  assert.deepEqual(rangoPeriodo('mes', '2026-03-01'), { desde: '2026-03-01', hasta: '2026-03-01' });
  assert.deepEqual(rangoPeriodo('hoy', '2026-10-29'), { desde: '2026-10-29', hasta: '2026-10-29' });
});

test('costo sin IVA: se le quita el 16 % solo si el renglón llevó IVA', () => {
  assert.equal(costoSinIva(5800, 1, 16), 5000);
  assert.equal(costoSinIva(2000, 3, 0), 6000);
  assert.equal(costoSinIva(1000, 1, null), 1000);
});
