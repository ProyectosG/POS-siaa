// Pruebas del SuperDeveloper y del reset
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { iniciar, detener, api, login } = require('./helpers');

// El controlador se carga hasta que la base temporal existe (abre la base)
let superdev;

const CREDENCIALES = () => ({
  nickname: process.env.SUPERDEV_USER,
  password: process.env.SUPERDEV_PASSWORD,
});

let baseUrl;

before(async () => {
  ({ baseUrl } = await iniciar());
  superdev = require('../src/controllers/superdev.controller');
});
after(detener);
beforeEach(() => superdev._limpiarIntentos());

test('entrar con credenciales correctas da token superdev de 45 min', async () => {
  const { status, data } = await api('POST', '/api/superdev/entrar', { body: CREDENCIALES() });
  assert.equal(status, 200);
  const payload = jwt.verify(data.token, process.env.JWT_SECRET);
  assert.equal(payload.superdev, true);
  assert.equal(payload.exp - payload.iat, 45 * 60);
});

test('credenciales incorrectas → 401; al quinto intento se bloquea 15 min', async () => {
  for (let i = 0; i < 5; i++) {
    const r = await api('POST', '/api/superdev/entrar', { body: { nickname: 'superdev', password: `mala${i}` } });
    assert.equal(r.status, 401);
  }
  // Bloqueado, aunque ahora la clave sea correcta
  const bloqueado = await api('POST', '/api/superdev/entrar', { body: CREDENCIALES() });
  assert.equal(bloqueado.status, 429);
});

test('sin SUPERDEV_USER / SUPERDEV_PASSWORD el SuperDeveloper queda apagado', async () => {
  const antes = process.env.SUPERDEV_PASSWORD;
  process.env.SUPERDEV_PASSWORD = '';
  try {
    const r = await api('POST', '/api/superdev/entrar', { body: { nickname: 'superdev', password: '' } });
    assert.equal(r.status, 404);
  } finally {
    process.env.SUPERDEV_PASSWORD = antes;
  }
});

test('la cookie is-superdev ya no da permisos', async () => {
  const token = await login('admin');
  const res = await fetch(`${baseUrl}/api/reset/tables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Cookie: 'is-superdev=true',
    },
    body: JSON.stringify({ tables: ['sales'] }),
  });
  assert.equal(res.status, 403, 'un Administrador con la cookie vieja no puede hacer reset');

  const sinToken = await fetch(`${baseUrl}/api/reset/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'is-superdev=true' },
    body: JSON.stringify({ tables: ['sales'] }),
  });
  assert.equal(sinToken.status, 401);
});

test('reset sin token → 401; con token de usuario → 403', async () => {
  assert.equal((await api('POST', '/api/reset/tables', { body: { tables: ['sales'] } })).status, 401);
  const token = await login('cajero');
  assert.equal((await api('POST', '/api/reset/tables', { token, body: { tables: ['sales'] } })).status, 403);
});

test('reset con tabla no permitida → 400; con tabla permitida funciona y respalda', async () => {
  const { data } = await api('POST', '/api/superdev/entrar', { body: CREDENCIALES() });
  const token = data.token;

  const malo = await api('POST', '/api/reset/tables', { token, body: { tables: ['settings'] } });
  assert.equal(malo.status, 400);
  const inyeccion = await api('POST', '/api/reset/tables', { token, body: { tables: ['sales; DROP TABLE users'] } });
  assert.equal(inyeccion.status, 400);

  const ok = await api('POST', '/api/reset/tables', { token, body: { tables: ['cuts'] } });
  assert.equal(ok.status, 200);
  assert.match(ok.data.backup, /^pos_backup_\d+\.db$/);
});

test('la lista de tablas para la pantalla sale del servidor (solo SuperDeveloper)', async () => {
  assert.equal((await api('GET', '/api/reset/tablas')).status, 401);
  assert.equal((await api('GET', '/api/reset/tablas', { token: await login('admin') })).status, 403);

  const { data } = await api('POST', '/api/superdev/entrar', { body: CREDENCIALES() });
  const r = await api('GET', '/api/reset/tablas', { token: data.token });
  assert.equal(r.status, 200);
  const { TABLAS_PERMITIDAS } = require('../src/controllers/resetController');
  assert.deepEqual(r.data.map((t) => t.tabla), TABLAS_PERMITIDAS);
  // Las que faltaban en la pantalla, con nombre legible
  const nombre = (tabla) => r.data.find((t) => t.tabla === tabla).nombre;
  assert.equal(nombre('outs'), 'Salidas');
  assert.equal(nombre('out_details'), 'Detalle de salidas');
  assert.equal(nombre('codigo_barras_historial'), 'Historial de códigos');
  for (const t of r.data) assert.notEqual(t.nombre, t.tabla, `${t.tabla} sin nombre`);
});
