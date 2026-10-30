// Límite de intentos de clave guardado en la base: login, caja y su persistencia
// TRUST_PROXY antes de cargar el servidor: X-Forwarded-For simula equipos distintos
process.env.TRUST_PROXY = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, login, dbGet } = require('./helpers');

let db;
let baseUrl;

before(async () => {
  ({ db, baseUrl } = await iniciar());
});
after(detener);

// POST desde un "equipo" (IP) dado
async function desde(ip, ruta, body, token) {
  const res = await fetch(baseUrl + ruta, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}
const entrar = (ip, password) => desde(ip, '/api/users/login', { nickname: 'cajero', password });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('login: 5 claves equivocadas bloquean a ese usuario en ese equipo, no en otro', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await entrar('10.0.0.1', `mala-${i}`)).status, 401);

  const bloqueado = await entrar('10.0.0.1', 'caja123');
  assert.equal(bloqueado.status, 429);
  assert.match(bloqueado.data.error, /Demasiados intentos\. Espera 15 min\./);

  // El cajero real, desde su equipo, sigue entrando
  assert.equal((await entrar('10.0.0.2', 'caja123')).status, 200);
  // Mayúsculas y espacios no cambian la llave
  assert.equal((await desde('10.0.0.1', '/api/users/login', { nickname: ' CAJERO ', password: 'caja123' })).status, 429);
});

test('el bloqueo queda en la base: otro limitador (como tras reiniciar) lo ve', async () => {
  const fila = await dbGet(db, "SELECT fallos, bloqueado_hasta FROM intentos_clave WHERE llave = 'login:cajero:10.0.0.1'");
  assert.ok(Date.parse(fila.bloqueado_hasta) > Date.now() + 14 * 60 * 1000);

  const { crearLimiteIntentos } = require('../src/utils/limiteIntentos');
  const nuevo = crearLimiteIntentos({ prefijo: 'login' });
  assert.equal(await nuevo.minutosBloqueado('cajero:10.0.0.1'), 15);
  assert.equal(await nuevo.minutosBloqueado('cajero:10.0.0.2'), 0);
});

test('un acierto borra los fallos anteriores', async () => {
  for (let i = 0; i < 4; i++) await entrar('10.0.0.3', `mala-${i}`);
  assert.equal((await entrar('10.0.0.3', 'caja123')).status, 200);
  assert.equal(await dbGet(db, "SELECT * FROM intentos_clave WHERE llave = 'login:cajero:10.0.0.3'"), undefined);
  // Empieza de cero: 4 fallos más todavía no bloquean
  for (let i = 0; i < 4; i++) await entrar('10.0.0.3', `mala-${i}`);
  assert.equal((await entrar('10.0.0.3', 'caja123')).status, 200);
});

test('clave de caja: 5 fallos bloquean esa caja en ese equipo', async () => {
  const token = await login('cajero');
  const abrir = (ip, numero_caja, password) => desde(ip, '/api/cash-registers/abrir', { numero_caja, password }, token);

  for (let i = 0; i < 5; i++) assert.equal((await abrir('10.0.1.1', '1', `mala-${i}`)).status, 403);
  const bloqueada = await abrir('10.0.1.1', '1', 'caja1');
  assert.equal(bloqueada.status, 429);
  assert.match(bloqueada.data.error, /Demasiados intentos/);
  assert.equal((await abrir('10.0.1.2', '1', 'caja1')).status, 200);
});

test('los fallos viejos dejan de contar y el bloqueo se vence', async () => {
  const { crearLimiteIntentos } = require('../src/utils/limiteIntentos');
  const lim = crearLimiteIntentos({ prefijo: 'prueba', maximo: 2, bloqueoMs: 1500 });

  await lim.fallo('x');
  await esperar(2600); // más que bloqueoMs: ese fallo ya no cuenta
  await lim.fallo('x');
  assert.equal(await lim.minutosBloqueado('x'), 0);

  await lim.fallo('x'); // segundo fallo seguido → bloqueado
  assert.equal(await lim.minutosBloqueado('x'), 1);
  await esperar(1700);
  assert.equal(await lim.minutosBloqueado('x'), 0);
  await lim.limpiar();
});
