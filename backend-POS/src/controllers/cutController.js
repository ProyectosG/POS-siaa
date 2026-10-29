const { prisma } = require('../config/prisma');
const Cut = require('../models/Cut');
const { enTransaccion, ErrorNegocio } = require('../config/transaccion');
const { aPesos, camposAPesos, filaAPesos } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');
const { responderError } = require('../utils/idempotencia');
const { leerId } = require('../utils/peticion');

const CAMPOS_VENTAS = ['total_ventas_monto', 'ventas_contado', 'ventas_credito', 'ventas_apartado', 'total_iva_gravado'];

/**
 * Calcula un corte en CENTAVOS. El X va desde el último corte (X o Z); el Z desde
 * el último Z.
 *
 * Ventas y cobros llevan cada uno su rango:
 * - Ventas: los tickets después del último que cubrió el corte anterior.
 * - Cobros: los pagos después del último que cubrió el corte anterior, sin importar
 *   de qué venta son. Así un abono de hoy a un apartado viejo entra en el corte de hoy.
 */
async function calcularCorte(c, tipo) {
  // c es el cliente de Prisma (GET) o el tx de una transacción (al guardar)
  const ultimo = await c.cuts.findFirst({ where: tipo === 'Z' ? { type: 'Z' } : {}, orderBy: { id: 'desc' } });

  const ultimoTicket = ultimo?.last_ticket ?? 0;
  const ultimoPago = ultimo?.last_payment_id ?? 0;
  const maxTicket = (await c.sales.aggregate({ _max: { id: true } }))._max.id ?? 0;
  const maxPago = (await c.payments.aggregate({ _max: { id: true } }))._max.id ?? 0;

  const hayVentas = maxTicket > ultimoTicket;
  const hayCobros = maxPago > ultimoPago;

  if (!hayVentas && !hayCobros) {
    return { ultimo, vacio: true };
  }

  // Sin ventas nuevas el rango de tickets queda vacío (desde > hasta), pero se conserva
  // hasta dónde se cubrió para que el siguiente corte no repita tickets
  const desde = ultimoTicket + 1;
  const hasta = maxTicket;

  // Ventas del rango: conteo, total, IVA y total por tipo
  const enRangoVentas = { id: { gte: desde, lte: hasta } };
  const totales = await c.sales.aggregate({
    where: enRangoVentas,
    _count: { _all: true },
    _sum: { total: true, tax_total: true },
  });
  const porTipo = await c.sales.groupBy({ by: ['type'], where: enRangoVentas, _sum: { total: true } });
  const totalDeTipo = (t) => porTipo.find((r) => r.type === t)?._sum.total ?? 0;

  const ventas = {
    total_ventas: totales._count._all,
    total_ventas_monto: totales._sum.total ?? 0,
    ventas_contado: totalDeTipo('contado'),
    ventas_credito: totalDeTipo('credito'),
    ventas_apartado: totalDeTipo('apartado'),
    total_iva_gravado: totales._sum.tax_total ?? 0,
  };

  // Cobros del rango: por tipo de pago y por forma de pago
  const enRangoPagos = { id: { gt: ultimoPago, lte: maxPago } };
  const porTipoPago = await c.payments.groupBy({ by: ['payment_type'], where: enRangoPagos, _sum: { amount: true } });
  const cobradoDe = (t) => porTipoPago.find((r) => r.payment_type === t)?._sum.amount ?? 0;
  const porMetodo = await c.payments.groupBy({ by: ['method'], where: enRangoPagos, _sum: { amount: true } });
  const pagos = Object.fromEntries(porMetodo.map((r) => [r.method, r._sum.amount ?? 0]));

  const total_anticipos = cobradoDe('anticipo');
  const total_abonos = cobradoDe('abono');

  return {
    ultimo,
    vacio: false,
    hayVentas,
    desde,
    hasta,
    ultimoPago: maxPago,
    ventas,
    pagos,
    total_anticipos,
    total_abonos,
    total_recibido: total_anticipos + total_abonos + cobradoDe('normal'),
  };
}

// Respuesta del corte en curso (en pesos), igual que antes para el frontend
function respuestaCorte(corte, tipo) {
  const ultimo_corte = filaAPesos(corte.ultimo, 'cuts') || null;

  if (corte.vacio) {
    return {
      ventas: {},
      pagos: {},
      total_recibido: 0,
      total_anticipos: 0,
      total_abonos: 0,
      ticketRange: { first_ticket: null, last_ticket: null },
      ultimo_corte,
      tipo,
    };
  }

  const pagos = Object.fromEntries(Object.entries(corte.pagos).map(([m, v]) => [m, aPesos(v)]));

  return {
    ventas: camposAPesos(corte.ventas, CAMPOS_VENTAS),
    pagos,
    total_anticipos: aPesos(corte.total_anticipos),
    total_abonos: aPesos(corte.total_abonos),
    total_recibido: aPesos(corte.total_recibido),
    ticketRange: corte.hayVentas
      ? { first_ticket: corte.desde, last_ticket: corte.hasta }
      : { first_ticket: null, last_ticket: null },
    // true aunque no haya tickets nuevos, si hubo cobros (abonos a ventas anteriores)
    hay_movimientos: true,
    ultimo_corte,
    tipo,
  };
}

/**
 * GET /api/cuts/current → Corte X actual
 */
exports.getCurrentCorte = async (req, res) => {
  try {
    res.json(respuestaCorte(await calcularCorte(prisma, 'X'), 'X'));
  } catch (err) {
    console.error('❌ Error Corte X:', err);
    res.status(500).json({ error: 'Error al calcular corte X' });
  }
};

/**
 * GET /api/cuts/current-z → Corte Z actual
 */
exports.getCurrentCorteZ = async (req, res) => {
  try {
    res.json(respuestaCorte(await calcularCorte(prisma, 'Z'), 'Z'));
  } catch (err) {
    console.error('❌ Error Corte Z:', err);
    res.status(500).json({ error: 'Error al calcular corte Z' });
  }
};

/**
 * POST /api/cuts → Crear corte X o Z
 * El servidor calcula todos los montos y el rango de tickets en el momento de
 * guardar; del cuerpo solo se toman el tipo y la caja.
 */
exports.createCorte = async (req, res) => {
  const { type, cash_register } = req.body;

  try {
    const resultado = await enTransaccion(async (tx) => {
      const corte = await calcularCorte(tx, type);
      if (corte.vacio) throw new ErrorNegocio(400, 'No hay ventas ni cobros nuevos para este corte');

      const { date } = ahoraNegocio();
      const p = corte.pagos;
      const otros = Object.entries(p)
        .filter(([m]) => !['efectivo', 'tarjeta', 'transferencia'].includes(m))
        .reduce((suma, [, v]) => suma + v, 0);

      const id = await Cut.crear(tx, {
        type,
        date,
        desde: corte.hayVentas ? String(corte.desde) : '-',
        hasta: corte.hayVentas ? String(corte.hasta) : '-',
        cash_register: cash_register || null,
        user_nickname: req.user.nickname, // el usuario del corte sale del token
        total_sales: corte.ventas.total_ventas_monto,
        ventas_contado: corte.ventas.ventas_contado,
        ventas_credito: corte.ventas.ventas_credito,
        ventas_apartado: corte.ventas.ventas_apartado,
        total_iva_gravado: corte.ventas.total_iva_gravado,
        total_recibido: corte.total_recibido,
        total_anticipos: corte.total_anticipos,
        total_abonos: corte.total_abonos,
        pago_efectivo: p.efectivo || 0,
        pago_tarjeta: p.tarjeta || 0,
        pago_transferencia: p.transferencia || 0,
        pago_otros: otros,
        cash_in_box: p.efectivo || 0,
        // Sin ventas nuevas no hay primer ticket, pero last_ticket conserva hasta dónde se cubrió
        first_ticket: corte.hayVentas ? corte.desde : null,
        last_ticket: corte.hasta,
        last_payment_id: corte.ultimoPago,
      });

      return { id, first_ticket: corte.hayVentas ? corte.desde : null, last_ticket: corte.hasta };
    });

    res.status(201).json({
      ...resultado,
      message: type === 'Z' ? '¡Corte Z registrado correctamente!' : 'Corte X registrado correctamente'
    });
  } catch (err) {
    responderError(res, err, 'Error al guardar corte');
  }
};

/**
 * GET /api/cuts → Listar todos los cortes (con filtros opcionales)
 */
exports.getAllCuts = async (req, res) => {
  try {
    const { type, fromDate, toDate } = req.query;
    const cuts = await Cut.findAll({ type, fromDate, toDate });
    res.json(cuts);
  } catch (err) {
    console.error('❌ Error al obtener lista de cortes:', err);
    res.status(500).json({ error: 'Error al obtener los cortes' });
  }
};

/**
 * GET /api/cuts/:id → Obtener un corte específico
 */
exports.getCutById = async (req, res) => {
  try {
    const id = leerId(req);
    const cut = id && (await Cut.findById(id));
    if (!cut) {
      return res.status(404).json({ error: 'Corte no encontrado' });
    }
    res.json(cut);
  } catch (err) {
    console.error('❌ Error al obtener corte específico:', err);
    res.status(500).json({ error: 'Error al obtener el corte' });
  }
};

module.exports = exports;
