// src/models/Kardex.js
// Los movimientos se registran SOLO dentro de una transacción (ventas,
// entradas, salidas y altas de producto), junto con el cambio de stock; la
// consulta es con Prisma.
const { prisma } = require('../config/prisma');

class Kardex {
  // tx: la transacción de config/transaccion.js. Sin ella no se registra: un
  // movimiento suelto dejaría el kardex sin cuadrar con el stock.
  static async logMovement({
    product_id,
    id_user,
    nickname_user,
    movement_type,
    movement_reason,
    previous_stock,
    moved_quantity,
    new_stock,
    date,
    time,
    related_folio
  }, tx) {
    if (!tx) throw new Error('El kardex solo se registra dentro de una transacción');

    const { lastID } = await tx.run(
      `INSERT INTO kardex
       (
        product_id,
        id_user,
        nickname_user,
        movement_type,
        movement_reason,
        previous_stock,
        moved_quantity,
        new_stock,
        date,
        time,
        related_folio
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        id_user,
        nickname_user,
        movement_type,
        movement_reason || null,
        previous_stock,
        moved_quantity,
        new_stock,
        date,
        time,
        related_folio || null
      ]
    );
    return lastID;
  }

  // En orden cronológico (id desempata los del mismo segundo)
  static findByProductId(product_id) {
    return prisma.kardex.findMany({
      where: { product_id },
      orderBy: [{ date: 'asc' }, { time: 'asc' }, { id: 'asc' }],
    });
  }
}

module.exports = Kardex;
