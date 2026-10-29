// src/utils/buildTicketData.js
// Datos para imprimir el ticket de una venta (con Prisma, en pesos)
const { prisma } = require('../config/prisma');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');

module.exports = async function buildTicketData(saleId) {
  const id = Number(saleId);
  const sale = Number.isInteger(id) && id > 0 ? await Sale.findById(id) : null;
  if (!sale) throw Object.assign(new Error('Venta no encontrada'), { status: 404 });

  // Renglones con el nombre guardado al vender
  const [details, payments, customer] = await Promise.all([
    Sale.renglones(id),
    Payment.findBySaleId(id),
    sale.customer_id
      ? prisma.customers.findUnique({
          where: { id: sale.customer_id },
          select: { first_name: true, last_name_paternal: true, last_name_maternal: true, phone: true },
        })
      : null,
  ]);

  return { sale, details, payments, customer: customer || null };
};
