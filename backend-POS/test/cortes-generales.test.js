// Corte X General y Corte Z General: suman cortes individuales ya guardados, en
// centavos. No cierran ninguna caja. Cada prueba deja consolidado lo anterior para
// empezar de cero (ver limpiar()).
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login, dbGet, abrirCaja, sembrarCajas, crearProducto, vender, abonar } = require('./helpers');

let db;
const t = {};
const cj = {}; // token de caja del gerente (hace ventas y cortes)
const COLUMNAS = [
  'total_sales', 'ventas_contado', 'ventas_credito', 'ventas_apartado', 'total_iva_gravado',
  'total_recibido', 'total_anticipos', 'total_abonos',
  'pago_efectivo', 'pago_tarjeta', 'pago_transferencia', 'pago_otros', 'cash_in_box',
];

const correr = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, (e) => (e ? rej(e) : res())));
const todas = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, f) => (e ? rej(e) : res(f))));

const corte = (n, type) => api('POST', '/api/cuts', { token: t.gerente, caja: cj[n], body: { type } });
const general = (tipo) => api('GET', `/api/cuts/general/current?tipo=${tipo}`, { token: t.admin });
const hacerGeneral = (type) => api('POST', '/api/cuts/general', { token: t.admin, body: { type } });

// Deja todas las cajas cortadas y consolidadas
async function limpiar() {
  for (const n of ['1', '2', '3']) await corte(n, 'Z');
  await hacerGeneral('Z');
}

before(async () => {
  ({ db } = await iniciar());
  t.cajero = await login('cajero');
  t.supervisor = await login('supervisor');
  t.gerente = await login('gerente');
  t.admin = await login('admin');
  await sembrarCajas(t.gerente);
  for (const n of ['1', '2', '3']) cj[n] = await abrirCaja(t.gerente, n);
});

beforeEach(limpiar);
after(detener);

test('sin Z por consolidar: 400; un general nunca crea cortes de caja', async () => {
  const antes = (await dbGet(db, "SELECT COUNT(*) n FROM cuts WHERE type IN ('X','Z')")).n;
  const r = await hacerGeneral('Z');
  assert.equal(r.status, 400);
  assert.equal(r.data.error, 'No hay cortes Z de caja por consolidar');
  assert.equal((await dbGet(db, "SELECT COUNT(*) n FROM cuts WHERE type IN ('X','Z')")).n, antes);
});

test('IVA: 3 ventas de $10.10 en cajas distintas dan $4.17 sumadas, no $4.18', async () => {
  const p = await crearProducto(t.admin, { precio: 10.10, iva: true, stock: 10 });
  for (const n of ['1', '2', '3']) await vender(t.gerente, cj[n], p, 10.10);
  for (const n of ['1', '2', '3']) assert.equal((await corte(n, 'Z')).status, 201);

  const ivas = await todas("SELECT total_iva_gravado v FROM cuts WHERE type = 'Z' AND corte_general_id IS NULL");
  assert.deepEqual(ivas.map((f) => f.v), [139, 139, 139]);

  const g = await general('Z');
  assert.equal(g.data.ventas.total_iva_gravado, 4.17);
  assert.equal(g.data.ventas.total_ventas_monto, 30.30);
  assert.equal(g.data.cuadra, true);
  assert.equal(g.data.diferencia_centavos, 0);

  const r = await hacerGeneral('Z');
  assert.equal(r.status, 201);
  const fila = await dbGet(db, 'SELECT total_iva_gravado v, cash_register c, last_ticket l, last_payment_id p, type FROM cuts WHERE id = ?', [r.data.id]);
  assert.deepEqual({ ...fila }, { v: 417, c: null, l: null, p: null, type: 'ZG' });
});

test('centavos difíciles, mixtos, anticipos y abonos de otra caja: cada columna es la suma exacta de sus cortes', async () => {
  const precios = [0.01, 0.29, 10.10, 33.33];
  const prods = [];
  for (const precio of precios) prods.push(await crearProducto(t.admin, { precio, iva: precio > 1, stock: 50 }));
  const cliente = (await api('POST', '/api/customers', { token: t.gerente, body: { first_name: 'Difícil' } })).data.id;

  const anticipos = [];
  let i = 0;
  for (const n of ['1', '2', '3']) {
    for (const [k, precio] of precios.entries()) {
      const pago = i % 3 === 0
        ? [{ method: 'efectivo', amount: precio }]
        : i % 3 === 1
          ? [{ method: 'tarjeta', amount: precio, bank: 'BBVA', last4: '1234' }]
          : [{ method: 'transferencia', amount: precio, reference: 'SPEI1' }];
      await vender(t.gerente, cj[n], prods[k], precio, {}, pago);
      i++;
    }
    // Mixto: 33.33 en efectivo y tarjeta
    await vender(t.gerente, cj[n], prods[3], 33.33, {}, [{ method: 'efectivo', amount: 11.11 }, { method: 'tarjeta', amount: 22.22, bank: 'BBVA', last4: '9' }]);
    // Apartado con anticipo y crédito sin anticipo
    const a = await api('POST', '/api/sales', {
      token: t.gerente, caja: cj[n],
      body: { type: 'apartado', customer_id: cliente, total_esperado: 33.33, details: [{ product_id: prods[3], quantity: 1, tipo_precio: 'menudeo' }], payments: [{ method: 'efectivo', amount: 10.10 }] },
    });
    assert.equal(a.status, 201);
    anticipos.push(a.data.id);
    const c = await api('POST', '/api/sales', {
      token: t.gerente, caja: cj[n],
      body: { type: 'credito', customer_id: cliente, total_esperado: 10.10, details: [{ product_id: prods[2], quantity: 1, tipo_precio: 'menudeo' }], payments: [] },
    });
    assert.equal(c.status, 201);
  }
  // Abonos: la caja 2 cobra un apartado de la caja 1 y la 3 uno de la 2
  await abonar(t.gerente, cj['2'], anticipos[0], cliente, 0.29, 'tarjeta');
  await abonar(t.gerente, cj['3'], anticipos[1], cliente, 10.10, 'transferencia');
  await abonar(t.gerente, cj['1'], anticipos[2], cliente, 0.01);

  for (const n of ['1', '2', '3']) assert.equal((await corte(n, 'Z')).status, 201);
  const zs = await todas("SELECT * FROM cuts WHERE type = 'Z' AND corte_general_id IS NULL");
  assert.equal(zs.length, 3);

  const g = await general('Z');
  assert.equal(g.data.cuadra, true, JSON.stringify(g.data.diferencias));

  const r = await hacerGeneral('Z');
  assert.equal(r.status, 201);
  const fila = await dbGet(db, 'SELECT * FROM cuts WHERE id = ?', [r.data.id]);
  for (const col of COLUMNAS) {
    const suma = zs.reduce((s, z) => s + z[col], 0);
    assert.equal(fila[col], suma, col);
    assert.ok(Number.isInteger(fila[col]), `${col} en centavos enteros`);
  }

  // Y contra el origen: cada columna de la caja, de ventas y pagos
  const ventas = (await dbGet(db, 'SELECT SUM(total) v FROM sales WHERE id > (SELECT COALESCE(MAX(last_ticket),0) FROM cuts WHERE type = \'Z\' AND id < ?)', [zs[0].id])).v;
  assert.equal(fila.total_sales, ventas);

  // El desglose por caja suma lo mismo
  const reimpreso = await api('GET', `/api/cuts/${r.data.id}/text`, { token: t.admin });
  assert.match(reimpreso.data.ticketText, /CORTE Z GENERAL/);
  assert.doesNotMatch(reimpreso.data.ticketText, /DE CAJA/);
});

test('la caja 1 hace su Z y sigue vendiendo: esa venta sale como "fuera" y entra en el siguiente ZG, una sola vez', async () => {
  const p = await crearProducto(t.admin, { precio: 1250, stock: 10 });
  await vender(t.gerente, cj['1'], p, 1250);
  assert.equal((await corte('1', 'Z')).status, 201);
  await vender(t.gerente, cj['1'], p, 1250); // después del Z

  const g = await general('Z');
  assert.equal(g.data.ventas.total_ventas_monto, 1250);
  assert.deepEqual(g.data.fuera.map((f) => f.texto), ['Caja 1: sin corte, $1,250.00 quedan fuera (entran en el siguiente)']);
  assert.equal(g.data.cuadra, true);

  assert.equal((await api('GET', '/api/cuts/general/text?tipo=Z', { token: t.admin })).data.ticketText.includes('FUERA DE ESTE CORTE'), true);

  const zg1 = await hacerGeneral('Z');
  assert.equal(zg1.status, 201);
  assert.equal((await dbGet(db, 'SELECT total_sales v FROM cuts WHERE id = ?', [zg1.data.id])).v, 125000);

  // La reimpresión usa solo lo guardado: no calcula lo que queda fuera
  const re = await api('GET', `/api/cuts/${zg1.data.id}/text`, { token: t.admin });
  assert.doesNotMatch(re.data.ticketText, /FUERA DE ESTE CORTE/);

  assert.equal((await corte('1', 'Z')).status, 201);
  const zg2 = await hacerGeneral('Z');
  assert.equal(zg2.status, 201);
  assert.equal((await dbGet(db, 'SELECT total_sales v FROM cuts WHERE id = ?', [zg2.data.id])).v, 125000);
  assert.equal((await hacerGeneral('Z')).status, 400); // ya no queda nada: entró una sola vez
});

test('la caja 3 no hizo su Z: el ZG no la incluye ni la cierra; cuando la haga, entra en el siguiente', async () => {
  const p = await crearProducto(t.admin, { precio: 100, stock: 10 });
  await vender(t.gerente, cj['1'], p, 100);
  await vender(t.gerente, cj['3'], p, 100);
  assert.equal((await corte('1', 'Z')).status, 201);

  const g = await general('Z');
  const fila3 = g.data.por_caja.find((f) => f.caja === '3');
  assert.equal(fila3.ventas, 0);
  assert.equal(fila3.cortes, 0);
  assert.equal(g.data.por_caja.length, 3); // también las de cero
  assert.equal(g.data.fuera.length, 1);
  assert.equal(g.data.fuera[0].caja, '3');

  assert.equal((await hacerGeneral('Z')).status, 201);

  // La caja 3 sigue con su venta pendiente
  const z3 = await api('GET', '/api/cuts/current-z', { token: t.gerente, caja: cj['3'] });
  assert.equal(z3.data.ventas.total_ventas_monto, 100);

  assert.equal((await corte('3', 'Z')).status, 201);
  const zg = await hacerGeneral('Z');
  assert.equal(zg.status, 201);
  assert.equal((await dbGet(db, 'SELECT total_sales v FROM cuts WHERE id = ?', [zg.data.id])).v, 10000);
});

test('dos ZG a la vez: ningún Z queda en los dos', async () => {
  const p = await crearProducto(t.admin, { precio: 5, stock: 20 });
  for (const n of ['1', '2', '3']) {
    await vender(t.gerente, cj[n], p, 5);
    await corte(n, 'Z');
  }
  const [a, b, c] = await Promise.all([hacerGeneral('Z'), hacerGeneral('Z'), hacerGeneral('Z')]);
  assert.deepEqual([a.status, b.status, c.status].sort(), [201, 400, 400]);
  const repetidos = await todas(`
    SELECT l.corte_id FROM corte_general_cortes l JOIN cuts g ON g.id = l.general_id
    WHERE g.type = 'ZG' GROUP BY l.corte_id HAVING COUNT(*) > 1`);
  assert.equal(repetidos.length, 0);
});

test('X, X, Z y otro X: el XG suma el Z + el último X, sin contar doble', async () => {
  const p = await crearProducto(t.admin, { precio: 10, stock: 20 });
  await vender(t.gerente, cj['1'], p, 10);
  assert.equal((await corte('1', 'X')).status, 201);
  await vender(t.gerente, cj['1'], p, 10);
  assert.equal((await corte('1', 'X')).status, 201);
  await vender(t.gerente, cj['1'], p, 10);
  assert.equal((await corte('1', 'Z')).status, 201); // 30 (incluye los dos X)
  await vender(t.gerente, cj['1'], p, 10);
  assert.equal((await corte('1', 'X')).status, 201); // 10
  await vender(t.gerente, cj['1'], p, 10); // sin cortar: queda fuera

  const g = await general('X');
  assert.equal(g.data.ventas.total_ventas_monto, 40);
  assert.equal(g.data.incluidos, 2);
  assert.equal(g.data.cuadra, true);
  assert.deepEqual(g.data.fuera.map((f) => f.caja), ['1']);
  assert.equal(g.data.fuera[0].ventas, 10);

  // Se puede repetir: es una foto que no marca nada
  const r1 = await hacerGeneral('X');
  const r2 = await hacerGeneral('X');
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 201);
  assert.equal((await dbGet(db, 'SELECT type, total_sales v FROM cuts WHERE id = ?', [r1.data.id])).type, 'XG');
  assert.equal((await dbGet(db, 'SELECT total_sales v FROM cuts WHERE id = ?', [r2.data.id])).v, 4000);
  const ligas = await todas('SELECT corte_id FROM corte_general_cortes WHERE general_id = ?', [r1.data.id]);
  assert.equal(ligas.length, 2);
  assert.equal((await dbGet(db, "SELECT COUNT(*) n FROM cuts WHERE type IN ('X','Z') AND corte_general_id = ?", [r1.data.id])).n, 0);
});

test('un abono en la caja 2 a una venta de la caja 1, sin folio nuevo: entra en el corte de la caja 2 y en el general', async () => {
  const p = await crearProducto(t.admin, { precio: 100, stock: 5 });
  const cliente = (await api('POST', '/api/customers', { token: t.gerente, body: { first_name: 'Abona' } })).data.id;
  const v = await api('POST', '/api/sales', {
    token: t.gerente, caja: cj['1'],
    body: { type: 'apartado', customer_id: cliente, total_esperado: 100, details: [{ product_id: p, quantity: 1, tipo_precio: 'menudeo' }], payments: [{ method: 'efectivo', amount: 40 }] },
  });
  assert.equal((await corte('1', 'Z')).status, 201);

  await abonar(t.gerente, cj['2'], v.data.id, cliente, 25.55, 'tarjeta');
  const z2 = await corte('2', 'Z');
  assert.equal(z2.status, 201);
  assert.equal(z2.data.first_ticket, null);
  const fila = await dbGet(db, 'SELECT total_sales s, total_abonos a, pago_tarjeta t FROM cuts WHERE id = ?', [z2.data.id]);
  assert.deepEqual({ ...fila }, { s: 0, a: 2555, t: 2555 });

  const g = await general('Z');
  assert.equal(g.data.cuadra, true);
  assert.equal(g.data.total_abonos, 25.55);
  assert.equal(g.data.total_anticipos, 40);
  assert.equal(g.data.por_caja.find((f) => f.caja === '2').recibido, 25.55);
  assert.equal((await hacerGeneral('Z')).status, 201);
});

test('hacer un XG o un ZG no cambia el corte en curso de ninguna caja', async () => {
  const p = await crearProducto(t.admin, { precio: 7, stock: 20 });
  await vender(t.gerente, cj['1'], p, 7);
  await corte('1', 'Z');
  await vender(t.gerente, cj['1'], p, 7);
  await vender(t.gerente, cj['2'], p, 7);
  await corte('2', 'X');
  await vender(t.gerente, cj['2'], p, 7);

  const foto = async () => {
    const r = {};
    for (const n of ['1', '2', '3']) {
      r[`x${n}`] = (await api('GET', '/api/cuts/current', { token: t.gerente, caja: cj[n] })).data.ventas;
      r[`z${n}`] = (await api('GET', '/api/cuts/current-z', { token: t.gerente, caja: cj[n] })).data.ventas;
    }
    return r;
  };
  const antes = await foto();
  assert.equal((await hacerGeneral('X')).status, 201);
  assert.deepEqual(await foto(), antes);
  assert.equal((await hacerGeneral('Z')).status, 201);
  assert.deepEqual(await foto(), antes);
});

test('una diferencia de 1 centavo: 409 con el detalle por columna y sin guardar nada', async () => {
  const p = await crearProducto(t.admin, { precio: 9, stock: 5 });
  const id = await vender(t.gerente, cj['1'], p, 9);
  assert.equal((await corte('1', 'Z')).status, 201);
  await correr('UPDATE sales SET total = total + 1 WHERE id = ?', [id]);

  const generalesAntes = (await dbGet(db, "SELECT COUNT(*) n FROM cuts WHERE type = 'ZG'")).n;
  const ligasAntes = (await dbGet(db, 'SELECT COUNT(*) n FROM corte_general_cortes')).n;
  const r = await hacerGeneral('Z');
  assert.equal(r.status, 409);
  assert.equal(r.data.cuadra, false);
  assert.equal(r.data.diferencia_centavos, 2); // total_sales y ventas_contado
  assert.deepEqual(r.data.diferencias.map((d) => d.columna).sort(), ['total_sales', 'ventas_contado']);
  assert.equal(r.data.diferencias[0].guardado_centavos, 900);
  assert.equal(r.data.diferencias[0].calculado_centavos, 901);

  assert.equal((await dbGet(db, "SELECT COUNT(*) n FROM cuts WHERE type = 'ZG'")).n, generalesAntes);
  assert.equal((await dbGet(db, 'SELECT COUNT(*) n FROM corte_general_cortes')).n, ligasAntes);
  assert.equal((await dbGet(db, "SELECT COUNT(*) n FROM cuts WHERE type = 'Z' AND corte_general_id IS NULL")).n, 1);

  // La pantalla lo avisa en el corte en curso
  const g = await general('Z');
  assert.equal(g.data.cuadra, false);
  assert.equal(g.data.diferencia_centavos, 2);

  await correr('UPDATE sales SET total = total - 1 WHERE id = ?', [id]);
});

test('Gerente, Supervisor y Cajero: 403 en las rutas generales y al consultar un general por id; no lo ven en la lista', async () => {
  const p = await crearProducto(t.admin, { precio: 3, stock: 5 });
  await vender(t.gerente, cj['1'], p, 3);
  await corte('1', 'Z');
  const zg = await hacerGeneral('Z');
  assert.equal(zg.status, 201);

  for (const nombre of ['gerente', 'supervisor', 'cajero']) {
    const token = t[nombre];
    for (const ruta of ['/api/cuts/general/current?tipo=X', '/api/cuts/general/current?tipo=Z', '/api/cuts/general/print?tipo=Z', '/api/cuts/general/text?tipo=X']) {
      assert.equal((await api('GET', ruta, { token })).status, 403, `${nombre} ${ruta}`);
    }
    assert.equal((await api('POST', '/api/cuts/general', { token, body: { type: 'Z' } })).status, 403, nombre);
    for (const sufijo of ['', '/text', '/print']) {
      assert.equal((await api('GET', `/api/cuts/${zg.data.id}${sufijo}`, { token })).status, 403, `${nombre} ${sufijo}`);
    }
  }

  const lista = await api('GET', '/api/cuts', { token: t.gerente });
  assert.ok(lista.data.length > 0);
  assert.equal(lista.data.some((k) => ['XG', 'ZG'].includes(k.type)), false);
  assert.equal((await api('GET', '/api/cuts?type=ZG', { token: t.gerente })).data.length, 0);

  // El Administrador sí, y sin token de caja
  const admin = await api('GET', '/api/cuts?type=ZG', { token: t.admin, caja: null });
  assert.ok(admin.data.length > 0);
  assert.equal((await api('GET', `/api/cuts/${zg.data.id}/print`, { token: t.admin, caja: null })).status, 200);
  assert.equal((await api('GET', '/api/cuts/general/current?tipo=Z', { token: t.admin, caja: null })).status, 200);
});

test('el "último corte" de una caja nunca toma un general', async () => {
  const p = await crearProducto(t.admin, { precio: 8, stock: 5 });
  await vender(t.gerente, cj['2'], p, 8);
  await corte('2', 'Z');
  assert.equal((await hacerGeneral('X')).status, 201);
  assert.equal((await hacerGeneral('Z')).status, 201);
  await vender(t.gerente, cj['2'], p, 8);
  const x = await api('GET', '/api/cuts/current', { token: t.gerente, caja: cj['2'] });
  const z = await api('GET', '/api/cuts/current-z', { token: t.gerente, caja: cj['2'] });
  assert.equal(x.data.ultimo_corte.type, 'Z');
  assert.equal(z.data.ultimo_corte.type, 'Z');
  assert.equal(z.data.ventas.total_ventas_monto, 8);
});

test('ticket a 58 y 80 mm: ningún renglón pasa del ancho, títulos y rango por caja', async () => {
  const p = await crearProducto(t.admin, { precio: 1234.56, stock: 5 });
  await vender(t.gerente, cj['1'], p, 1234.56);
  await corte('1', 'Z');
  await vender(t.gerente, cj['3'], p, 1234.56);
  for (const [mm, ancho] of [[58, 32], [80, 48]]) {
    await api('PUT', '/api/settings', { token: t.admin, body: { ticket_width: mm } });
    for (const tipo of ['X', 'Z']) {
      const { ticketText } = (await api('GET', `/api/cuts/general/text?tipo=${tipo}`, { token: t.admin })).data;
      assert.match(ticketText, new RegExp(`CORTE ${tipo} GENERAL`));
      assert.match(ticketText, /Todas las cajas/);
      assert.match(ticketText, /DESGLOSE POR CAJA/);
      assert.match(ticketText, /Caja 1 - tickets/);
      for (const r of ticketText.split('\n')) assert.ok(r.length <= ancho, `${mm} mm: "${r}"`);
    }
  }
  await api('PUT', '/api/settings', { token: t.admin, body: { ticket_width: 58 } });
});

test('la suma de todos los ZG es igual al total de ventas y pagos de las cajas', async () => {
  const p = await crearProducto(t.admin, { precio: 33.33, iva: true, stock: 10 });
  for (const n of ['1', '2', '3']) await vender(t.gerente, cj[n], p, 33.33);
  await limpiar();
  const zg = await dbGet(db, "SELECT SUM(total_sales) v, SUM(total_recibido) r FROM cuts WHERE type = 'ZG'");
  const ventas = await dbGet(db, 'SELECT SUM(total) v FROM sales WHERE caja IS NOT NULL');
  const pagos = await dbGet(db, 'SELECT SUM(amount) r FROM payments WHERE caja IS NOT NULL');
  assert.equal(zg.v, ventas.v);
  assert.equal(zg.r, pagos.r);
});
