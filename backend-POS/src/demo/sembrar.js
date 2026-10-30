// src/demo/sembrar.js
// Datos de la demo: una tienda de abarrotes con 30 productos (con costo), 10
// clientes y dos semanas de ventas de contado, apartados y créditos con abonos,
// más un corte Z por cada día pasado.
//
// Todo lo que mueve dinero o inventario pasa por el API real (en un puerto
// local temporal, antes de atender la primera petición), con el reloj fijado en
// la fecha de cada movimiento: precios, totales, kardex, saldos y cortes salen
// con la misma lógica que en la tienda. Solo usuarios, caja y configuración se
// escriben directo (sus rutas están bloqueadas en la demo).
const crypto = require('crypto');
const { prisma } = require('../config/prisma');
const { hashear } = require('../utils/seguridad');
const { ahoraNegocio, ahoraUTC, fijarReloj } = require('../utils/fechas');

const DIAS = 14;
const CLAVE_DEMO = 'demo';

// Familia, subfamilia, artículo, presentación, menudeo, mayoreo, costo (neto) e IVA (%)
const PRODUCTOS = [
  ['Abarrotes', 'Granos', 'Arroz súper extra', '1 kg', 32, 30, 24, 0],
  ['Abarrotes', 'Granos', 'Frijol negro', '1 kg', 42, 39, 31, 0],
  ['Abarrotes', 'Básicos', 'Azúcar estándar', '1 kg', 34, 32, 26, 0],
  ['Abarrotes', 'Básicos', 'Aceite vegetal', '1 L', 45, 42, 35, 0],
  ['Abarrotes', 'Básicos', 'Sal de mesa', '1 kg', 15, 14, 9, 0],
  ['Abarrotes', 'Básicos', 'Harina de maíz', '1 kg', 24, 22, 17, 0],
  ['Abarrotes', 'Básicos', 'Pasta para sopa', '200 g', 11, 10, 7, 0],
  ['Abarrotes', 'Enlatados', 'Atún en agua', '140 g', 22, 20, 15.5, 0],
  ['Abarrotes', 'Básicos', 'Café soluble', '100 g', 68, 64, 52, 0],
  ['Abarrotes', 'Galletas', 'Galletas marías', '170 g', 19, 18, 13, 0],
  ['Lácteos', 'Leche', 'Leche entera', '1 L', 28, 26.5, 22, 0],
  ['Lácteos', 'Huevo', 'Huevo blanco', '12 piezas', 48, 45, 38, 0],
  ['Lácteos', 'Leche', 'Yogur bebible', '1 L', 39, 37, 29, 0],
  ['Lácteos', 'Quesos', 'Queso fresco', '400 g', 72, 68, 55, 0],
  ['Lácteos', 'Cremas', 'Crema ácida', '200 ml', 21, 20, 15, 0],
  ['Bebidas', 'Refrescos', 'Refresco de cola', '600 ml', 20, 18, 14, 0],
  ['Bebidas', 'Aguas', 'Agua natural', '1.5 L', 16, 14.5, 10, 0],
  ['Bebidas', 'Jugos', 'Jugo de naranja', '1 L', 33, 31, 24, 0],
  ['Bebidas', 'Refrescos', 'Refresco de cola familiar', '2.5 L', 45, 42, 35, 0],
  ['Bebidas', 'Cervezas', 'Cerveza clara', '355 ml', 23, 21, 16.5, 16],
  ['Botanas y dulces', 'Botanas', 'Papas fritas', '45 g', 19, 17.5, 13, 0],
  ['Botanas y dulces', 'Botanas', 'Cacahuates japoneses', '100 g', 17, 16, 11, 0],
  ['Botanas y dulces', 'Dulces', 'Chocolate en barra', '40 g', 16, 15, 11, 0],
  ['Botanas y dulces', 'Pan', 'Pan dulce empaquetado', '4 piezas', 26, 24, 19, 0],
  ['Limpieza', 'Ropa', 'Detergente en polvo', '1 kg', 46, 43, 34, 16],
  ['Limpieza', 'Ropa', 'Jabón de barra', '350 g', 24, 22, 17, 16],
  ['Limpieza', 'Hogar', 'Cloro', '1 L', 22, 20, 15, 16],
  ['Limpieza', 'Higiene', 'Papel higiénico', '4 rollos', 38, 35, 28, 16],
  ['Limpieza', 'Hogar', 'Lavatrastes líquido', '750 ml', 36, 33, 26, 16],
  ['Limpieza', 'Higiene', 'Pasta dental', '100 ml', 34, 31, 24, 16],
];

const CLIENTES = [
  ['María', 'Hernández', 'López', '2221034587'],
  ['José', 'García', 'Martínez', '2224417790'],
  ['Guadalupe', 'Ramírez', 'Cruz', '2225589012'],
  ['Juan', 'Flores', 'Sánchez', '2226673341'],
  ['Rosa', 'Morales', 'Pérez', '2227785564'],
  ['Francisco', 'Jiménez', 'Reyes', '2228896675'],
  ['Carmen', 'Torres', 'Díaz', '2229907786'],
  ['Miguel', 'Vázquez', 'Ruiz', '2221118897'],
  ['Patricia', 'Mendoza', 'Ortiz', '2222229908'],
  ['Antonio', 'Castillo', 'Gómez', '2223330019'],
];

// Números al azar repetibles (la demo sale igual en cada arranque, salvo las fechas)
function azarConSemilla(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const centavos = (pesos) => Math.round(pesos * 100);
const pesos = (c) => c / 100;

// 'AAAA-MM-DD' más n días
function sumarDias(fecha, n) {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// El instante en que el reloj del negocio (TZ_NEGOCIO) marca esa fecha y hora
function instanteNegocio(fecha, minutos) {
  const [y, m, d] = fecha.split('-').map(Number);
  const deseado = Date.UTC(y, m - 1, d, 0, minutos);
  let t = deseado;
  for (let i = 0; i < 2; i++) {
    const { date, time } = ahoraNegocio(new Date(t));
    t += deseado - Date.parse(`${date}T${time}Z`);
  }
  return new Date(t);
}

// Escribe directo lo que en la demo no se puede cambiar por el API
async function sembrarFijos() {
  const ahora = ahoraUTC();
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      ticket_header_line1: 'ABARROTES LA ESQUINA',
      ticket_header_line2: 'Av. Reforma 123, Centro',
      ticket_header_line3: 'Tel. 222 123 4567',
      ticket_footer_line1: 'Gracias por su compra',
      ticket_footer_line2: 'DEMO - datos de prueba',
      auto_print_ticket: 0,
      allow_discounts: 1,
      max_discount_without_auth: 10,
      allow_negative_balance: 0,
      updated_at: ahora,
    },
  });

  // Los otros dos usuarios solo sirven para que la demo tenga varios cajeros:
  // su clave es al azar y nadie la conoce
  const usuarios = {
    demo: { full_name: 'Usuario Demo', access_level: 99, clave: CLAVE_DEMO },
    maria: { full_name: 'María Cajera', access_level: 1, clave: crypto.randomBytes(18).toString('hex') },
    luis: { full_name: 'Luis Gerente', access_level: 90, clave: crypto.randomBytes(18).toString('hex') },
  };
  for (const [nickname, u] of Object.entries(usuarios)) {
    await prisma.users.create({
      data: { nickname, full_name: u.full_name, access_level: u.access_level, password: await hashear(u.clave) },
    });
  }

  await prisma.cash_registers.create({ data: { numero_caja: '1', tipo_caja: 'Normal', password: await hashear(CLAVE_DEMO) } });
  return usuarios;
}

// Revisión final: el stock de cada producto es el último saldo de su kardex y
// el saldo de cada cliente es lo pendiente de sus ventas
async function verificar() {
  for (const p of await prisma.products.findMany({ select: { id: true, articulo: true, stock: true } })) {
    const ultimo = await prisma.kardex.findFirst({ where: { product_id: p.id }, orderBy: { id: 'desc' } });
    if (!ultimo || ultimo.new_stock !== p.stock) throw new Error(`Demo: el stock de ${p.articulo} no cuadra con el kardex`);
  }
  for (const c of await prisma.customers.findMany({ select: { id: true, current_balance: true } })) {
    const { _sum } = await prisma.sales.aggregate({ where: { customer_id: c.id }, _sum: { pending_balance: true } });
    if ((_sum.pending_balance ?? 0) !== c.current_balance) throw new Error(`Demo: el saldo del cliente ${c.id} no cuadra`);
  }
}

async function sembrar(app) {
  const inicio = Date.now();
  const azar = azarConSemilla(20261029);
  const entre = (min, max) => min + Math.floor(azar() * (max - min + 1));
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

  const usuarios = await sembrarFijos();

  // API real en un puerto local temporal
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${servidor.address().port}/api`;

  async function api(token, metodo, ruta, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (metodo === 'POST') headers['Idempotency-Key'] = crypto.randomUUID();
    const res = await fetch(base + ruta, { method: metodo, headers, body: body && JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Demo: ${metodo} ${ruta} respondió ${res.status} ${JSON.stringify(data)}`);
    return data;
  }
  const entrar = async (nickname) =>
    (await api(null, 'POST', '/users/login', { nickname, password: usuarios[nickname].clave })).token;

  const conteo = { ventas: 0, abonos: 0, cortes: 0 };

  try {
    const tokens = { demo: await entrar('demo'), maria: await entrar('maria'), luis: await entrar('luis') };
    const hoy = ahoraNegocio(new Date()).date;
    const ahora = Date.now();
    const fechaDe = (dia) => sumarDias(hoy, dia - (DIAS - 1)); // día 0 = hace 13 días; día 13 = hoy
    const a = (dia, hora, minuto = 0) => fijarReloj(instanteNegocio(fechaDe(dia), hora * 60 + minuto));

    // --- Catálogo (primer día, antes de abrir) ---
    a(0, 7, 0);
    const categorias = new Map();
    for (const [familia, subfamilia] of PRODUCTOS) {
      const llave = `${familia}|${subfamilia}`;
      if (!categorias.has(llave)) {
        categorias.set(llave, (await api(tokens.demo, 'POST', '/categories', { family: familia, subfamily: subfamilia })).id);
      }
    }

    const productos = [];
    for (const [i, [familia, subfamilia, articulo, presentacion, menudeo, mayoreo, costo, iva]] of PRODUCTOS.entries()) {
      const { id } = await api(tokens.demo, 'POST', '/products', {
        articulo,
        presentacion,
        unidad_medida: 'PZ', // mismas claves que la lista del catálogo (PZ, KG, LT, CJ, PQ)
        precio_menudeo: menudeo,
        precio_mayoreo: mayoreo,
        precio_especial: mayoreo,
        costo,
        iva: iva || null,
        category_id: categorias.get(`${familia}|${subfamilia}`),
        codigo_barras: `75010000${String(i + 1).padStart(5, '0')}`,
        codigo_interno: `AB-${String(i + 1).padStart(3, '0')}`,
      });
      productos.push({ id, menudeo: centavos(menudeo), mayoreo: centavos(mayoreo) });
    }

    for (const c of CLIENTES) {
      const [first_name, last_name_paternal, last_name_maternal, phone] = c;
      c.id = (await api(tokens.demo, 'POST', '/customers', {
        first_name, last_name_paternal, last_name_maternal, phone, city: 'Puebla',
      })).id;
    }

    // Compra inicial y resurtido a media quincena (entradas con kardex)
    const surtir = (min, max, comentario) => api(tokens.luis, 'POST', '/entries', {
      entry_type: 'ENTRADA',
      movement_reason: 'COMPRA_PROVEEDOR',
      comments: comentario,
      items: productos.map((p) => ({ product_id: p.id, quantity: entre(min, max) })),
    });
    a(0, 7, 30);
    await surtir(50, 90, 'Compra inicial a proveedor');

    // El proveedor cambió la etiqueta del primer producto: queda en su historial
    // de códigos (y el código viejo todavía lo encuentra al vender)
    a(0, 7, 45);
    await api(tokens.luis, 'PUT', `/products/${productos[0].id}`, { codigo_barras: '7502000000001' });

    // --- Dos semanas de ventas, abonos y cortes ---
    const pendientes = []; // apartados y créditos con saldo: { id, cliente, pendiente }

    async function vender(token, tipo, cliente) {
      const renglones = [];
      // Los apartados y créditos son compras más grandes
      for (let r = tipo === 'contado' ? entre(1, 4) : entre(3, 6); r > 0; r--) {
        const p = elegir(productos.filter((x) => !renglones.some((r) => r.product_id === x.id)));
        const cantidad = tipo === 'contado' ? entre(1, 3) : entre(2, 4);
        const mayoreo = cantidad >= 3 && azar() < 0.4;
        const descuento = tipo === 'contado' && azar() < 0.08 ? 5 : 0;
        const bruto = (mayoreo ? p.mayoreo : p.menudeo) * cantidad;
        renglones.push({
          product_id: p.id, quantity: cantidad, tipo_precio: mayoreo ? 'mayoreo' : 'menudeo', discount_pct: descuento,
          importe: bruto - Math.round((bruto * descuento) / 100),
        });
      }
      const total = renglones.reduce((s, r) => s + r.importe, 0);
      const details = renglones.map(({ importe, ...r }) => r);

      let pagado;
      let metodo = 'efectivo';
      if (tipo === 'contado') {
        pagado = total;
        const tiro = azar();
        if (tiro > 0.9) metodo = 'transferencia';
        else if (tiro > 0.7) metodo = 'tarjeta';
      } else if (tipo === 'apartado') {
        pagado = Math.max(1000, Math.round((total * entre(30, 50)) / 100 / 1000) * 1000); // de 10 en 10 pesos
        if (pagado >= total) pagado = Math.round(total / 2);
      } else {
        pagado = azar() < 0.5 ? 0 : Math.round(total / 5 / 1000) * 1000;
      }

      const payments = pagado > 0 ? [{
        method: metodo,
        amount: pesos(pagado),
        ...(metodo === 'tarjeta' && { bank: elegir(['BBVA', 'Banorte', 'Santander']), last4: String(entre(1000, 9999)) }),
        ...(metodo === 'transferencia' && { reference: `SPEI${entre(100000, 999999)}` }),
      }] : [];
      // En efectivo, a veces pagan con un billete más grande
      const recibido = metodo === 'efectivo' && pagado > 0 && azar() < 0.6
        ? Math.ceil(pagado / 5000) * 5000
        : pagado;

      const venta = await api(token, 'POST', '/sales', {
        type: tipo,
        customer_id: cliente?.id ?? null,
        details,
        payments,
        efectivo_recibido: metodo === 'efectivo' ? pesos(recibido) : undefined,
        total_esperado: pesos(total),
      });
      conteo.ventas++;
      if (tipo !== 'contado') pendientes.push({ id: venta.id, cliente, pendiente: total - pagado });
    }

    async function abonar(token, deuda) {
      let monto = deuda.pendiente <= 15000 || azar() < 0.3
        ? deuda.pendiente
        : Math.round((deuda.pendiente * entre(30, 60)) / 100 / 1000) * 1000;
      if (monto <= 0) monto = deuda.pendiente;
      await api(token, 'POST', '/apartados/abono', {
        sale_id: deuda.id,
        customer_id: deuda.cliente.id,
        amount: pesos(monto),
        pagos: [{ method: azar() < 0.8 ? 'efectivo' : 'transferencia', amount: pesos(monto) }],
      });
      deuda.pendiente -= monto;
      conteo.abonos++;
    }

    for (let dia = 0; dia < DIAS; dia++) {
      if (dia === 7) {
        a(dia, 7, 30);
        await surtir(25, 45, 'Resurtido semanal');
      }

      // Momentos del día (entre 8:00 y 20:59), en orden
      const eventos = [];
      for (let n = entre(7, 12); n > 0; n--) eventos.push({ tipo: 'contado' });
      if (azar() < 0.6) eventos.push({ tipo: 'apartado' });
      if (azar() < 0.5) eventos.push({ tipo: 'credito' });
      for (const deuda of pendientes) {
        if (deuda.pendiente > 0 && azar() < 0.3) eventos.push({ tipo: 'abono', deuda });
      }
      for (const e of eventos) e.minuto = entre(8 * 60, 20 * 60 + 59);
      eventos.sort((x, y) => x.minuto - y.minuto);

      for (const e of eventos) {
        const instante = instanteNegocio(fechaDe(dia), e.minuto);
        if (instante.getTime() > ahora) break; // hoy: solo lo que ya pasó
        fijarReloj(instante);
        const token = e.minuto < 14 * 60 ? tokens.maria : tokens.demo; // turno de la mañana y de la tarde

        if (e.tipo === 'abono') {
          await abonar(token, e.deuda);
        } else {
          const cliente = e.tipo === 'contado'
            ? (azar() < 0.25 ? elegir(CLIENTES) : null)
            : elegir(e.tipo === 'credito' ? CLIENTES.slice(0, 6) : CLIENTES);
          await vender(token, e.tipo, cliente);
        }
      }

      // Corte Z al cerrar cada día pasado (el de hoy queda para probarlo en la demo)
      if (dia < DIAS - 1) {
        a(dia, 21, 15);
        await api(tokens.luis, 'POST', '/cuts', { type: 'Z', cash_register: '1' });
        conteo.cortes++;
      }
    }
  } finally {
    fijarReloj(null);
    await new Promise((resolve) => servidor.close(resolve));
  }

  await verificar();
  console.log(
    `🧪 Demo sembrada en ${((Date.now() - inicio) / 1000).toFixed(1)} s: ${PRODUCTOS.length} productos, ` +
    `${CLIENTES.length} clientes, ${conteo.ventas} ventas, ${conteo.abonos} abonos, ${conteo.cortes} cortes Z`
  );
}

module.exports = { sembrar, CLAVE_DEMO };
