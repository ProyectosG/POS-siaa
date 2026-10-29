const { prisma } = require('../config/prisma');
const { filaAPesos, filasAPesos } = require('../utils/dinero');

class Cut {
  // Va DENTRO de una transacción; los montos ya vienen en centavos (los calcula el servidor)
  static async crear(tx, data) {
    const { lastID } = await tx.run(
      `
      INSERT INTO cuts (
        type, date, desde, hasta, cash_register, user_nickname,
        total_sales, ventas_contado, ventas_credito, ventas_apartado, total_iva_gravado,
        total_recibido, total_anticipos, total_abonos,
        pago_efectivo, pago_tarjeta, pago_transferencia, pago_otros,
        cash_in_box, first_ticket, last_ticket, last_payment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.type, data.date, data.desde, data.hasta, data.cash_register, data.user_nickname,
        data.total_sales, data.ventas_contado, data.ventas_credito, data.ventas_apartado, data.total_iva_gravado,
        data.total_recibido, data.total_anticipos, data.total_abonos,
        data.pago_efectivo, data.pago_tarjeta, data.pago_transferencia, data.pago_otros,
        data.cash_in_box, data.first_ticket, data.last_ticket, data.last_payment_id,
      ]
    );
    return lastID;
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
