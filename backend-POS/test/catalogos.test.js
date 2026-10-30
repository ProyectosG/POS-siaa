// Pruebas de la tanda de catálogos con Prisma: cajas, usuarios, configuración y
// clientes. Incluye las fechas de registro como texto UTC y que editar un
// cliente nunca cambie su saldo.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
const tokens = {};

// 'AAAA-MM-DD HH:MM:SS', el texto de CURRENT_TIMESTAMP de SQLite
const FORMATO_UTC = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

// La fecha está en UTC y es de hace menos de un minuto
function esAhoraUTC(texto) {
  if (!FORMATO_UTC.test(texto || '')) return false;
  const instante = Date.parse(texto.replace(' ', 'T') + 'Z');
  return Math.abs(Date.now() - instante) < 60 * 1000;
}

const correr = (sql, params = []) =>
  new Promise((res, rej) => db.run(sql, params, (e) => (e ? rej(e) : res())));

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);
});

after(detener);

// ───────── Usuarios

test('un usuario nuevo guarda created_at en texto UTC, nunca vacío', async () => {
  const alta = await api('POST', '/api/users', {
    token: tokens.admin,
    body: { nickname: 'nuevo', password: 'nuevo123', access_level: 1 },
  });
  assert.equal(alta.status, 201, JSON.stringify(alta.data));

  const fila = await dbGet(db, 'SELECT created_at, typeof(created_at) AS tipo FROM users WHERE id = ?', [alta.data.id]);
  assert.equal(fila.tipo, 'text');
  assert.ok(esAhoraUTC(fila.created_at), `created_at = ${fila.created_at}`);

  // El login (que también pasa por Prisma) entrega created_at igual que la base
  const r = await api('POST', '/api/users/login', { body: { nickname: 'nuevo', password: 'nuevo123' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.created_at, fila.created_at);
  assert.equal(r.data.user.password, undefined);
});

test('usuarios: ninguna respuesta trae la contraseña', async () => {
  const lista = await api('GET', '/api/users', { token: tokens.admin });
  assert.equal(lista.status, 200);
  assert.ok(lista.data.length >= 4);
  assert.ok(lista.data.every((u) => !('password' in u)));

  const uno = await api('GET', `/api/users/${lista.data[0].id}`, { token: tokens.admin });
  assert.equal(uno.data.password, undefined);
  const porNick = await api('GET', '/api/users/nickname/cajero', { token: tokens.cajero });
  assert.equal(porNick.status, 200);
  assert.equal(porNick.data.password, undefined);
});

test('usuarios: nickname repetido 409, y 404 si no existe', async () => {
  const rep = await api('POST', '/api/users', { token: tokens.admin, body: { nickname: 'cajero', password: 'x123' } });
  assert.equal(rep.status, 409);

  const otro = (await api('POST', '/api/users', { token: tokens.admin, body: { nickname: 'otro', password: 'x123' } })).data.id;
  assert.equal((await api('PUT', `/api/users/${otro}`, { token: tokens.admin, body: { nickname: 'gerente' } })).status, 409);

  assert.equal((await api('PUT', '/api/users/9999', { token: tokens.admin, body: { full_name: 'X' } })).status, 404);
  assert.equal((await api('DELETE', '/api/users/9999', { token: tokens.admin })).status, 404);
  assert.equal((await api('DELETE', `/api/users/${otro}`, { token: tokens.admin })).status, 200);
});

test('usuarios: editar la contraseña la guarda con hash y el login la acepta', async () => {
  const id = (await api('POST', '/api/users', { token: tokens.admin, body: { nickname: 'clave', password: 'vieja123' } })).data.id;
  assert.equal((await api('PUT', `/api/users/${id}`, { token: tokens.admin, body: { password: 'nueva123' } })).status, 200);
  const fila = await dbGet(db, 'SELECT password FROM users WHERE id = ?', [id]);
  assert.match(fila.password, /^\$2[aby]\$/);
  assert.equal((await api('POST', '/api/users/login', { body: { nickname: 'clave', password: 'nueva123' } })).status, 200);
});

// ───────── Cajas

test('cajas: alta, número repetido 409, editar, 404 y sin clave en las respuestas', async () => {
  const alta = await api('POST', '/api/cash-registers', { token: tokens.gerente, body: { numero_caja: '7', password: 'caja7' } });
  assert.equal(alta.status, 201, JSON.stringify(alta.data));

  assert.equal((await api('POST', '/api/cash-registers', { token: tokens.gerente, body: { numero_caja: '7', password: 'x' } })).status, 409);
  // La caja '1' ya viene sembrada
  assert.equal((await api('PUT', `/api/cash-registers/${alta.data.id}`, { token: tokens.gerente, body: { numero_caja: '1' } })).status, 409);

  const edit = await api('PUT', `/api/cash-registers/${alta.data.id}`, { token: tokens.gerente, body: { numero_caja: '8', tipo_caja: 'Rápida' } });
  assert.equal(edit.status, 200);
  const caja = await api('GET', `/api/cash-registers/${alta.data.id}`, { token: tokens.gerente });
  assert.deepEqual(caja.data, { id: alta.data.id, numero_caja: '8', tipo_caja: 'Rápida' });

  // Editar sin clave no la cambia: abrir la caja con la clave original
  const abrir = await api('POST', '/api/cash-registers/abrir', { token: tokens.cajero, body: { numero_caja: '8', password: 'caja7' } });
  assert.equal(abrir.status, 200);
  assert.equal(abrir.data.estado, 'ABIERTA');

  const lista = await api('GET', '/api/cash-registers', { token: tokens.gerente });
  assert.ok(lista.data.every((c) => !('password' in c)));

  assert.equal((await api('PUT', '/api/cash-registers/9999', { token: tokens.gerente, body: { tipo_caja: 'X' } })).status, 404);
  assert.equal((await api('DELETE', '/api/cash-registers/9999', { token: tokens.gerente })).status, 404);
  assert.equal((await api('DELETE', `/api/cash-registers/${alta.data.id}`, { token: tokens.gerente })).status, 200);
  assert.equal((await api('GET', `/api/cash-registers/${alta.data.id}`, { token: tokens.gerente })).status, 404);
});

// ───────── Configuración

test('configuración: al editar, updated_at se pone a mano en texto UTC y created_at no cambia', async () => {
  await correr(`UPDATE settings SET created_at = '2025-01-01 10:00:00', updated_at = '2025-01-01 10:00:00' WHERE id = 1`);

  const r = await api('PUT', '/api/settings', { token: tokens.admin, body: { ticket_header_line1: 'MI TIENDA', ticket_width: '80' } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.ticket_header_line1, 'MI TIENDA');
  assert.equal(r.data.ticket_width, 80);
  assert.equal(r.data.dynamic_price_auth_key, undefined);

  const fila = await dbGet(db, 'SELECT created_at, updated_at, typeof(updated_at) AS tipo FROM settings WHERE id = 1');
  assert.equal(fila.created_at, '2025-01-01 10:00:00');
  assert.equal(fila.tipo, 'text');
  assert.ok(esAhoraUTC(fila.updated_at), `updated_at = ${fila.updated_at}`);
  assert.equal(r.data.updated_at, fila.updated_at);
});

test('configuración: cambiar la clave de precios también actualiza updated_at', async () => {
  await correr(`UPDATE settings SET updated_at = '2025-01-01 10:00:00' WHERE id = 1`);
  const r = await api('PUT', '/api/settings', { token: tokens.admin, body: { dynamic_price_auth_key: 'otra-clave' } });
  assert.equal(r.status, 200);
  const fila = await dbGet(db, 'SELECT updated_at, dynamic_price_auth_key AS clave FROM settings WHERE id = 1');
  assert.ok(esAhoraUTC(fila.updated_at), `updated_at = ${fila.updated_at}`);
  assert.match(fila.clave, /^\$2[aby]\$/);

  const valida = await api('POST', '/api/settings/validar-clave-precio', { token: tokens.cajero, body: { clave: 'otra-clave' } });
  assert.equal(valida.data.valida, true);
});

test('configuración: un número inválido responde 400 sin guardar nada', async () => {
  const antes = await dbGet(db, 'SELECT ticket_width, updated_at, dynamic_price_auth_key FROM settings WHERE id = 1');
  const r = await api('PUT', '/api/settings', {
    token: tokens.admin,
    body: { ticket_header_line1: 'NO', ticket_width: 'ancho', dynamic_price_auth_key: 'no-se-guarda' },
  });
  assert.equal(r.status, 400);
  const despues = await dbGet(db, 'SELECT ticket_width, updated_at, dynamic_price_auth_key FROM settings WHERE id = 1');
  assert.deepEqual({ ...despues }, { ...antes });
});

// ───────── Clientes

test('clientes: editar un cliente nunca cambia su saldo (solo moverSaldo)', async () => {
  const cliente = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Rosa', current_balance: 500 } })).data.id;
  // El alta ignora el saldo que mande el navegador
  assert.equal((await dbGet(db, 'SELECT current_balance FROM customers WHERE id = ?', [cliente])).current_balance, 0);

  // Una venta a crédito le deja una deuda real (moverSaldo, con historial)
  const cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Ropa' } })).data.id;
  const prod = (await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Falda', category_id: cat, precio_menudeo: 250, stock: 5, activo: true },
  })).data.id;
  const venta = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: { type: 'credito', customer_id: cliente, total_esperado: 250, details: [{ product_id: prod, quantity: 1, tipo_precio: 'menudeo' }], payments: [] },
  });
  assert.equal(venta.status, 201, JSON.stringify(venta.data));
  assert.equal((await api('GET', `/api/customers/${cliente}`, { token: tokens.cajero })).data.current_balance, 250);
  const historial = (await dbGet(db, 'SELECT COUNT(*) AS n FROM customer_balance_history WHERE customer_id = ?', [cliente])).n;

  // Editar mandando otro saldo: cambia el teléfono, el saldo no
  const edit = await api('PUT', `/api/customers/${cliente}`, {
    token: tokens.gerente,
    body: { phone: '5551234', current_balance: 0 },
  });
  assert.equal(edit.status, 200);
  const despues = await api('GET', `/api/customers/${cliente}`, { token: tokens.cajero });
  assert.equal(despues.data.phone, '5551234');
  assert.equal(despues.data.current_balance, 250);

  // Solo el saldo en el cuerpo: tampoco lo cambia
  await api('PUT', `/api/customers/${cliente}`, { token: tokens.gerente, body: { current_balance: 99999 } });
  assert.equal((await dbGet(db, 'SELECT current_balance FROM customers WHERE id = ?', [cliente])).current_balance, 25000);
  assert.equal((await dbGet(db, 'SELECT COUNT(*) AS n FROM customer_balance_history WHERE customer_id = ?', [cliente])).n, historial);

  // Con ventas no se puede borrar
  const borrar = await api('DELETE', `/api/customers/${cliente}`, { token: tokens.gerente });
  assert.equal(borrar.status, 409);
  assert.match(borrar.data.error, /ventas/);
});

test('clientes: búsqueda sin distinguir mayúsculas, 404 y borrado de uno sin movimientos', async () => {
  const id = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Ernesto', last_name_paternal: 'Gómez', phone: '5559876' } })).data.id;

  const porNombre = await api('GET', '/api/customers/search/erne', { token: tokens.cajero });
  assert.ok(porNombre.data.some((c) => c.id === id));
  const porTel = await api('GET', '/api/customers/search/59876', { token: tokens.cajero });
  assert.deepEqual(porTel.data.map((c) => c.id), [id]);
  assert.deepEqual((await api('GET', '/api/customers/search/e', { token: tokens.cajero })).data, []);

  assert.equal((await api('GET', '/api/customers/9999', { token: tokens.cajero })).status, 404);
  assert.equal((await api('PUT', '/api/customers/9999', { token: tokens.gerente, body: { phone: '1' } })).status, 404);
  assert.equal((await api('DELETE', '/api/customers/9999', { token: tokens.gerente })).status, 404);
  assert.equal((await api('DELETE', `/api/customers/${id}`, { token: tokens.gerente })).status, 200);
});
