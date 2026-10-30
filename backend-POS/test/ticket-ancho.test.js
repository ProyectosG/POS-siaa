// Ancho del ticket según Configuración (58 mm por omisión, u 80 mm):
// ningún renglón de la venta ni del corte pasa del ancho
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, detener, api, login } = require('./helpers');

const tokens = {};
const ventas = {};
let corte;

const renglonesLargos = (texto, ancho) => texto.split('\n').filter((r) => r.length > ancho);

before(async () => {
  await iniciar();
  for (const u of ['cajero', 'admin']) tokens[u] = await login(u);
  const cat = (await api('POST', '/api/categories', { token: tokens.admin, body: { family: 'Línea Blanca' } })).data.id;
  const alta = async (articulo, precio) => (await api('POST', '/api/products', {
    token: tokens.admin, body: { articulo, category_id: cat, precio_menudeo: precio, activo: true },
  })).data.id;
  const refri = await alta('Refrigerador Dúplex de Acero Inoxidable con Despachador de Agua y Hielo', 123456.78);
  const vaso = await alta('Vaso', 15.5);
  const entrada = await api('POST', '/api/entries', {
    token: tokens.admin,
    body: { entry_type: 'ENTRADA', movement_reason: 'COMPRA_PROVEEDOR', items: [{ product_id: refri, quantity: 20 }, { product_id: vaso, quantity: 200 }] },
  });
  assert.equal(entrada.status, 201, JSON.stringify(entrada.data));
  const cliente = (await api('POST', '/api/customers', {
    token: tokens.cajero,
    body: { first_name: 'María Guadalupe Fernanda', last_name_paternal: 'Hernández', last_name_maternal: 'Villaseñor', phone: '5512345678' },
  })).data.id;

  const vender = async (type, details, total, payments, customer_id) => {
    const r = await api('POST', '/api/sales', { token: tokens.cajero, body: { type, customer_id, total_esperado: total, details, payments } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.id;
  };
  ventas.contado = await vender('contado',
    [{ product_id: refri, quantity: 8, tipo_precio: 'menudeo' }, { product_id: vaso, quantity: 120, tipo_precio: 'menudeo' }],
    989514.24, [{ method: 'tarjeta', amount: 989514.24, bank: 'Banco Nacional de Comercio Exterior' }]);
  ventas.credito = await vender('credito', [{ product_id: refri, quantity: 1, tipo_precio: 'menudeo' }],
    123456.78, [{ method: 'transferencia', amount: 1000 }], cliente);
  ventas.apartado = await vender('apartado', [{ product_id: vaso, quantity: 3, tipo_precio: 'menudeo' }],
    46.5, [{ method: 'efectivo', amount: 10 }], cliente);
  corte = (await api('POST', '/api/cuts', { token: tokens.cajero, body: { type: 'X', cash_register: '1' } })).data.id;
});

after(detener);

async function revisar(ancho) {
  for (const [tipo, id] of Object.entries(ventas)) {
    const { status, data } = await api('GET', `/api/tickets/${id}/text`, { token: tokens.cajero });
    assert.equal(status, 200);
    assert.deepEqual(renglonesLargos(data.ticketText, ancho), [], `venta ${tipo} en ${ancho}`);
    assert.match(data.ticketText, /^Total:\s+\$\d+\.\d{2}$/m);
  }
  const { data } = await api('GET', `/api/cuts/${corte}/text`, { token: tokens.admin });
  assert.deepEqual(renglonesLargos(data.ticketText, ancho), [], `corte en ${ancho}`);
  assert.match(data.ticketText, /Total Ventas:\s+\$1113017\.52/);
  const actual = await api('GET', '/api/cuts/print/current?tipo=X&caja=1', { token: tokens.cajero });
  if (actual.data.ticketText) assert.deepEqual(renglonesLargos(actual.data.ticketText, ancho), [], `corte en curso en ${ancho}`);
}

test('por omisión (58 mm) todo cabe en 32 caracteres', async () => {
  await revisar(32);
  const { data } = await api('GET', `/api/tickets/${ventas.credito}/text`, { token: tokens.cajero });
  // La fecha y la hora no caben juntas: van en dos renglones; el cliente se parte sin perderse
  assert.match(data.ticketText, /^Fecha: \d{4}-\d{2}-\d{2}\nHora: /m);
  assert.match(data.ticketText, /Villaseñor/);
  // Monto grande alineado a la derecha y la firma al ancho
  assert.match(data.ticketText, /^Total:\s+\$123456\.78$/m);
  assert.match(data.ticketText, /^_{32}$/m);
});

test('con 80 mm en Configuración cabe en 48 y salen el encabezado y el pie del negocio', async () => {
  const r = await api('PUT', '/api/settings', {
    token: tokens.admin,
    body: { ticket_width: 80, ticket_header_line1: 'Mueblería La Esperanza', ticket_subheader_line1: 'RFC XAXX010101000', ticket_footer_line1: 'Cambios con ticket en 30 días' },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));

  await revisar(48);
  const { data } = await api('GET', `/api/tickets/${ventas.contado}/text`, { token: tokens.cajero });
  const renglones = data.ticketText.split('\n').map((x) => x.trim());
  assert.equal(renglones[0], 'Mueblería La Esperanza');
  assert.equal(renglones[1], 'RFC XAXX010101000');
  assert.ok(renglones.includes('Cambios con ticket en 30 días'));
  assert.match(data.ticketText, /^Fecha: \S+   Hora: /m); // ya caben juntas
  assert.match(data.ticketText, /^={48}$/m);
});

test('el texto para la impresora va sin acentos', () => {
  const { sinAcentos } = require('../src/utils/ticketConfig');
  assert.equal(sinAcentos('Crédito ¡Gracias! Año — Artículo ¿ñ?'), 'Credito Gracias! Ano - Articulo n?');
  assert.equal(sinAcentos('línea 1\nlínea 2'), 'linea 1\nlinea 2');
});
