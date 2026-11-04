// Búsqueda de clientes por varias palabras y alta desde la venta.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
let cajero;
const buscar = async (texto) => {
  const r = await api('GET', `/api/customers/search/${encodeURIComponent(texto)}`, { token: cajero });
  assert.equal(r.status, 200);
  return r.data.map((c) => c.first_name);
};

before(async () => {
  ({ db } = await iniciar());
  cajero = await login('cajero');
  for (const [first_name, last_name_paternal, last_name_maternal, phone] of [
    ['Juan', 'Pérez', 'López', '2221112233'],
    ['Juan Carlos', 'Ramírez', 'Soto', '2224445566'],
    ['Ana', 'Pérez', 'Ruiz', '5550001111'],
  ]) {
    const r = await api('POST', '/api/customers', { token: cajero, body: { first_name, last_name_paternal, last_name_maternal, phone } });
    assert.equal(r.status, 201);
  }
});

after(detener);

test('nombre completo: cada palabra aparece en alguno de los campos', async () => {
  assert.deepEqual(await buscar('Juan Pérez'), ['Juan']);
  assert.deepEqual(await buscar('Pérez Juan'), ['Juan']);
  assert.deepEqual(await buscar('Juan Pérez López'), ['Juan']);
  assert.deepEqual(await buscar('  juan   carlos  '), ['Juan Carlos']);
});

test('una palabra sigue encontrando a todos; nombre con teléfono también', async () => {
  assert.deepEqual((await buscar('Pérez')).sort(), ['Ana', 'Juan']);
  assert.deepEqual(await buscar('Ana 5550'), ['Ana']);
  assert.deepEqual(await buscar('2224445566'), ['Juan Carlos']);
});

test('si una palabra no aparece en ningún campo, no hay resultado', async () => {
  assert.deepEqual(await buscar('Juan Inexistente'), []);
  assert.deepEqual(await buscar('Ana Ramírez'), []);
});

test('caracteres de LIKE y texto muy corto no rompen la búsqueda', async () => {
  assert.deepEqual(await buscar('a'), []); // menos de 2 letras
  assert.ok((await buscar('Juan %')).length <= 2); // un % suelto no truena
});

test('un Cajero da de alta un cliente y su saldo inicial siempre es 0', async () => {
  const r = await api('POST', '/api/customers', {
    token: cajero,
    body: { first_name: 'Rosa', last_name_paternal: 'Mora', current_balance: 9999 },
  });
  assert.equal(r.status, 201);
  assert.ok(r.data.id);
  const fila = await dbGet(db, 'SELECT current_balance FROM customers WHERE id = ?', [r.data.id]);
  assert.equal(fila.current_balance, 0);
});

test('alta sin nombre: 400 y no se guarda', async () => {
  const antes = (await dbGet(db, 'SELECT COUNT(*) AS n FROM customers')).n;
  assert.equal((await api('POST', '/api/customers', { token: cajero, body: { last_name_paternal: 'X' } })).status, 400);
  assert.equal((await dbGet(db, 'SELECT COUNT(*) AS n FROM customers')).n, antes);
});
