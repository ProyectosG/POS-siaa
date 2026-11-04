// Cobrar en varias cajas, cada una con su corte. La caja sale del token de caja
// (X-Caja-Token), nunca del cuerpo.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { iniciar, detener, api, login, dbGet, abrirCaja, sembrarCajas, crearProducto, vender, abonar, centavos } = require('./helpers');

let db;
const tokens = {};
const cajas = {}; // token de caja del cajero en cada caja

before(async () => {
  ({ db } = await iniciar());
  tokens.cajero = await login('cajero');
  tokens.gerente = await login('gerente');
  tokens.admin = await login('admin');
  await sembrarCajas(tokens.gerente);
  for (const n of ['1', '2', '3']) cajas[n] = await abrirCaja(tokens.cajero, n);
});

after(detener);

const zDe = (n) => abrirCaja(tokens.gerente, n);

test('LA PRUEBA DEL PROBLEMA: el corte de una caja no se lleva las ventas de las otras', async () => {
  const p = await crearProducto(tokens.admin, { precio: 100, stock: 50 });
  await vender(tokens.cajero, cajas['1'], p, 100);
  await vender(tokens.cajero, cajas['2'], p, 100);
  await vender(tokens.cajero, cajas['2'], p, 100);

  const c1 = await api('GET', '/api/cuts/current', { token: tokens.cajero, caja: cajas['1'] });
  const c2 = await api('GET', '/api/cuts/current', { token: tokens.cajero, caja: cajas['2'] });
  assert.equal(c1.status, 200);
  assert.equal(c1.data.ventas.total_ventas_monto, 100);
  assert.equal(c2.data.ventas.total_ventas_monto, 200);

  // El corte guarda su caja (antes quedaba vacía) y no toca a la otra
  const x1 = await api('POST', '/api/cuts', { token: tokens.cajero, caja: cajas['1'], body: { type: 'X', cash_register: '99' } });
  assert.equal(x1.status, 201);
  const fila = await dbGet(db, 'SELECT cash_register FROM cuts WHERE id = ?', [x1.data.id]);
  assert.equal(fila.cash_register, '1');
  const c2Despues = await api('GET', '/api/cuts/current', { token: tokens.cajero, caja: cajas['2'] });
  assert.equal(c2Despues.data.ventas.total_ventas_monto, 200);
});

test('sin token de caja: 400 con mensaje claro y sin guardar nada', async () => {
  const p = await crearProducto(tokens.admin, { precio: 5, stock: 5 });
  const ventas = (await dbGet(db, 'SELECT COUNT(*) n FROM sales')).n;
  const r = await api('POST', '/api/sales', {
    token: tokens.cajero,
    caja: null,
    body: { type: 'contado', details: [{ product_id: p, quantity: 1, tipo_precio: 'menudeo' }], payments: [{ method: 'efectivo', amount: 5 }], total_esperado: 5 },
  });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /caja/i);
  assert.equal((await dbGet(db, 'SELECT COUNT(*) n FROM sales')).n, ventas);
  assert.equal((await dbGet(db, 'SELECT stock FROM products WHERE id = ?', [p])).stock, 5);

  for (const [m, ruta] of [['GET', '/api/cuts/current'], ['GET', '/api/cuts/current-z'], ['GET', '/api/cuts/print/current?tipo=X']]) {
    assert.equal((await api(m, ruta, { token: tokens.gerente, caja: null })).status, 400, ruta);
  }
  assert.equal((await api('POST', '/api/cuts', { token: tokens.gerente, caja: null, body: { type: 'X' } })).status, 400);
  assert.equal((await api('POST', '/api/apartados/abono', { token: tokens.cajero, caja: null, body: { sale_id: 1, pagos: [{ method: 'efectivo', amount: 1 }] } })).status, 400);
});

test('token de caja de otro usuario, vencido, falso o de una caja que no existe: rechazado', async () => {
  const secreto = process.env.JWT_SECRET;
  const idCajero = jwt.decode(tokens.cajero).id;
  const malos = {
    'de otro usuario': cajas['1'] && (await abrirCaja(tokens.admin, '1')),
    vencido: jwt.sign({ tipo: 'caja', caja_id: 1, numero_caja: '1', id_user: idCajero }, secreto, { expiresIn: -10 }),
    'firmado con otro secreto': jwt.sign({ tipo: 'caja', caja_id: 1, numero_caja: '1', id_user: idCajero }, 'otro', { expiresIn: '1h' }),
    'de una caja inexistente': jwt.sign({ tipo: 'caja', caja_id: 9999, numero_caja: '9', id_user: idCajero }, secreto, { expiresIn: '1h' }),
    'número que no coincide con su id': jwt.sign({ tipo: 'caja', caja_id: 1, numero_caja: '2', id_user: idCajero }, secreto, { expiresIn: '1h' }),
    'token de sesión en vez de caja': tokens.cajero,
  };
  for (const [nombre, token] of Object.entries(malos)) {
    const r = await api('GET', '/api/cuts/current', { token: tokens.cajero, caja: token });
    assert.equal(r.status, 400, nombre);
    assert.match(r.data.error, /caja/i, nombre);
  }
});

test('un token de caja no sirve como token de sesión', async () => {
  assert.equal((await api('GET', '/api/settings', { token: cajas['1'] })).status, 401);
});

test('abrir caja entrega un token firmado, ligado al usuario y de 12 h', async () => {
  const r = await api('POST', '/api/cash-registers/abrir', { token: tokens.cajero, body: { numero_caja: '2', password: 'caja2' } });
  assert.equal(r.status, 200);
  const p = jwt.verify(r.data.caja_token, process.env.JWT_SECRET);
  assert.equal(p.numero_caja, '2');
  assert.equal(p.id_user, jwt.decode(tokens.cajero).id);
  assert.equal(p.exp - p.iat, 12 * 3600);
});

test('el folio de cada caja y la idempotencia: la misma clave no registra dos veces ni en otra caja', async () => {
  const p = await crearProducto(tokens.admin, { precio: 7, stock: 5 });
  const body = { type: 'contado', details: [{ product_id: p, quantity: 1, tipo_precio: 'menudeo' }], payments: [{ method: 'efectivo', amount: 7 }], total_esperado: 7 };
  const a = await api('POST', '/api/sales', { token: tokens.cajero, caja: cajas['3'], clave: 'clave-idempotente-1', body });
  const b = await api('POST', '/api/sales', { token: tokens.cajero, caja: cajas['1'], clave: 'clave-idempotente-1', body });
  assert.equal(a.status, 201);
  assert.equal(b.data.repetida, true);
  assert.equal(b.data.id, a.data.id);
  assert.equal((await dbGet(db, 'SELECT caja FROM sales WHERE id = ?', [a.data.id])).caja, '3');
  assert.equal((await dbGet(db, 'SELECT stock FROM products WHERE id = ?', [p])).stock, 4);
});

test('la venta y sus pagos guardan la caja; mandar otra en el cuerpo no cambia nada', async () => {
  const p = await crearProducto(tokens.admin, { precio: 9, stock: 5 });
  const id = await vender(tokens.cajero, cajas['2'], p, 9, { caja: '3', cash_register: '3' });
  assert.equal((await dbGet(db, 'SELECT caja FROM sales WHERE id = ?', [id])).caja, '2');
  assert.equal((await dbGet(db, 'SELECT caja FROM payments WHERE sale_id = ?', [id])).caja, '2');
});

test('3 cajas a la vez: sin folios repetidos, stock correcto y la última pieza no se vende dos veces', async () => {
  const p = await crearProducto(tokens.admin, { precio: 3, stock: 10 });
  const intentos = [];
  for (let i = 0; i < 15; i++) {
    const n = String((i % 3) + 1);
    intentos.push(api('POST', '/api/sales', {
      token: tokens.cajero,
      caja: cajas[n],
      body: { type: 'contado', details: [{ product_id: p, quantity: 1, tipo_precio: 'menudeo' }], payments: [{ method: 'efectivo', amount: 3 }], total_esperado: 3 },
    }));
  }
  const respuestas = await Promise.all(intentos);
  const bien = respuestas.filter((r) => r.status === 201);
  const sinStock = respuestas.filter((r) => r.status === 409);
  assert.equal(bien.length, 10);
  assert.equal(sinStock.length, 5);
  assert.equal(new Set(bien.map((r) => r.data.id)).size, 10);
  assert.equal((await dbGet(db, 'SELECT stock FROM products WHERE id = ?', [p])).stock, 0);
});

test('cada X y Z muestra solo lo suyo; el Z de la caja 1 no afecta a las otras; rango de folios por caja', async () => {
  // Deja las 3 cajas en cero
  for (const n of ['1', '2', '3']) {
    const t = await zDe(n);
    const r = await api('POST', '/api/cuts', { token: tokens.gerente, caja: t, body: { type: 'Z' } });
    assert.ok([201, 400].includes(r.status));
  }

  const p = await crearProducto(tokens.admin, { precio: 10, stock: 50 });
  const v1a = await vender(tokens.cajero, cajas['1'], p, 10);
  const v2a = await vender(tokens.cajero, cajas['2'], p, 10);
  const v1b = await vender(tokens.cajero, cajas['1'], p, 10);
  await vender(tokens.cajero, cajas['3'], p, 10);

  const z1 = await zDe('1');
  const previo = await api('GET', '/api/cuts/current-z', { token: tokens.gerente, caja: z1 });
  assert.equal(previo.data.ventas.total_ventas_monto, 20);
  assert.deepEqual(previo.data.ticketRange, { first_ticket: v1a, last_ticket: v1b }); // caja 1: no consecutivos

  const corte = await api('POST', '/api/cuts', { token: tokens.gerente, caja: z1, body: { type: 'Z' } });
  assert.equal(corte.status, 201);
  assert.equal(corte.data.first_ticket, v1a);
  assert.equal(corte.data.last_ticket, v1b);

  // La caja 2 no se movió: su venta (entre las dos de la caja 1) sigue pendiente
  const z2 = await zDe('2');
  const c2 = await api('GET', '/api/cuts/current-z', { token: tokens.gerente, caja: z2 });
  assert.equal(c2.data.ventas.total_ventas_monto, 10);
  assert.deepEqual(c2.data.ticketRange, { first_ticket: v2a, last_ticket: v2a });

  // La caja 1 quedó en cero para X y Z
  const x1 = await api('GET', '/api/cuts/current', { token: tokens.cajero, caja: cajas['1'] });
  assert.equal(x1.data.total_recibido, 0);
  assert.equal((await api('POST', '/api/cuts', { token: tokens.gerente, caja: z1, body: { type: 'Z' } })).status, 400);
});

test('un abono cuenta en la caja que lo cobró, aunque la venta se haya hecho en otra', async () => {
  const p = await crearProducto(tokens.admin, { precio: 100, stock: 5 });
  const cliente = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Abona' } })).data.id;
  const venta = await api('POST', '/api/sales', {
    token: tokens.cajero,
    caja: cajas['1'],
    body: {
      type: 'apartado', customer_id: cliente, total_esperado: 100,
      details: [{ product_id: p, quantity: 1, tipo_precio: 'menudeo' }],
      payments: [{ method: 'efectivo', amount: 30 }],
    },
  });
  assert.equal(venta.status, 201);

  const antes = (await api('GET', '/api/cuts/current-z', { token: tokens.gerente, caja: await zDe('2') })).data;
  await abonar(tokens.cajero, cajas['2'], venta.data.id, cliente, 20, 'tarjeta');
  const despues = (await api('GET', '/api/cuts/current-z', { token: tokens.gerente, caja: await zDe('2') })).data;
  assert.equal(despues.total_abonos - (antes.total_abonos || 0), 20);
  assert.equal((despues.pagos.tarjeta || 0) - (antes.pagos.tarjeta || 0), 20);
  // La venta sigue siendo de la caja 1
  assert.equal(despues.ventas.total_ventas_monto, antes.ventas.total_ventas_monto);

  const fila = await dbGet(db, "SELECT caja FROM payments WHERE sale_id = ? AND payment_type = 'abono'", [venta.data.id]);
  assert.equal(fila.caja, '2');

  // La caja 1 cuenta su venta y su anticipo, no el abono
  const c1 = (await api('GET', '/api/cuts/current-z', { token: tokens.gerente, caja: await zDe('1') })).data;
  assert.equal(c1.ventas.ventas_apartado, 100);
  assert.equal(c1.total_anticipos, 30);
  assert.equal(c1.total_abonos, 0);
});

test('X: solo lo posterior al último X o Z de esa caja; Z: desde su último Z', async () => {
  const t = await zDe('3');
  await api('POST', '/api/cuts', { token: tokens.gerente, caja: t, body: { type: 'Z' } }).catch(() => {});
  const p = await crearProducto(tokens.admin, { precio: 11, stock: 20 });
  await vender(tokens.cajero, cajas['3'], p, 11);
  assert.equal((await api('POST', '/api/cuts', { token: tokens.cajero, caja: cajas['3'], body: { type: 'X' } })).status, 201);
  await vender(tokens.cajero, cajas['3'], p, 11);
  const x = (await api('GET', '/api/cuts/current', { token: tokens.cajero, caja: cajas['3'] })).data;
  const z = (await api('GET', '/api/cuts/current-z', { token: tokens.gerente, caja: t })).data;
  assert.equal(x.ventas.total_ventas_monto, 11);
  assert.equal(z.ventas.total_ventas_monto, 22);
});

test('reimprimir usa los montos guardados y la caja guardada', async () => {
  const t = await zDe('3');
  const p = await crearProducto(tokens.admin, { precio: 12, stock: 20 });
  await vender(tokens.cajero, cajas['3'], p, 12);
  const z = await api('POST', '/api/cuts', { token: tokens.gerente, caja: t, body: { type: 'Z' } });
  assert.equal(z.status, 201);
  await vender(tokens.cajero, cajas['3'], p, 12); // lo nuevo no cambia la reimpresión
  const r = await api('GET', `/api/cuts/${z.data.id}/text`, { token: tokens.gerente });
  assert.match(r.data.ticketText, /Caja: 3/);
  assert.match(r.data.ticketText, /REIMPRESIÓN/);
  const g = await api('GET', `/api/cuts/${z.data.id}`, { token: tokens.gerente });
  assert.equal(g.data.cash_register, '3');
});

test('una caja con movimientos no se borra ni cambia de número; sin movimientos, sí', async () => {
  const lista = (await api('GET', '/api/cash-registers', { token: tokens.gerente })).data;
  const caja1 = lista.find((c) => c.numero_caja === '1');
  const borrar = await api('DELETE', `/api/cash-registers/${caja1.id}`, { token: tokens.gerente });
  assert.equal(borrar.status, 409);
  assert.match(borrar.data.error, /movimientos/);
  const cambiar = await api('PUT', `/api/cash-registers/${caja1.id}`, { token: tokens.gerente, body: { numero_caja: '77' } });
  assert.equal(cambiar.status, 409);
  // Mismo número y otra clave: sí
  assert.equal((await api('PUT', `/api/cash-registers/${caja1.id}`, { token: tokens.gerente, body: { numero_caja: '1', tipo_caja: 'Normal' } })).status, 200);

  const nueva = await api('POST', '/api/cash-registers', { token: tokens.gerente, body: { numero_caja: '50', password: 'x' } });
  assert.equal((await api('PUT', `/api/cash-registers/${nueva.data.id}`, { token: tokens.gerente, body: { numero_caja: '51' } })).status, 200);
  assert.equal((await api('DELETE', `/api/cash-registers/${nueva.data.id}`, { token: tokens.gerente })).status, 200);
});

test('al final, la suma de los cortes de las 3 cajas es igual al total de ventas y pagos', async () => {
  for (const n of ['1', '2', '3']) {
    const r = await api('POST', '/api/cuts', { token: tokens.gerente, caja: await zDe(n), body: { type: 'Z' } });
    assert.ok([201, 400].includes(r.status));
  }
  const cortes = await dbGet(db, "SELECT SUM(total_sales) v, SUM(total_recibido) r FROM cuts WHERE type = 'Z'");
  const ventas = await dbGet(db, 'SELECT SUM(total) v FROM sales WHERE caja IS NOT NULL');
  const pagos = await dbGet(db, 'SELECT SUM(amount) r FROM payments WHERE caja IS NOT NULL');
  assert.equal(cortes.v, ventas.v);
  assert.equal(cortes.r, pagos.r);
  assert.ok(centavos(1) === 100);
});

test('el SuperDeveloper entra sin caja, pero para cobrar debe elegir una', async () => {
  const entrar = await api('POST', '/api/superdev/entrar', { body: { nickname: 'superdev', password: 'clave-super-de-prueba' } });
  const t = entrar.data.token;
  assert.equal((await api('GET', '/api/settings', { token: t })).status, 200);
  assert.equal((await api('GET', '/api/cuts/current', { token: t, caja: null })).status, 400);
  const caja = await abrirCaja(t, '2');
  assert.equal((await api('GET', '/api/cuts/current', { token: t, caja })).status, 200);
});
