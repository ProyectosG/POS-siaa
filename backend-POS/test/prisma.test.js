// Pruebas de Prisma: categorías y que una transacción abierta no congele el servidor
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
const tokens = {};

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);
});

after(detener);

test('crear, listar y editar una categoría con Prisma', async () => {
  const alta = await api('POST', '/api/categories', { token: tokens.gerente, body: { family: '  Ropa ', subfamily: 'Blusas' } });
  assert.equal(alta.status, 201);
  assert.ok(Number.isInteger(alta.data.id));

  // Lo que escribió Prisma lo ve la conexión sqlite3
  const fila = await dbGet(db, 'SELECT family, subfamily FROM categories WHERE id = ?', [alta.data.id]);
  assert.deepEqual({ ...fila }, { family: 'Ropa', subfamily: 'Blusas' });

  const edit = await api('PUT', `/api/categories/${alta.data.id}`, { token: tokens.gerente, body: { family: 'Ropa', subfamily: 'Vestidos' } });
  assert.equal(edit.status, 200);

  const lista = await api('GET', '/api/categories', { token: tokens.cajero });
  assert.equal(lista.status, 200);
  assert.deepEqual(lista.data.find((c) => c.id === alta.data.id), { id: alta.data.id, family: 'Ropa', subfamily: 'Vestidos' });
});

test('editar o borrar una categoría que no existe responde 404', async () => {
  assert.equal((await api('PUT', '/api/categories/9999', { token: tokens.gerente, body: { family: 'X' } })).status, 404);
  assert.equal((await api('DELETE', '/api/categories/9999', { token: tokens.gerente })).status, 404);
  assert.equal((await api('DELETE', '/api/categories/abc', { token: tokens.gerente })).status, 400);
});

test('no se borra una categoría con productos (409) y sí una vacía', async () => {
  const cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Juguetes' } })).data.id;
  const prod = await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Pelota', category_id: cat, precio_menudeo: 50, stock: 0, activo: true },
  });
  assert.equal(prod.status, 201, JSON.stringify(prod.data));

  const r = await api('DELETE', `/api/categories/${cat}`, { token: tokens.gerente });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /la familia Juguetes tiene 1 producto/);
  assert.ok(await dbGet(db, 'SELECT id FROM categories WHERE id = ?', [cat]));

  const vacia = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Temporal' } })).data.id;
  assert.equal((await api('DELETE', `/api/categories/${vacia}`, { token: tokens.gerente })).status, 200);
  assert.equal(await dbGet(db, 'SELECT id FROM categories WHERE id = ?', [vacia]), undefined);
});

test('una consulta espera a que termine la transacción abierta, sin congelar el servidor', async () => {
  const { enTransaccion } = require('../src/config/transaccion');
  // Una transacción escribe y tarda 800 ms; mientras, Prisma intenta escribir
  const larga = enTransaccion(async (tx) => {
    await tx.categories.create({ data: { family: 'Dentro de transacción' } });
    await new Promise((r) => setTimeout(r, 800));
  });
  await new Promise((r) => setTimeout(r, 100));

  // Latido: si Node se congelara mientras Prisma espera, no habría latidos
  let latidos = 0;
  const latido = setInterval(() => latidos++, 50);
  const inicio = Date.now();
  const alta = await api('POST', '/api/categories', { token: tokens.gerente, body: { family: 'Mientras tanto' } });
  const espera = Date.now() - inicio;
  clearInterval(latido);
  await larga;

  assert.equal(alta.status, 201, JSON.stringify(alta.data));
  assert.ok(espera >= 500, `Prisma esperó a que terminara la transacción (${espera} ms)`);
  assert.ok(latidos >= 8, `el servidor siguió respondiendo mientras tanto (${latidos} latidos)`);
  assert.ok(await dbGet(db, `SELECT id FROM categories WHERE family = 'Dentro de transacción'`));
});

test('la conexión sqlite3 del arranque está cerrada mientras se atiende', async () => {
  const arranque = require('../src/config/database');
  assert.equal(arranque.cerradaArranque(), true);
  // Cualquier uso de esa conexión falla: nada del servidor la puede usar ya
  await assert.rejects(
    new Promise((res, rej) => arranque.get('SELECT 1', (e, r) => (e ? rej(e) : res(r)))),
    /closed|MISUSE/i
  );
  // Y el servidor sigue atendiendo con Prisma
  assert.equal((await api('GET', '/api/categories', { token: tokens.cajero })).status, 200);
});
