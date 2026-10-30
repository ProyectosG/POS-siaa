// "Saldos y stocks a cero" del SuperDeveloper: stock por el kardex y deudas perdonadas con historial
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { iniciar, detener, api, login, dbGet } = require('./helpers');

let db;
let superToken;
const tokens = {};
const ids = {};

const ultimoKardex = (id) =>
  dbGet(db, 'SELECT movement_type, movement_reason, previous_stock, moved_quantity, new_stock, related_folio, nickname_user FROM kardex WHERE product_id = ? ORDER BY id DESC LIMIT 1', [id]);

before(async () => {
  ({ db } = await iniciar());
  for (const u of ['cajero', 'admin']) tokens[u] = await login(u);
  superToken = (await api('POST', '/api/superdev/entrar', {
    body: { nickname: process.env.SUPERDEV_USER, password: process.env.SUPERDEV_PASSWORD },
  })).data.token;

  const cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Ropa' } })).data.id;
  const alta = async (articulo) => (await api('POST', '/api/products', {
    token: tokens.admin, body: { articulo, category_id: cat, precio_menudeo: 100, activo: true },
  })).data.id;
  ids.blusa = await alta('Blusa');
  ids.falda = await alta('Falda');
  ids.gorra = await alta('Gorra'); // sin stock: no debe dejar movimiento

  const entrada = await api('POST', '/api/entries', {
    token: tokens.admin,
    body: { entry_type: 'ENTRADA', movement_reason: 'COMPRA_PROVEEDOR', items: [{ product_id: ids.blusa, quantity: 5 }] },
  });
  assert.equal(entrada.status, 201, JSON.stringify(entrada.data));

  // Falda en negativo: se vende con el stock negativo permitido
  assert.equal((await api('PUT', '/api/settings', { token: tokens.admin, body: { allow_negative_balance: 1 } })).status, 200);
  ids.cliente = (await api('POST', '/api/customers', { token: tokens.cajero, body: { first_name: 'Ana' } })).data.id;
  const credito = await api('POST', '/api/sales', {
    token: tokens.cajero,
    body: {
      type: 'credito',
      customer_id: ids.cliente,
      total_esperado: 200,
      details: [{ product_id: ids.falda, quantity: 2, tipo_precio: 'menudeo' }],
      payments: [{ method: 'efectivo', amount: 50 }],
    },
  });
  assert.equal(credito.status, 201, JSON.stringify(credito.data));
  ids.venta = credito.data.id;
});

after(detener);

test('solo el SuperDeveloper puede usarlo', async () => {
  assert.equal((await api('POST', '/api/reset/balances', { token: tokens.admin })).status, 403);
  assert.equal((await dbGet(db, 'SELECT stock FROM products WHERE id = ?', [ids.blusa])).stock, 5);
});

test('stock a cero con su ajuste en el kardex y deudas perdonadas con historial', async () => {
  assert.equal((await dbGet(db, 'SELECT stock FROM products WHERE id = ?', [ids.falda])).stock, -2);
  assert.equal((await dbGet(db, 'SELECT current_balance FROM customers WHERE id = ?', [ids.cliente])).current_balance, 15000);

  const r = await api('POST', '/api/reset/balances', { token: superToken });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.deepEqual([r.data.productos, r.data.clientes, r.data.ventas], [2, 1, 1]);
  assert.match(r.data.message, /2 productos ajustados en el kardex, 1 cliente en \$0 y 1 venta sin pendiente/);
  assert.match(r.data.backup, /^pos_backup_\d+\.db$/);
  assert.ok(fs.existsSync(path.join(process.env.BACKUP_DIR, r.data.backup)));

  // Stock en 0 y el kardex termina igual
  const productos = await dbGet(db, 'SELECT COUNT(*) AS n FROM products WHERE stock <> 0');
  assert.equal(productos.n, 0);
  assert.deepEqual({ ...(await ultimoKardex(ids.blusa)) }, {
    movement_type: 'SALIDA', movement_reason: 'AJUSTE_NEGATIVO', previous_stock: 5, moved_quantity: 5, new_stock: 0, related_folio: 'RESET', nickname_user: 'SUPERdeveloper',
  });
  assert.deepEqual({ ...(await ultimoKardex(ids.falda)) }, {
    movement_type: 'ENTRADA', movement_reason: 'AJUSTE_POSITIVO', previous_stock: -2, moved_quantity: 2, new_stock: 0, related_folio: 'RESET', nickname_user: 'SUPERdeveloper',
  });
  assert.equal((await dbGet(db, 'SELECT COUNT(*) AS n FROM kardex WHERE product_id = ?', [ids.gorra])).n, 1); // solo el alta

  // Saldo y pendiente en 0, con historial; lo cobrado se conserva
  assert.equal((await dbGet(db, 'SELECT current_balance FROM customers WHERE id = ?', [ids.cliente])).current_balance, 0);
  const venta = await dbGet(db, 'SELECT pending_balance, paid, status FROM sales WHERE id = ?', [ids.venta]);
  assert.deepEqual({ ...venta }, { pending_balance: 0, paid: 5000, status: 'paid' });
  const historial = await dbGet(db, 'SELECT previous_balance, amount, new_balance, description FROM customer_balance_history WHERE customer_id = ? ORDER BY id DESC LIMIT 1', [ids.cliente]);
  assert.deepEqual({ ...historial }, { previous_balance: 15000, amount: -15000, new_balance: 0, description: 'Saldo a cero (reset del SuperDeveloper)' });

  // Ya no hay nada que abonar: el saldo no puede quedar negativo
  const abono = await api('POST', '/api/apartados/abono', {
    token: tokens.cajero,
    body: { sale_id: ids.venta, pagos: [{ method: 'efectivo', amount: 10 }] },
  });
  assert.equal(abono.status, 400);
  assert.equal((await dbGet(db, 'SELECT current_balance FROM customers WHERE id = ?', [ids.cliente])).current_balance, 0);
});

test('repetirlo sin nada que ajustar no deja movimientos nuevos', async () => {
  const antes = (await dbGet(db, 'SELECT COUNT(*) AS n FROM kardex')).n;
  const r = await api('POST', '/api/reset/balances', { token: superToken });
  assert.equal(r.status, 200);
  assert.deepEqual([r.data.productos, r.data.clientes, r.data.ventas], [0, 0, 0]);
  assert.equal((await dbGet(db, 'SELECT COUNT(*) AS n FROM kardex')).n, antes);
});
