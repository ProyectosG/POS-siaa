// Reimprimir un corte guardado: sale con los montos con que se cerró
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login } = require('./helpers');

const tokens = {};
let producto;

before(async () => {
  await iniciar();
  for (const u of ['cajero', 'gerente', 'admin']) tokens[u] = await login(u);
  const cat = await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Ropa' } });
  producto = (await api('POST', '/api/products', {
    token: tokens.admin,
    body: { articulo: 'Playera', category_id: cat.data.id, precio_menudeo: 100, activo: true },
  })).data.id;
  const entrada = await api('POST', '/api/entries', {
    token: tokens.admin,
    body: { entry_type: 'ENTRADA', movement_reason: 'COMPRA_PROVEEDOR', items: [{ product_id: producto, quantity: 10 }] },
  });
  assert.equal(entrada.status, 201, JSON.stringify(entrada.data));
});

after(detener);

const vender = (metodo, monto) => api('POST', '/api/sales', {
  token: tokens.cajero,
  body: {
    type: 'contado',
    total_esperado: 100,
    details: [{ product_id: producto, quantity: 1, tipo_precio: 'menudeo' }],
    payments: [{ method: metodo, amount: monto }],
  },
});

test('la reimpresión trae los montos guardados aunque después haya más ventas', async () => {
  assert.equal((await vender('efectivo', 100)).status, 201);
  assert.equal((await vender('tarjeta', 100)).status, 201);
  const corte = await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X', cash_register: '3' } });
  assert.equal(corte.status, 201, JSON.stringify(corte.data));

  // Ventas nuevas después del corte: no deben cambiar la reimpresión
  assert.equal((await vender('efectivo', 100)).status, 201);

  const r = await api('GET', `/api/cuts/${corte.data.id}/text`, { token: tokens.gerente });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const t = r.data.ticketText;
  assert.match(t, /CORTE X DE CAJA/);
  assert.match(t, /\*\*\* REIMPRESIÓN \*\*\*/);
  assert.match(t, new RegExp(`Corte #${corte.data.id}`));
  assert.match(t, /Caja: 3/);
  assert.match(t, /Usuario: cajero/); // quien hizo el corte
  assert.match(t, /Por: gerente/); // quien lo reimprime
  assert.match(t, /Total Ventas:\s+\$200\.00/);
  assert.match(t, /Efectivo:\s+\$100\.00/);
  assert.match(t, /Tarjeta:\s+\$100\.00/);
  assert.match(t, /EFECTIVO EN CAJA:\s+\$100\.00/);
  assert.doesNotMatch(t, /💪/);

  // Sin impresora conectada responde 200 en modo prueba con el mismo texto
  const p = await api('GET', `/api/cuts/${corte.data.id}/print`, { token: tokens.gerente });
  assert.equal(p.status, 200, JSON.stringify(p.data));
  assert.match(p.data.message, /modo prueba|impreso/);
  if (p.data.ticketText) assert.match(p.data.ticketText, /Total Ventas:\s+\$200\.00/);
});

test('el ticket del corte en curso también lleva usuario y formas de pago', async () => {
  const r = await api('GET', '/api/cuts/print/current?tipo=X&caja=1', { token: tokens.cajero });
  assert.equal(r.status, 200);
  if (r.data.ticketText) {
    assert.match(r.data.ticketText, /Usuario: cajero/);
    assert.match(r.data.ticketText, /FORMAS DE PAGO/);
    assert.doesNotMatch(r.data.ticketText, /REIMPRESIÓN/);
  }
});

test('el cajero no reimprime cortes y un corte inexistente da 404', async () => {
  assert.equal((await api('GET', '/api/cuts/1/text', { token: tokens.cajero })).status, 403);
  assert.equal((await api('GET', '/api/cuts/1/print', { token: tokens.cajero })).status, 403);
  assert.equal((await api('GET', '/api/cuts/9999/text', { token: tokens.gerente })).status, 404);
  assert.equal((await api('GET', '/api/cuts/9999/print', { token: tokens.gerente })).status, 404);
  assert.equal((await api('GET', '/api/cuts/abc/print', { token: tokens.gerente })).status, 404);
});
