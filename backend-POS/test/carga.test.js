// Prueba de carga: ventas, abonos y entradas al mismo tiempo sobre la única
// conexión de Prisma. Revisa que nada falle por tiempo, que el stock nunca baje
// de cero y cuadre con el kardex, que ningún folio se repita, que los saldos
// cuadren con su historial, que el corte cuadre con los pagos y que la misma
// Idempotency-Key enviada varias veces a la vez registre una sola venta.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { iniciar, detener, api, login } = require('./helpers');

let db;
let baseUrl;
const tokens = {};
const ids = {};

const todas = (sql, params = []) =>
  new Promise((res, rej) => db.all(sql, params, (e, r) => (e ? rej(e) : res(r))));
const una = async (sql, params = []) => (await todas(sql, params))[0];

before(async () => {
  ({ db, baseUrl } = await iniciar());
  for (const u of ['cajero', 'supervisor', 'gerente', 'admin']) tokens[u] = await login(u);
  const cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Carga' } })).data.id;
  const alta = async (articulo, precio, stock) =>
    (await api('POST', '/api/products', {
      token: tokens.admin,
      body: { articulo, category_id: cat, precio_menudeo: precio, iva: 16, stock, activo: true },
    })).data.id;
  ids.escaso = await alta('Escaso', 100, 30);     // 60 ventas de 1 pieza: solo 30 pasan
  ids.surtido = await alta('Surtido', 50, 1000);
  ids.clientes = [];
  for (const nombre of ['Ana', 'Beto', 'Carla']) {
    ids.clientes.push((await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: nombre } })).data.id);
  }
  // Un apartado grande de Ana para recibir abonos durante la carga
  const ap = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'apartado', customer_id: ids.clientes[0], total_esperado: 2500,
      details: [{ product_id: ids.surtido, quantity: 50, tipo_precio: 'menudeo' }],
      payments: [{ method: 'efectivo', amount: 500 }],
    },
  });
  assert.equal(ap.status, 201, JSON.stringify(ap.data));
  ids.apartado = ap.data.id;
});

after(detener);

test('carga: 60 ventas, abonos, entradas y claves repetidas al mismo tiempo', async () => {
  const cajeros = [tokens.cajero, tokens.supervisor, tokens.gerente];
  const operaciones = [];

  // 60 ventas de 1 pieza del producto escaso (stock 30)
  for (let i = 0; i < 60; i++) {
    operaciones.push(['escaso', api('POST', '/api/sales', {
      token: cajeros[i % 3],
      body: {
        type: 'contado', total_esperado: 100,
        details: [{ product_id: ids.escaso, quantity: 1, tipo_precio: 'menudeo' }],
        payments: [{ method: i % 2 ? 'efectivo' : 'tarjeta', amount: 100 }],
      },
    })]);
  }
  // 30 ventas del surtido: contado, apartado y crédito de distintos clientes
  for (let i = 0; i < 30; i++) {
    const tipo = ['contado', 'apartado', 'credito'][i % 3];
    const cliente = ids.clientes[i % 3];
    operaciones.push(['surtido', api('POST', '/api/sales', {
      token: cajeros[i % 3],
      body: {
        type: tipo, customer_id: tipo === 'contado' ? undefined : cliente, total_esperado: 100,
        details: [{ product_id: ids.surtido, quantity: 2, tipo_precio: 'menudeo' }],
        payments: tipo === 'contado' ? [{ method: 'transferencia', amount: 100 }]
          : tipo === 'apartado' ? [{ method: 'efectivo', amount: 30 }] : [],
      },
    })]);
  }
  // 20 abonos de $10 al apartado de Ana
  for (let i = 0; i < 20; i++) {
    operaciones.push(['abono', api('POST', '/api/apartados/abono', {
      token: tokens.cajero,
      body: { sale_id: ids.apartado, pagos: [{ method: 'efectivo', amount: 10 }] },
    })]);
  }
  // 10 entradas de 5 piezas del surtido
  for (let i = 0; i < 10; i++) {
    operaciones.push(['entrada', api('POST', '/api/entries', {
      token: tokens.gerente,
      body: { entry_type: 'ENTRADA', movement_reason: 'COMPRA_PROVEEDOR', items: [{ product_id: ids.surtido, quantity: 5 }] },
    })]);
  }
  // La misma venta enviada 8 veces a la vez con la misma Idempotency-Key
  const clave = crypto.randomUUID();
  for (let i = 0; i < 8; i++) {
    operaciones.push(['repetida', api('POST', '/api/sales', {
      token: tokens.cajero,
      clave,
      body: {
        type: 'contado', total_esperado: 50,
        details: [{ product_id: ids.surtido, quantity: 1, tipo_precio: 'menudeo' }],
        payments: [{ method: 'efectivo', amount: 50 }],
      },
    })]);
  }

  // Mientras tanto, una consulta cada 100 ms (lo que haría otra caja): se mide
  // cuánto tarda en responder en plena carga
  const esperas = [];
  let corriendo = true;
  const sondeo = (async () => {
    while (corriendo) {
      const t = Date.now();
      await fetch(`${baseUrl}/health`);
      esperas.push(Date.now() - t);
      await new Promise((r) => setTimeout(r, 100));
    }
  })();
  const inicio = Date.now();
  const resultados = await Promise.all(operaciones.map(async ([tipo, p]) => ({ tipo, ...(await p) })));
  const duracion = Date.now() - inicio;
  corriendo = false;
  await sondeo;
  console.log(`   carga: ${operaciones.length} operaciones en ${duracion} ms; /health respondió en máx. ${Math.max(...esperas)} ms (${esperas.length} consultas)`);

  const de = (tipo) => resultados.filter((r) => r.tipo === tipo);
  const estados = (tipo) => de(tipo).map((r) => r.status);

  // Nada falla por tiempo ni por error interno
  const inesperados = resultados.filter((r) => ![200, 201, 409].includes(r.status));
  assert.deepEqual(inesperados.map((r) => [r.tipo, r.status, r.data]), []);
  assert.ok(Math.max(...esperas) < 2000, `otra petición se atiende en menos de 2 s en plena carga (máx. ${Math.max(...esperas)} ms)`);

  // Escaso: exactamente 30 ventas pasan y 30 se rechazan por stock
  assert.equal(estados('escaso').filter((s) => s === 201).length, 30);
  assert.equal(estados('escaso').filter((s) => s === 409).length, 30);
  assert.ok(de('escaso').filter((r) => r.status === 409).every((r) => /Stock insuficiente/.test(r.data.error)));
  assert.deepEqual(estados('surtido'), Array(30).fill(201));
  assert.deepEqual(estados('abono'), Array(20).fill(200));
  assert.deepEqual(estados('entrada'), Array(10).fill(201));

  // Idempotencia: las 8 responden con la misma venta y solo una se registró
  const repetidas = de('repetida');
  assert.deepEqual(repetidas.map((r) => r.status), Array(8).fill(201));
  assert.equal(new Set(repetidas.map((r) => r.data.id)).size, 1);
  assert.equal(repetidas.filter((r) => r.data.repetida).length, 7);
  assert.equal((await una('SELECT COUNT(*) AS n FROM sale_details WHERE sale_id = ?', [repetidas[0].data.id])).n, 1);

  // Folios: ninguno repetido, y cada venta que respondió 201 existe una sola vez
  const folios = resultados.filter((r) => r.status === 201 && r.tipo !== 'entrada' && !r.data.repetida).map((r) => r.data.id);
  assert.equal(new Set(folios).size, folios.length);
  const enBase = await todas(`SELECT id FROM sales WHERE id IN (${folios.join(',')})`);
  assert.equal(enBase.length, folios.length);
  const kardexVentas = await todas(`SELECT related_folio, product_id, COUNT(*) AS n FROM kardex
    WHERE movement_type = 'SALIDA' GROUP BY related_folio, product_id HAVING n > 1`);
  assert.deepEqual(kardexVentas, [], 'ninguna venta dejó dos movimientos del mismo producto');
});

test('después de la carga: el stock nunca bajó de cero y cuadra con el kardex', async () => {
  for (const id of [ids.escaso, ids.surtido]) {
    const { stock } = await una('SELECT stock FROM products WHERE id = ?', [id]);
    const movimientos = await todas('SELECT movement_type, previous_stock, moved_quantity, new_stock FROM kardex WHERE product_id = ? ORDER BY id', [id]);
    let anterior = 0;
    for (const m of movimientos) {
      assert.equal(m.previous_stock, anterior, 'cada movimiento parte del stock que dejó el anterior');
      const esperado = m.movement_type === 'SALIDA' ? anterior - m.moved_quantity : anterior + m.moved_quantity;
      assert.equal(m.new_stock, esperado);
      assert.ok(m.new_stock >= 0, 'el stock nunca bajó de cero');
      anterior = m.new_stock;
    }
    assert.equal(stock, anterior, 'el stock del producto es el último del kardex');
  }
  assert.equal((await una('SELECT stock FROM products WHERE id = ?', [ids.escaso])).stock, 0);
  // Surtido: 1000 - 50 (apartado) - 30×2 + 10×5 - 1 (venta con clave repetida)
  assert.equal((await una('SELECT stock FROM products WHERE id = ?', [ids.surtido])).stock, 939);
});

test('después de la carga: cada saldo cuadra con su historial y con lo pendiente', async () => {
  for (const id of ids.clientes) {
    const { current_balance } = await una('SELECT current_balance FROM customers WHERE id = ?', [id]);
    const { historial } = await una('SELECT COALESCE(SUM(amount), 0) AS historial FROM customer_balance_history WHERE customer_id = ?', [id]);
    const { pendiente } = await una(`SELECT COALESCE(SUM(pending_balance), 0) AS pendiente FROM sales
      WHERE customer_id = ? AND type IN ('apartado', 'credito')`, [id]);
    assert.equal(current_balance, historial, `cliente ${id}: saldo = suma del historial`);
    assert.equal(current_balance, pendiente, `cliente ${id}: saldo = lo pendiente de sus ventas`);
  }
  // Ana: apartado de 2500 con 500 de anticipo y 20 abonos de 10 → 1800, más sus ventas de la carga
  const apartado = await una('SELECT paid, pending_balance FROM sales WHERE id = ?', [ids.apartado]);
  assert.deepEqual({ ...apartado }, { paid: 70000, pending_balance: 180000 });
});

test('después de la carga: el corte cuadra con las ventas y los pagos', async () => {
  const corte = (await api('GET', '/api/cuts/current-z', { token: tokens.gerente })).data;
  const { total, iva, n } = await una('SELECT SUM(total) AS total, SUM(tax_total) AS iva, COUNT(*) AS n FROM sales');
  const { cobrado } = await una('SELECT SUM(amount) AS cobrado FROM payments');
  const porMetodo = await todas('SELECT method, SUM(amount) AS suma FROM payments GROUP BY method');

  assert.equal(corte.ventas.total_ventas, n);
  assert.equal(Math.round(corte.ventas.total_ventas_monto * 100), total);
  assert.equal(Math.round(corte.ventas.total_iva_gravado * 100), iva);
  assert.equal(Math.round(corte.total_recibido * 100), cobrado);
  for (const { method, suma } of porMetodo) {
    assert.equal(Math.round(corte.pagos[method] * 100), suma, `pagos en ${method}`);
  }

  // Guardar el corte X con todo y que el siguiente quede vacío
  assert.equal((await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X' } })).status, 201);
  assert.equal((await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X' } })).status, 400);
  const guardado = await una('SELECT total_recibido, total_sales FROM cuts ORDER BY id DESC LIMIT 1');
  assert.deepEqual({ ...guardado }, { total_recibido: cobrado, total_sales: total });
});

test('reset del SuperDeveloper: vacía tablas con dependientes y las llaves siguen activas', async () => {
  const sd = await api('POST', '/api/superdev/entrar', { body: { nickname: 'superdev', password: 'clave-super-de-prueba' } });
  const r = await api('POST', '/api/reset/tables', {
    token: sd.data.token,
    body: { tables: ['sale_details', 'payments', 'customer_balance_history', 'sales', 'kardex', 'entry_details', 'entries'] },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.match(r.data.backup, /^pos_backup_\d+\.db$/);
  assert.equal((await una('SELECT COUNT(*) AS n FROM sales')).n, 0);
  assert.equal((await una('SELECT COUNT(*) AS n FROM idempotencia')).n, 0);

  // Las llaves foráneas siguen activas: no se borra una categoría con productos
  const cat = (await una('SELECT category_id FROM products LIMIT 1')).category_id;
  assert.equal((await api('DELETE', `/api/categories/${cat}`, { token: tokens.gerente })).status, 409);
});
