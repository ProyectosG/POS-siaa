// Pruebas de permisos por rol y de campos permitidos
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { USUARIOS, iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
const tokens = {};

before(async () => {
  ({ db } = await iniciar());
  for (const nombre of Object.keys(USUARIOS)) tokens[nombre] = await login(nombre);
});

after(detener);

test('cajero recibe 403 en usuarios', async () => {
  const t = tokens.cajero;
  assert.equal((await api('GET', '/api/users', { token: t })).status, 403);
  assert.equal((await api('POST', '/api/users', { token: t, body: { nickname: 'x', password: 'x' } })).status, 403);
  assert.equal((await api('PUT', '/api/users/1', { token: t, body: { access_level: 99 } })).status, 403);
  assert.equal((await api('DELETE', '/api/users/4', { token: t })).status, 403);
});

test('cajero recibe 403 en configuración', async () => {
  const t = tokens.cajero;
  assert.equal((await api('PUT', '/api/settings', { token: t, body: { ticket_width: 80 } })).status, 403);
  // Puede leerla (sin la clave) para operar
  assert.equal((await api('GET', '/api/settings', { token: t })).status, 200);
});

test('cajero recibe 403 en catálogo, inventario y reportes', async () => {
  const t = tokens.cajero;
  assert.equal((await api('POST', '/api/products', { token: t, body: { articulo: 'X', category_id: 1 } })).status, 403);
  assert.equal((await api('PUT', '/api/products/1', { token: t, body: { precio_menudeo: 1 } })).status, 403);
  assert.equal((await api('DELETE', '/api/products/1', { token: t })).status, 403);
  assert.equal((await api('POST', '/api/categories', { token: t, body: { family: 'X' } })).status, 403);
  assert.equal((await api('POST', '/api/cash-registers', { token: t, body: { numero_caja: '9', password: 'x' } })).status, 403);
  assert.equal((await api('GET', '/api/entries', { token: t })).status, 403);
  assert.equal((await api('GET', '/api/outs', { token: t })).status, 403);
  assert.equal((await api('GET', '/api/kardex/product/1', { token: t })).status, 403);
  assert.equal((await api('GET', '/api/sales', { token: t })).status, 403);
  assert.equal((await api('GET', '/api/cuts', { token: t })).status, 403);
  assert.equal((await api('POST', '/api/cuts', { token: t, body: { type: 'Z' } })).status, 403);
});

test('cajero sí puede ver productos, familias y clientes y dar de alta clientes', async () => {
  const t = tokens.cajero;
  assert.equal((await api('GET', '/api/products', { token: t })).status, 200);
  assert.equal((await api('GET', '/api/categories', { token: t })).status, 200);
  assert.equal((await api('GET', '/api/customers', { token: t })).status, 200);
  const alta = await api('POST', '/api/customers', { token: t, body: { first_name: 'Ana' } });
  assert.equal(alta.status, 201);
  // Editar clientes ya es de Gerente
  assert.equal((await api('PUT', `/api/customers/${alta.data.id}`, { token: t, body: { phone: '1' } })).status, 403);
});

test('supervisor tampoco entra al catálogo; gerente sí, pero no a usuarios ni configuración', async () => {
  assert.equal((await api('POST', '/api/categories', { token: tokens.supervisor, body: { family: 'X' } })).status, 403);

  const g = tokens.gerente;
  assert.equal((await api('POST', '/api/categories', { token: g, body: { family: 'Abarrotes', subfamily: 'Granos' } })).status, 201);
  assert.equal((await api('GET', '/api/entries', { token: g })).status, 200);
  assert.equal((await api('GET', '/api/users', { token: g })).status, 403);
  assert.equal((await api('PUT', '/api/settings', { token: g, body: { ticket_width: 80 } })).status, 403);
});

test('campos no permitidos se ignoran (usuarios, clientes, productos, configuración)', async () => {
  const admin = tokens.admin;

  // Usuario: un campo inventado no rompe ni se inyecta
  const u = await api('PUT', '/api/users/1', {
    token: admin,
    body: { full_name: 'Cajero Uno', 'id = 99, password': 'x', created_at: '2000-01-01' },
  });
  assert.equal(u.status, 200);
  const user = await dbGet(db, 'SELECT id, full_name, created_at FROM users WHERE nickname = ?', ['cajero']);
  assert.equal(user.id, 1);
  assert.equal(user.full_name, 'Cajero Uno');
  assert.notEqual(user.created_at, '2000-01-01');

  // Cliente: el saldo no se cambia a mano
  const c = await api('POST', '/api/customers', { token: admin, body: { first_name: 'Luis' } });
  const editado = await api('PUT', `/api/customers/${c.data.id}`, {
    token: admin,
    body: { phone: '555', current_balance: 99999, 'first_name = (SELECT password FROM users)': 'x' },
  });
  assert.equal(editado.status, 200);
  const cliente = await dbGet(db, 'SELECT phone, current_balance, first_name FROM customers WHERE id = ?', [c.data.id]);
  assert.equal(cliente.phone, '555');
  assert.equal(cliente.current_balance, 0);
  assert.equal(cliente.first_name, 'Luis');

  // Configuración: id y campos raros ignorados
  const s = await api('PUT', '/api/settings', {
    token: admin,
    body: { ticket_width: 80, id: 5, 'ticket_width = 1, id': 7 },
  });
  assert.equal(s.status, 200);
  const settings = await dbGet(db, 'SELECT id, ticket_width FROM settings');
  assert.equal(settings.id, 1);
  assert.equal(settings.ticket_width, 80);

  // Producto
  const cat = await dbGet(db, 'SELECT id FROM categories LIMIT 1');
  const p = await api('POST', '/api/products', {
    token: admin,
    body: { articulo: 'Arroz', category_id: cat.id, precio_menudeo: 10, stock: 5, activo: true },
  });
  assert.equal(p.status, 201);
  const prodId = p.data.id ?? (await dbGet(db, "SELECT id FROM products WHERE articulo = 'Arroz'")).id;
  const pe = await api('PUT', `/api/products/${prodId}`, {
    token: admin,
    body: { precio_menudeo: 12, 'stock = 999, articulo': 'x' },
  });
  assert.equal(pe.status, 200);
  const prod = await dbGet(db, 'SELECT precio_menudeo, stock, articulo FROM products WHERE id = ?', [prodId]);
  assert.equal(prod.precio_menudeo, 12);
  assert.equal(prod.stock, 5);
  assert.equal(prod.articulo, 'Arroz');
});

test('nadie puede subirse (ni cambiarse) su propio nivel', async () => {
  // Un gerente no puede tocar usuarios
  assert.equal((await api('PUT', '/api/users/3', { token: tokens.gerente, body: { access_level: 99 } })).status, 403);

  // Un Administrador no puede cambiarse su propio nivel
  const r = await api('PUT', '/api/users/4', { token: tokens.admin, body: { access_level: 1 } });
  assert.equal(r.status, 403);
  const admin = await dbGet(db, 'SELECT access_level FROM users WHERE id = 4');
  assert.equal(admin.access_level, 99);

  // Nivel inválido rechazado
  assert.equal((await api('PUT', '/api/users/1', { token: tokens.admin, body: { access_level: 1000 } })).status, 400);
});

test('el último Administrador no se puede borrar ni bajar de nivel', async () => {
  // Hay un solo admin (id 4). Otro admin "temporal" para intentar bajarlo:
  const alta = await api('POST', '/api/users', {
    token: tokens.admin,
    body: { nickname: 'admin2', password: 'admin2pass', access_level: 99 },
  });
  assert.equal(alta.status, 201);
  const admin2 = (await api('POST', '/api/users/login', { body: { nickname: 'admin2', password: 'admin2pass' } })).data.token;

  // Con dos admins, admin2 sí puede bajar al admin 4…
  assert.equal((await api('PUT', '/api/users/4', { token: admin2, body: { access_level: 90 } })).status, 200);

  // …pero ya nadie puede bajar ni borrar a admin2, que es el último
  const bajar = await api('PUT', `/api/users/${alta.data.id}`, { token: tokens.admin /* token viejo, nivel 99 */, body: { access_level: 1 } });
  assert.equal(bajar.status, 409);
  const borrar = await api('DELETE', `/api/users/${alta.data.id}`, { token: admin2 });
  assert.equal(borrar.status, 409);

  const quedan = await dbGet(db, 'SELECT COUNT(*) AS n FROM users WHERE access_level >= 99');
  assert.equal(quedan.n, 1);
});

test('el usuario de la venta sale del token, no del cuerpo', async () => {
  const cat = await dbGet(db, 'SELECT id FROM categories LIMIT 1');
  const p = await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Frijol', category_id: cat.id, precio_menudeo: 20, stock: 10, activo: true },
  });
  const prodId = p.data.id ?? (await dbGet(db, "SELECT id FROM products WHERE articulo = 'Frijol'")).id;

  const venta = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'contado',
      id_user: 4,
      nickname_user: 'admin',
      subtotal: 20, tax_total: 0, discount_total: 0, total: 20, paid: 20,
      details: [{ product_id: prodId, quantity: 1, price: 20, subtotal: 20 }],
      payments: [{ method: 'efectivo', amount: 20 }],
    },
  });
  assert.equal(venta.status, 201, JSON.stringify(venta.data));
  const row = await dbGet(db, 'SELECT id_user, nickname_user FROM sales WHERE id = ?', [venta.data.id]);
  assert.equal(row.id_user, USUARIOS.cajero.id);
  assert.equal(row.nickname_user, 'cajero');
});
