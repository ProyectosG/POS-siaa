// src/models/Kardex.js
// Los movimientos se registran SOLO dentro de una transacción (ventas,
// entradas, salidas y altas de producto), junto con el cambio de stock.
const { prisma } = require('../config/prisma');

class Kardex {
  // tx: la transacción de Prisma (config/transaccion.js). Sin ella no se
  // registra: un movimiento suelto dejaría el kardex sin cuadrar con el stock.
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

    const movimiento = await tx.kardex.create({
      data: {
        product_id,
        id_user: id_user ?? null,
        nickname_user: nickname_user ?? null,
        movement_type,
        movement_reason: movement_reason || null,
        previous_stock,
        moved_quantity,
        new_stock,
        date,
        time,
        related_folio: related_folio == null || related_folio === '' ? null : String(related_folio),
      },
      select: { id: true },
    });
    return movimiento.id;
  }

  // Varios movimientos en una sola inserción (mismo orden), dentro de la
  // transacción que cambia el stock
  static async registrarVarios(movimientos, tx) {
    if (!tx) throw new Error('El kardex solo se registra dentro de una transacción');
    if (movimientos.length === 0) return;
    await tx.kardex.createMany({
      data: movimientos.map((m) => ({
        product_id: m.product_id,
        id_user: m.id_user ?? null,
        nickname_user: m.nickname_user ?? null,
        movement_type: m.movement_type,
        movement_reason: m.movement_reason || null,
        previous_stock: m.previous_stock,
        moved_quantity: m.moved_quantity,
        new_stock: m.new_stock,
        date: m.date,
        time: m.time,
        related_folio: m.related_folio == null || m.related_folio === '' ? null : String(m.related_folio),
      })),
    });
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
