const db = require('../config/database');
const { filaAPesos } = require('../utils/dinero');

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

  // En pesos, para responder al API
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM sales WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(filaAPesos(row, 'sales'));
        }
      );
    });
  }
}

module.exports = Sale;
