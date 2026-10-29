const { prisma } = require('../config/prisma');
const { filaAPesos, filasAPesos } = require('../utils/dinero');

class Cut {
  // Va DENTRO de una transacción (tx de Prisma); los montos ya vienen en
  // centavos (los calcula el servidor)
  static async crear(tx, data) {
    const corte = await tx.cuts.create({
      data: {
        type: data.type,
        date: data.date,
        desde: data.desde,
        hasta: data.hasta,
        cash_register: data.cash_register == null ? null : String(data.cash_register),
        user_nickname: data.user_nickname ?? null,
        total_sales: data.total_sales,
        ventas_contado: data.ventas_contado,
        ventas_credito: data.ventas_credito,
        ventas_apartado: data.ventas_apartado,
        total_iva_gravado: data.total_iva_gravado,
        total_recibido: data.total_recibido,
        total_anticipos: data.total_anticipos,
        total_abonos: data.total_abonos,
        pago_efectivo: data.pago_efectivo,
        pago_tarjeta: data.pago_tarjeta,
        pago_transferencia: data.pago_transferencia,
        pago_otros: data.pago_otros,
        cash_in_box: data.cash_in_box,
        first_ticket: data.first_ticket ?? null,
        last_ticket: data.last_ticket ?? null,
        last_payment_id: data.last_payment_id ?? null,
      },
      select: { id: true },
    });
    return corte.id;
  }


  // En pesos, para responder al API
  // Lista con filtros opcionales: type, fromDate y toDate (AAAA-MM-DD)
  static async findAll(filters = {}) {
    const where = {};
    if (filters.type) where.type = String(filters.type);
    if (filters.fromDate || filters.toDate) {
      where.date = {};
      if (filters.fromDate) where.date.gte = String(filters.fromDate);
      if (filters.toDate) where.date.lte = String(filters.toDate);
    }
    const filas = await prisma.cuts.findMany({ where, orderBy: [{ date: 'desc' }, { id: 'desc' }] });
    return filasAPesos(filas, 'cuts');
  }

  static async findById(id) {
    return filaAPesos(await prisma.cuts.findUnique({ where: { id } }), 'cuts');
  }
}

module.exports = Cut;
