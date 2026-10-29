const { prisma } = require('../config/prisma');
const { filaAPesos, filasAPesos } = require('../utils/dinero');

class Sale {
  // Va DENTRO de una transacción (tx de Prisma); los montos ya vienen en centavos
  static async crear(tx, data) {
    const venta = await tx.sales.create({
      data: {
        date: data.date,
        time: data.time,
        type: data.type,
        movement_reason: data.movement_reason,
        customer_id: data.customer_id ?? null,
        subtotal: data.subtotal,
        tax_total: data.tax_total,
        discount_total: data.discount_total,
        total: data.total,
        paid: data.paid,
        efectivo_recibido: data.efectivo_recibido,
        cambio: data.cambio,
        pending_balance: data.pending_balance,
        status: data.status,
        id_user: data.id_user,
        nickname_user: data.nickname_user,
      },
      select: { id: true },
    });
    return venta.id;
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
