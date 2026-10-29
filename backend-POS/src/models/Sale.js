const { prisma } = require('../config/prisma');
const { filaAPesos, filasAPesos } = require('../utils/dinero');

class Sale {
  // Va DENTRO de una transacción; los montos ya vienen en centavos
  static async crear(tx, data) {
    const { lastID } = await tx.run(
      `INSERT INTO sales
       (date, time, type, movement_reason, customer_id, subtotal, tax_total, discount_total, total, paid, efectivo_recibido, cambio, pending_balance, status, id_user, nickname_user)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.date,
        data.time,
        data.type,
        data.movement_reason,
        data.customer_id,
        data.subtotal,
        data.tax_total,
        data.discount_total,
        data.total,
        data.paid,
        data.efectivo_recibido,
        data.cambio,
        data.pending_balance,
        data.status,
        data.id_user,
        data.nickname_user,
      ]
    );
    return lastID;
  }

  // Las lecturas son con Prisma y en pesos, para responder al API

  static async findById(id) {
    return filaAPesos(await prisma.sales.findUnique({ where: { id } }), 'sales');
  }

  static async findAll() {
    return filasAPesos(await prisma.sales.findMany({ orderBy: [{ date: 'desc' }, { id: 'desc' }] }), 'sales');
  }

  // Primer y último ticket entre dos fechas (AAAA-MM-DD)
  static async rangoTickets(desde, hasta) {
    const r = await prisma.sales.aggregate({
      where: { date: { gte: desde, lte: hasta } },
      _min: { id: true },
      _max: { id: true },
    });
    return { firstTicket: r._min.id ?? null, lastTicket: r._max.id ?? null };
  }

  // Renglones de una venta. articulo: el nombre que tenía el producto al
  // venderse (guardado en el renglón); si un renglón viejo no lo tiene, el del
  // catálogo
  static async renglones(sale_id) {
    const filas = await prisma.sale_details.findMany({
      where: { sale_id },
      include: { products: { select: { articulo: true } } },
      orderBy: { id: 'asc' },
    });
    return filasAPesos(
      filas.map(({ products, ...d }) => ({ ...d, articulo: d.articulo || products?.articulo || null })),
      'sale_details'
    );
  }
}

module.exports = Sale;
