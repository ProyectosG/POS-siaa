// test/demo.test.js
// Modo demo (MODO_DEMO=1): base nueva sembrada en cada arranque y lo sensible
// bloqueado en el servidor.
const helpers = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// La demo exige una base llamada demo.db (en la carpeta temporal de la prueba)
const carpeta = path.dirname(process.env.DB_PATH);
process.env.DB_PATH = path.join(carpeta, 'demo.db');
process.env.MODO_DEMO = '1';

const { api, dbGet } = helpers;
let db;
let token;

before(async () => {
  // helpers deja en demo.db una base vieja con sus usuarios; la demo debe borrarla
  ({ db } = await helpers.iniciar());
  const { status, data } = await api('POST', '/api/users/login', { body: { nickname: 'demo', password: 'demo' } });
  assert.strictEqual(status, 200);
  token = data.token;
});

after(async () => {
  await helpers.detener();
});

test('la base se reinicia: los usuarios anteriores ya no existen y demo es Administrador', async () => {
  const viejo = await api('POST', '/api/users/login', { body: { nickname: 'admin', password: 'admin123' } });
  assert.strictEqual(viejo.status, 401);
  const demo = await dbGet(db, "SELECT access_level FROM users WHERE nickname = 'demo'");
  assert.strictEqual(demo.access_level, 99);
});

test('siembra: 30 productos con costo, 10 clientes y dos semanas de ventas', async () => {
  const productos = await dbGet(db, 'SELECT COUNT(*) n, COUNT(costo) con_costo FROM products');
  assert.deepStrictEqual({ ...productos }, { n: 30, con_costo: 30 });
  assert.strictEqual((await dbGet(db, 'SELECT COUNT(*) n FROM customers')).n, 10);

  const dias = await dbGet(db, 'SELECT COUNT(DISTINCT date) n FROM sales');
  assert.ok(dias.n >= 13, `ventas en ${dias.n} días`);
  for (const tipo of ['contado', 'apartado', 'credito']) {
    assert.ok((await dbGet(db, 'SELECT COUNT(*) n FROM sales WHERE type = ?', [tipo])).n > 0, `sin ventas de ${tipo}`);
  }
  assert.ok((await dbGet(db, "SELECT COUNT(*) n FROM payments WHERE payment_type = 'abono'")).n > 0);
  assert.ok((await dbGet(db, "SELECT COUNT(*) n FROM cuts WHERE type = 'Z'")).n >= 13);
  // Todas las ventas copiaron el costo al renglón
  assert.strictEqual((await dbGet(db, 'SELECT COUNT(*) n FROM sale_details WHERE costo_unitario IS NULL')).n, 0);
});

test('siembra: el stock cuadra con el kardex y el saldo de cada cliente con lo pendiente', async () => {
  const stock = await dbGet(db, `
    SELECT COUNT(*) n FROM products p
    WHERE p.stock <> (SELECT k.new_stock FROM kardex k WHERE k.product_id = p.id ORDER BY k.id DESC LIMIT 1)`);
  assert.strictEqual(stock.n, 0);
  const saldos = await dbGet(db, `
    SELECT COUNT(*) n FROM customers c
    WHERE c.current_balance <> (SELECT COALESCE(SUM(s.pending_balance), 0) FROM sales s WHERE s.customer_id = c.id)`);
  assert.strictEqual(saldos.n, 0);
});

test('lo sensible responde 403', async () => {
  const bloqueadas = [
    ['POST', '/api/users', { nickname: 'x', password: 'x', access_level: 1 }],
    ['PUT', '/api/users/1', { full_name: 'x' }],
    ['DELETE', '/api/users/2'],
    ['PATCH', '/api/users/1/photo', { photo_url: 'x' }],
    ['POST', '/api/USERS/', { nickname: 'y', password: 'y', access_level: 1 }], // sin distinguir mayúsculas
    ['PUT', '/api/cash-registers/1', { password: 'otra' }],
    ['POST', '/api/superdev/entrar', { nickname: 'superdev', password: 'clave-super-de-prueba' }],
    ['GET', '/api/superdev/respaldo'],
    ['POST', '/api/reset/tables', { tables: ['sales'] }],
    ['PUT', '/api/settings', { ticket_header_line1: 'x' }],
    ['POST', '/api/settings/validar-clave-precio', { clave: '1234', product_id: 1, precio: 1 }],
    ['GET', '/api/tickets/1/print'],
  ];
  for (const [metodo, ruta, body] of bloqueadas) {
    const { status, data } = await api(metodo, ruta, { token, body });
    assert.strictEqual(status, 403, `${metodo} ${ruta} respondió ${status}`);
    assert.strictEqual(data.error, 'No disponible en la demo');
  }
  // Nada cambió
  assert.strictEqual((await dbGet(db, 'SELECT COUNT(*) n FROM users')).n, 3);
});

test('lo demás funciona: vista previa del ticket, corte en vista previa, usuarios, utilidad y una venta', async () => {
  const ticket = await api('GET', '/api/tickets/1/text', { token });
  assert.strictEqual(ticket.status, 200);
  assert.match(ticket.data.ticketText, /TICKET DE VENTA/);

  const corte = await api('GET', '/api/cuts/print/current?tipo=X&caja=1', { token });
  assert.strictEqual(corte.status, 200);
  assert.ok(corte.data.ticketText);

  const usuarios = await api('GET', '/api/users', { token });
  assert.strictEqual(usuarios.status, 200);
  assert.strictEqual(usuarios.data.length, 3);

  const utilidad = await api('GET', '/api/reportes/utilidad?periodo=mes', { token });
  assert.strictEqual(utilidad.status, 200);

  const caja = await api('POST', '/api/cash-registers/abrir', { token, body: { numero_caja: '1', password: 'demo' } });
  assert.strictEqual(caja.status, 200);

  const producto = await dbGet(db, 'SELECT id, precio_menudeo FROM products WHERE stock > 0 LIMIT 1');
  const total = producto.precio_menudeo / 100;
  const venta = await api('POST', '/api/sales', {
    token,
    body: {
      type: 'contado',
      details: [{ product_id: producto.id, quantity: 1, tipo_precio: 'menudeo' }],
      payments: [{ method: 'efectivo', amount: total }],
      total_esperado: total,
    },
  });
  assert.strictEqual(venta.status, 201);
  // La venta nueva lleva la fecha real (el reloj de la siembra ya se soltó)
  const fila = await dbGet(db, 'SELECT date FROM sales WHERE id = ?', [venta.data.id]);
  assert.strictEqual(fila.date, require('../src/utils/fechas').ahoraNegocio().date);
});

test('/health avisa que es la demo', async () => {
  const { status, data } = await api('GET', '/health');
  assert.strictEqual(status, 200);
  assert.strictEqual(data.demo, true);
});

test('candado: la demo no borra una base que no se llame demo.db', () => {
  const { borrarBaseDemo } = require('../src/demo/demo');
  const real = path.join(carpeta, 'pos.db');
  fs.writeFileSync(real, 'no borrar');
  const antes = process.env.DB_PATH;
  try {
    process.env.DB_PATH = real;
    assert.throws(() => borrarBaseDemo(), /demo\.db/);
    delete process.env.DB_PATH;
    assert.throws(() => borrarBaseDemo(), /demo\.db/);
  } finally {
    process.env.DB_PATH = antes;
  }
  assert.strictEqual(fs.readFileSync(real, 'utf8'), 'no borrar');
});
