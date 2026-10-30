// Borrar una familia completa: todo o nada
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

const categoria = async (family, subfamily) =>
  (await api('POST', '/api/categories', { token: tokens.gerente, body: { family, subfamily } })).data.id;
const producto = (category_id, articulo, activo = true) =>
  api('POST', '/api/products', { token: tokens.gerente, body: { category_id, articulo, precio_menudeo: 10, activo } });
const borrarFamilia = (nombre, token = tokens.gerente) =>
  api('DELETE', `/api/categories/familia/${encodeURIComponent(nombre)}`, { token });
const filas = async (family) => (await dbGet(db, 'SELECT COUNT(*) AS n FROM categories WHERE family = ?', [family])).n;

test('una familia sin productos se borra completa, con sus subfamilias', async () => {
  await categoria('Juguetes');
  await categoria('Juguetes', 'Muñecas');
  await categoria('Juguetes', 'Pelotas');
  await categoria('Otra', 'Juguetes'); // una subfamilia con el mismo nombre no es la familia

  const r = await borrarFamilia('Juguetes');
  assert.equal(r.status, 200);
  assert.equal(r.data.borradas, 3);
  assert.equal(await filas('Juguetes'), 0);
  assert.equal(await filas('Otra'), 1);
});

test('si una subfamilia tiene productos, no se borra nada y el mensaje dice dónde', async () => {
  await categoria('Ropa');
  const blusas = await categoria('Ropa', 'Blusas');
  await categoria('Ropa', 'Faldas');
  await producto(blusas, 'Blusa Floral');
  await producto(blusas, 'Blusa Lisa');

  const r = await borrarFamilia('Ropa');
  assert.equal(r.status, 409);
  assert.match(r.data.error, /No se puede eliminar la familia Ropa: tiene productos en Blusas \(2 productos\)/);
  // Las vacías tampoco se borraron
  assert.equal(await filas('Ropa'), 3);
});

test('un producto desactivado también impide borrar, y el mensaje lo aclara', async () => {
  const principal = await categoria('Hogar');
  const cocina = await categoria('Hogar', 'Cocina');
  await producto(principal, 'Cubeta');
  await producto(cocina, 'Sartén viejo', false);

  const r = await borrarFamilia('Hogar');
  assert.equal(r.status, 409);
  assert.match(r.data.error, /sin subfamilia \(1 producto\) y Cocina \(1 producto, 1 desactivado\)/);
  assert.equal(await filas('Hogar'), 2);
});

test('un nombre con espacios y acentos funciona', async () => {
  await categoria('Línea Blanca');
  await categoria('Línea Blanca', 'Refrigeradores');
  const r = await borrarFamilia('Línea Blanca');
  assert.equal(r.status, 200);
  assert.equal(await filas('Línea Blanca'), 0);
});

test('familia inexistente da 404 y el cajero no puede borrar', async () => {
  assert.equal((await borrarFamilia('No Existe')).status, 404);

  await categoria('Papelería');
  assert.equal((await borrarFamilia('Papelería', tokens.cajero)).status, 403);
  assert.equal(await filas('Papelería'), 1);
});

test('borrar una subfamilia sola con productos dice cuántos tiene', async () => {
  await categoria('Calzado');
  const tenis = await categoria('Calzado', 'Tenis');
  await producto(tenis, 'Tenis Blanco');

  const r = await api('DELETE', `/api/categories/${tenis}`, { token: tokens.gerente });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /la subfamilia Tenis tiene 1 producto\. Muévelos/);
});
