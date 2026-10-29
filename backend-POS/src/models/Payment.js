// src/models/Payment.js
const { prisma } = require('../config/prisma');
const { filasAPesos } = require('../utils/dinero');

// Formas de pago aceptadas
const METODOS = ['efectivo', 'tarjeta', 'transferencia'];

class Payment {
  // Va DENTRO de una transacción (tx de Prisma); amount en centavos y date del servidor
  static async crear(tx, { sale_id, method, amount, payment_type = 'normal', bank, last4, reference, date }) {
    const pago = await tx.payments.create({
      data: {
        sale_id,
        method,
        amount,
        payment_type,
        bank: bank == null ? null : String(bank),
        last4: last4 == null ? null : String(last4),
        reference: reference == null ? null : String(reference),
        date,
      },
      select: { id: true },
    });
    return pago.id;
  }


  // En pesos, para responder al API
  static async findBySaleId(sale_id) {
    return filasAPesos(await prisma.payments.findMany({ where: { sale_id }, orderBy: { id: 'asc' } }), 'payments');
  }
}

Payment.METODOS = METODOS;

module.exports = Payment;
