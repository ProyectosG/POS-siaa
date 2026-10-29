// src/models/Payment.js
const { prisma } = require('../config/prisma');
const { filasAPesos } = require('../utils/dinero');

// Formas de pago aceptadas
const METODOS = ['efectivo', 'tarjeta', 'transferencia'];

class Payment {
  // Va DENTRO de una transacción; amount en centavos y date del servidor
  static async crear(tx, { sale_id, method, amount, payment_type = 'normal', bank, last4, reference, date }) {
    const { lastID } = await tx.run(
      `INSERT INTO payments (sale_id, method, amount, payment_type, bank, last4, reference, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sale_id, method, amount, payment_type, bank ?? null, last4 ?? null, reference ?? null, date]
    );
    return lastID;
  }

  // En pesos, para responder al API
  static async findBySaleId(sale_id) {
    return filasAPesos(await prisma.payments.findMany({ where: { sale_id }, orderBy: { id: 'asc' } }), 'payments');
  }
}

Payment.METODOS = METODOS;

module.exports = Payment;
