// Pruebas de autenticación: token, login con hash y conversión de contraseñas viejas
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { USUARIOS, iniciar, detener, api, login, dbGet } = require('./helpers');

let db;

before(async () => {
  ({ db } = await iniciar());
});

after(detener);

test('las contraseñas viejas en texto plano se convierten a hash al arrancar', async () => {
  const user = await dbGet(db, 'SELECT password FROM users WHERE nickname = ?', ['cajero']);
  assert.match(user.password, /^\$2[aby]\$/);
  assert.notEqual(user.password, USUARIOS.cajero.password);

  const caja = await dbGet(db, 'SELECT password FROM cash_registers WHERE numero_caja = ?', ['1']);
  assert.match(caja.password, /^\$2[aby]\$/);

  const settings = await dbGet(db, 'SELECT dynamic_price_auth_key FROM settings WHERE id = 1');
  assert.match(settings.dynamic_price_auth_key, /^\$2[aby]\$/);
});

test('login con la misma contraseña de antes (ya con hash) entrega token de 12 h', async () => {
  const { status, data } = await api('POST', '/api/users/login', {
    body: { nickname: 'cajero', password: USUARIOS.cajero.password },
  });
  assert.equal(status, 200);
  assert.equal(data.user.password, undefined, 'la respuesta no debe traer la contraseña');

  const payload = jwt.verify(data.token, process.env.JWT_SECRET);
  assert.equal(payload.id, USUARIOS.cajero.id);
  assert.equal(payload.nickname, 'cajero');
  assert.equal(payload.access_level, 1);
  assert.equal(payload.exp - payload.iat, 12 * 60 * 60);
});

test('login con contraseña incorrecta o usuario inexistente responde 401', async () => {
  const mala = await api('POST', '/api/users/login', { body: { nickname: 'cajero', password: 'otra' } });
  assert.equal(mala.status, 401);
  const nadie = await api('POST', '/api/users/login', { body: { nickname: 'nadie', password: 'x' } });
  assert.equal(nadie.status, 401);
});

test('sin token, con token falso o vencido responde 401', async () => {
  assert.equal((await api('GET', '/api/products')).status, 401);
  assert.equal((await api('GET', '/api/settings')).status, 401);
  assert.equal((await api('GET', '/api/products', { token: 'no-es-un-token' })).status, 401);

  const vencido = jwt.sign(
    { id: 1, nickname: 'cajero', access_level: 1, exp: Math.floor(Date.now() / 1000) - 60 },
    process.env.JWT_SECRET
  );
  assert.equal((await api('GET', '/api/products', { token: vencido })).status, 401);

  const otraFirma = jwt.sign({ id: 4, nickname: 'admin', access_level: 99 }, 'otro-secreto');
  assert.equal((await api('GET', '/api/users', { token: otraFirma })).status, 401);
});

test('/health no pide token (y sin MODO_DEMO no dice demo)', async () => {
  const { status, data } = await api('GET', '/health');
  assert.equal(status, 200);
  assert.equal(data.demo, undefined);
});

test('ninguna respuesta de usuarios devuelve la contraseña', async () => {
  const token = await login('admin');
  const lista = await api('GET', '/api/users', { token });
  assert.equal(lista.status, 200);
  for (const u of lista.data) assert.equal(u.password, undefined);

  const uno = await api('GET', '/api/users/1', { token });
  assert.equal(uno.data.password, undefined);
});

test('alta y edición de usuario guardan la contraseña con hash', async () => {
  const token = await login('admin');
  const alta = await api('POST', '/api/users', {
    token,
    body: { nickname: 'nuevo', password: 'nuevo123', access_level: 1 },
  });
  assert.equal(alta.status, 201);

  let row = await dbGet(db, 'SELECT password FROM users WHERE nickname = ?', ['nuevo']);
  assert.match(row.password, /^\$2[aby]\$/);
  assert.equal((await api('POST', '/api/users/login', { body: { nickname: 'nuevo', password: 'nuevo123' } })).status, 200);

  const edicion = await api('PUT', `/api/users/${alta.data.id}`, { token, body: { password: 'cambiada456' } });
  assert.equal(edicion.status, 200);
  row = await dbGet(db, 'SELECT password FROM users WHERE nickname = ?', ['nuevo']);
  assert.match(row.password, /^\$2[aby]\$/);
  assert.equal((await api('POST', '/api/users/login', { body: { nickname: 'nuevo', password: 'cambiada456' } })).status, 200);
  assert.equal((await api('POST', '/api/users/login', { body: { nickname: 'nuevo', password: 'nuevo123' } })).status, 401);
});

test('abrir caja valida la clave contra el hash y no la devuelve', async () => {
  const token = await login('cajero');
  assert.equal((await api('POST', '/api/cash-registers/abrir', { token, body: { numero_caja: '1', password: 'mala' } })).status, 403);
  const ok = await api('POST', '/api/cash-registers/abrir', { token, body: { numero_caja: '1', password: 'caja1' } });
  assert.equal(ok.status, 200);

  const lista = await api('GET', '/api/cash-registers', { token });
  for (const c of lista.data) assert.equal(c.password, undefined);
});
