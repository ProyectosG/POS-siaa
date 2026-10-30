// Historial de códigos de barras: cada cambio queda anotado con quién y cuándo,
// y una etiqueta vieja todavía encuentra su producto
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
const tokens = {};
const ids = {};

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);

  ids.cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Papelería' } })).data.id;
  const alta = (body) => api('POST', '/api/products', { token: tokens.gerente, body: { category_id: ids.cat, activo: true, ...body } });
  ids.lapiz = (await alta({ articulo: 'Lápiz', codigo_barras: '880100', precio_menudeo: 10 })).data.id;
  ids.goma = (await alta({ articulo: 'Goma', codigo_barras: '880200', precio_menudeo: 8 })).data.id;
  ids.regla = (await alta({ articulo: 'Regla', precio_menudeo: 15 })).data.id;
});

after(detener);

const editar = (id, body, token = tokens.gerente) => api('PUT', `/api/products/${id}`, { token, body });
const historial = (id, token = tokens.gerente) => api('GET', `/api/products/${id}/codigos`, { token });

test('el alta no deja historial', async () => {
  const r = await historial(ids.lapiz);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, []);
});

test('cambiar el código deja una fila con el usuario y la fecha del negocio', async () => {
  assert.equal((await editar(ids.lapiz, { codigo_barras: '880111', precio_menudeo: 11 })).status, 200);

  const r = await historial(ids.lapiz);
  assert.equal(r.data.length, 1);
  const [cambio] = r.data;
  assert.equal(cambio.codigo_anterior, '880100');
  assert.equal(cambio.codigo_nuevo, '880111');
  assert.equal(cambio.nickname_user, 'gerente');
  assert.match(cambio.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(cambio.time, /^\d{2}:\d{2}/);

  // El resto de la edición también se guardó
  const lapiz = (await api('GET', `/api/products/${ids.lapiz}`, { token: tokens.cajero })).data;
  assert.equal(lapiz.codigo_barras, '880111');
  assert.equal(lapiz.precio_menudeo, 11);
});

test('guardar con el mismo código, o sin mandarlo, no deja fila', async () => {
  assert.equal((await editar(ids.lapiz, { codigo_barras: '880111', articulo: 'Lápiz HB' })).status, 200);
  assert.equal((await editar(ids.lapiz, { precio_menudeo: 12 })).status, 200);
  assert.equal((await historial(ids.lapiz)).data.length, 1);
});

test('poner y quitar el código también se anota (vacío = sin código)', async () => {
  assert.equal((await editar(ids.regla, { codigo_barras: '880300' })).status, 200);
  assert.equal((await editar(ids.regla, { codigo_barras: '' })).status, 200);

  const r = (await historial(ids.regla)).data;
  // Del más reciente al más viejo
  assert.deepEqual(
    r.map((c) => [c.codigo_anterior, c.codigo_nuevo]),
    [['880300', null], [null, '880300']]
  );
});

test('un código repetido responde 409 y no cambia nada ni deja fila', async () => {
  const r = await editar(ids.goma, { codigo_barras: '880111', precio_menudeo: 99 });
  assert.equal(r.status, 409);
  assert.equal((await historial(ids.goma)).data.length, 0);
  const goma = await dbGet(db, 'SELECT codigo_barras, precio_menudeo FROM products WHERE id = ?', [ids.goma]);
  assert.equal(goma.codigo_barras, '880200');
  assert.equal(goma.precio_menudeo, 800);
});

test('el historial es para Gerente o superior; un producto que no existe da 404', async () => {
  assert.equal((await historial(ids.lapiz, tokens.cajero)).status, 403);
  assert.equal((await historial(ids.lapiz, tokens.admin)).status, 200);
  assert.equal((await historial(999999)).status, 404);
});

test('escanear un código viejo encuentra el producto y avisa el código actual', async () => {
  const r = await api('GET', '/api/products/barcode/880100', { token: tokens.cajero });
  assert.equal(r.status, 200);
  assert.equal(r.data.id, ids.lapiz);
  assert.deepEqual(r.data.codigo_cambiado, { anterior: '880100', actual: '880111' });
  // El cajero no ve el costo, tampoco por esta vía
  assert.equal('costo' in r.data, false);

  // Con el código actual no hay aviso
  const actual = await api('GET', '/api/products/barcode/880111', { token: tokens.cajero });
  assert.equal(actual.data.id, ids.lapiz);
  assert.equal(actual.data.codigo_cambiado, undefined);

  // Un código que nadie tuvo sigue en 404
  assert.equal((await api('GET', '/api/products/barcode/123456', { token: tokens.cajero })).status, 404);
});

test('si el código viejo ya lo tiene otro producto, gana el producto actual', async () => {
  // La goma toma el código que dejó el lápiz
  assert.equal((await editar(ids.goma, { codigo_barras: '880100' })).status, 200);
  const r = await api('GET', '/api/products/barcode/880100', { token: tokens.cajero });
  assert.equal(r.data.id, ids.goma);
  assert.equal(r.data.codigo_cambiado, undefined);

  // Y el código que dejó la goma lleva a la goma
  const vieja = await api('GET', '/api/products/barcode/880200', { token: tokens.cajero });
  assert.equal(vieja.data.id, ids.goma);
  assert.equal(vieja.data.codigo_cambiado.actual, '880100');
});
