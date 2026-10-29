// Pruebas de la tanda de productos y kardex con Prisma
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
const tokens = {};
const ids = {};

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);

  ids.cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Ropa', subfamily: 'Blusas' } })).data.id;
  ids.otraCat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Calzado' } })).data.id;
  const alta = (body) => api('POST', '/api/products', { token: tokens.gerente, body: { category_id: ids.cat, activo: true, ...body } });
  ids.blusa = (await alta({ articulo: 'Blusa Floral', codigo_barras: '750100', precio_menudeo: 199.9, precio_mayoreo: 150, iva: 16, stock: 4 })).data.id;
  ids.falda = (await alta({ articulo: 'Falda Larga', codigo_barras: '750200', precio_menudeo: 250, stock: 2 })).data.id;
  ids.inactivo = (await alta({ articulo: 'Blusa Vieja', precio_menudeo: 99, activo: false })).data.id;
});

after(detener);

test('la lista y el detalle traen el producto en pesos con su familia y subfamilia', async () => {
  const lista = await api('GET', '/api/products', { token: tokens.cajero });
  assert.equal(lista.status, 200);
  // Ordenada por nombre
  assert.deepEqual(lista.data.map((p) => p.articulo), ['Blusa Floral', 'Blusa Vieja', 'Falda Larga']);

  const blusa = (await api('GET', `/api/products/${ids.blusa}`, { token: tokens.cajero })).data;
  assert.equal(blusa.precio_menudeo, 199.9);
  assert.equal(blusa.precio_mayoreo, 150);
  assert.equal(blusa.precio_especial, null);
  assert.equal(blusa.stock, 4);
  assert.equal(blusa.family, 'Ropa');
  assert.equal(blusa.subfamily, 'Blusas');
  assert.equal(blusa.categories, undefined);
  // En la base, centavos
  assert.equal((await dbGet(db, 'SELECT precio_menudeo FROM products WHERE id = ?', [ids.blusa])).precio_menudeo, 19990);
});

test('buscar por código de barras y por nombre (solo activos, sin distinguir mayúsculas)', async () => {
  const porCodigo = await api('GET', '/api/products/barcode/750100', { token: tokens.cajero });
  assert.equal(porCodigo.status, 200);
  assert.equal(porCodigo.data.id, ids.blusa);
  assert.equal(porCodigo.data.family, 'Ropa');
  assert.equal((await api('GET', '/api/products/barcode/000', { token: tokens.cajero })).status, 404);

  const porNombre = await api('GET', '/api/products/search?query=blusa', { token: tokens.cajero });
  assert.deepEqual(porNombre.data.map((p) => p.id), [ids.blusa]);
  assert.equal(porNombre.data[0].precio_menudeo, 199.9);
  assert.equal(porNombre.data[0].subfamily, 'Blusas');
  assert.deepEqual((await api('GET', '/api/products/search?term=b', { token: tokens.cajero })).data, []);
});

test('editar un producto cambia precio, familia y estado, pero nunca el stock', async () => {
  const r = await api('PUT', `/api/products/${ids.falda}`, {
    token: tokens.gerente,
    body: { precio_menudeo: '275.50', category_id: ids.otraCat, activo: false, stock: 999, iva: '' },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const falda = (await api('GET', `/api/products/${ids.falda}`, { token: tokens.cajero })).data;
  assert.equal(falda.precio_menudeo, 275.5);
  assert.equal(falda.family, 'Calzado');
  assert.equal(falda.activo, 0);
  assert.equal(falda.iva, null);
  assert.equal(falda.stock, 2);
});

test('editar: código de barras repetido 409, familia inexistente 400, número inválido 400 y 404', async () => {
  const rep = await api('PUT', `/api/products/${ids.falda}`, { token: tokens.gerente, body: { codigo_barras: '750100' } });
  assert.equal(rep.status, 409);
  assert.match(rep.data.error, /código de barras/);

  assert.equal((await api('PUT', `/api/products/${ids.falda}`, { token: tokens.gerente, body: { category_id: 9999 } })).status, 400);
  assert.equal((await api('PUT', `/api/products/${ids.falda}`, { token: tokens.gerente, body: { precio_menudeo: 'caro' } })).status, 400);
  assert.equal((await api('PUT', `/api/products/${ids.falda}`, { token: tokens.gerente, body: { iva: 'mucho' } })).status, 400);
  assert.equal((await api('PUT', '/api/products/9999', { token: tokens.gerente, body: { articulo: 'X' } })).status, 404);

  // Nada de lo anterior cambió el producto
  const falda = await dbGet(db, 'SELECT codigo_barras, category_id, precio_menudeo FROM products WHERE id = ?', [ids.falda]);
  assert.deepEqual({ ...falda }, { codigo_barras: '750200', category_id: ids.otraCat, precio_menudeo: 27550 });
});

test('el alta con código de barras repetido responde 409 sin crear producto ni kardex', async () => {
  const antes = (await dbGet(db, 'SELECT COUNT(*) AS n FROM kardex')).n;
  const r = await api('POST', '/api/products', {
    token: tokens.gerente,
    body: { articulo: 'Copia', codigo_barras: '750100', category_id: ids.cat, stock: 3 },
  });
  assert.equal(r.status, 409);
  assert.equal((await dbGet(db, 'SELECT COUNT(*) AS n FROM kardex')).n, antes);
  assert.equal(await dbGet(db, `SELECT id FROM products WHERE articulo = 'Copia'`), undefined);
});

test('borrar: con movimientos responde 409 (se desactiva), 404 si no existe', async () => {
  const r = await api('DELETE', `/api/products/${ids.blusa}`, { token: tokens.gerente });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /desactívalo/);
  assert.ok(await dbGet(db, 'SELECT id FROM products WHERE id = ?', [ids.blusa]));
  assert.equal((await api('DELETE', '/api/products/9999', { token: tokens.gerente })).status, 404);

  // Un producto sin ningún movimiento (sembrado sin kardex) sí se borra
  await new Promise((res, rej) =>
    db.run(`INSERT INTO products (id, articulo, category_id) VALUES (500, 'Sin movimientos', ?)`, [ids.cat], (e) => (e ? rej(e) : res()))
  );
  assert.equal((await api('DELETE', '/api/products/500', { token: tokens.gerente })).status, 200);
});

test('el kardex de un producto sale en orden: alta, venta y entrada', async () => {
  const venta = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: { type: 'contado', total_esperado: 199.9, details: [{ product_id: ids.blusa, quantity: 1, tipo_precio: 'menudeo' }], payments: [{ method: 'efectivo', amount: 199.9 }] },
  });
  assert.equal(venta.status, 201, JSON.stringify(venta.data));
  const entrada = await api('POST', '/api/entries', {
    token: tokens.gerente,
    body: { entry_type: 'ENTRADA', movement_reason: 'COMPRA_PROVEEDOR', items: [{ product_id: ids.blusa, quantity: 5 }] },
  });
  assert.equal(entrada.status, 201, JSON.stringify(entrada.data));

  const k = await api('GET', `/api/kardex/product/${ids.blusa}`, { token: tokens.gerente });
  assert.equal(k.status, 200);
  assert.deepEqual(
    k.data.map((m) => [m.movement_type, m.previous_stock, m.moved_quantity, m.new_stock]),
    [['ALTA', 0, 4, 4], ['SALIDA', 4, 1, 3], ['ENTRADA', 3, 5, 8]]
  );
  assert.equal((await api('GET', `/api/products/${ids.blusa}`, { token: tokens.cajero })).data.stock, 8);
  assert.equal((await api('GET', '/api/kardex/product/abc', { token: tokens.gerente })).status, 400);
});

test('POST /api/kardex ya no existe: el kardex no se escribe desde el navegador', async () => {
  const antes = (await dbGet(db, 'SELECT COUNT(*) AS n FROM kardex')).n;
  const r = await api('POST', '/api/kardex', {
    token: tokens.admin,
    clave: crypto.randomUUID(),
    body: { product_id: ids.blusa, movement_type: 'ENTRADA', previous_stock: 0, moved_quantity: 100, new_stock: 100 },
  });
  assert.equal(r.status, 404);
  assert.equal((await dbGet(db, 'SELECT COUNT(*) AS n FROM kardex')).n, antes);
});
