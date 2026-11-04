// src/utils/cortes.js
// Cálculo del corte de UNA caja, en CENTAVOS. Los ids de una caja no son
// consecutivos (hay ventas de otras cajas en medio): toda cuenta filtra por caja,
// nunca por un rango de ids sin el filtro.

// Columnas de dinero que guarda un corte (las que suma un corte general)
const COLUMNAS_CORTE = [
  'total_sales', 'ventas_contado', 'ventas_credito', 'ventas_apartado', 'total_iva_gravado',
  'total_recibido', 'total_anticipos', 'total_abonos',
  'pago_efectivo', 'pago_tarjeta', 'pago_transferencia', 'pago_otros', 'cash_in_box',
];

const METODOS_CON_COLUMNA = ['efectivo', 'tarjeta', 'transferencia'];

// Suma ventas y pagos de una caja en un rango (desde sin incluir, hasta incluido).
// c es el cliente de Prisma o el tx de una transacción.
async function sumarRango(c, caja, { ticketDesde, ticketHasta, pagoDesde, pagoHasta }) {
  const enVentas = { caja, id: { gt: ticketDesde, lte: ticketHasta } };
  const totales = await c.sales.aggregate({
    where: enVentas,
    _count: { _all: true },
    _sum: { total: true, tax_total: true },
  });
  const porTipo = await c.sales.groupBy({ by: ['type'], where: enVentas, _sum: { total: true } });
  const totalDeTipo = (t) => porTipo.find((r) => r.type === t)?._sum.total ?? 0;

  const enPagos = { caja, id: { gt: pagoDesde, lte: pagoHasta } };
  const porTipoPago = await c.payments.groupBy({ by: ['payment_type'], where: enPagos, _sum: { amount: true } });
  const cobradoDe = (t) => porTipoPago.find((r) => r.payment_type === t)?._sum.amount ?? 0;
  const porMetodo = await c.payments.groupBy({ by: ['method'], where: enPagos, _sum: { amount: true } });

  const total_anticipos = cobradoDe('anticipo');
  const total_abonos = cobradoDe('abono');

  return {
    ventas: {
      total_ventas: totales._count._all,
      total_ventas_monto: totales._sum.total ?? 0,
      ventas_contado: totalDeTipo('contado'),
      ventas_credito: totalDeTipo('credito'),
      ventas_apartado: totalDeTipo('apartado'),
      total_iva_gravado: totales._sum.tax_total ?? 0,
    },
    pagos: Object.fromEntries(porMetodo.map((r) => [r.method, r._sum.amount ?? 0])),
    total_anticipos,
    total_abonos,
    total_recibido: total_anticipos + total_abonos + cobradoDe('normal'),
  };
}

// Las columnas del corte, a partir de lo que devuelve sumarRango
function columnasDeCorte({ ventas, pagos, total_recibido, total_anticipos, total_abonos }) {
  const otros = Object.entries(pagos)
    .filter(([m]) => !METODOS_CON_COLUMNA.includes(m))
    .reduce((suma, [, v]) => suma + v, 0);
  return {
    total_sales: ventas.total_ventas_monto,
    ventas_contado: ventas.ventas_contado,
    ventas_credito: ventas.ventas_credito,
    ventas_apartado: ventas.ventas_apartado,
    total_iva_gravado: ventas.total_iva_gravado,
    total_recibido,
    total_anticipos,
    total_abonos,
    pago_efectivo: pagos.efectivo || 0,
    pago_tarjeta: pagos.tarjeta || 0,
    pago_transferencia: pagos.transferencia || 0,
    pago_otros: otros,
    cash_in_box: pagos.efectivo || 0,
  };
}

// Corte de referencia de una caja: X parte de su último X o Z; Z, de su último Z.
// Filtra por caja y tipo, así que un general (XG, ZG, sin caja) nunca cuenta.
// antesDe: solo los anteriores a ese id (para revisar un corte ya guardado).
function corteAnterior(c, tipo, caja, antesDe) {
  return c.cuts.findFirst({
    where: {
      cash_register: caja,
      type: tipo === 'Z' ? 'Z' : { in: ['X', 'Z'] },
      ...(antesDe ? { id: { lt: antesDe } } : {}),
    },
    orderBy: { id: 'desc' },
  });
}

/**
 * Corte en curso de una caja. Ventas y cobros llevan cada uno su rango: un abono de
 * hoy a una venta vieja entra por su pago, en la caja que lo cobró.
 */
async function calcularCorte(c, tipo, caja) {
  const ultimo = await corteAnterior(c, tipo, caja);
  const ultimoTicket = ultimo?.last_ticket ?? 0;
  const ultimoPago = ultimo?.last_payment_id ?? 0;

  const tickets = await c.sales.aggregate({
    where: { caja, id: { gt: ultimoTicket } },
    _min: { id: true },
    _max: { id: true },
  });
  const cobros = await c.payments.aggregate({ where: { caja, id: { gt: ultimoPago } }, _max: { id: true } });

  const hayVentas = tickets._max.id != null;
  const hayCobros = cobros._max.id != null;
  if (!hayVentas && !hayCobros) return { ultimo, vacio: true };

  // Sin ventas nuevas se conserva hasta dónde se cubrió (el siguiente no repite tickets)
  const hasta = hayVentas ? tickets._max.id : ultimoTicket;
  const hastaPago = hayCobros ? cobros._max.id : ultimoPago;
  const sumas = await sumarRango(c, caja, {
    ticketDesde: ultimoTicket, ticketHasta: hasta, pagoDesde: ultimoPago, pagoHasta: hastaPago,
  });

  return {
    ultimo,
    vacio: false,
    hayVentas,
    desde: hayVentas ? tickets._min.id : null, // primer folio de ESTA caja
    hasta,
    ultimoPago: hastaPago,
    ...sumas,
  };
}

module.exports = { COLUMNAS_CORTE, sumarRango, columnasDeCorte, corteAnterior, calcularCorte };
