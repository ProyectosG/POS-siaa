const db = require('../config/database');

class Sale {
static create(data) {
  return new Promise((resolve, reject) => {
    db.run(
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
        data.efectivo_recibido || 0,
        data.cambio || 0,
        data.pending_balance,
        data.status,
        data.id_user,
        data.nickname_user
      ],
      function (err) {
        if (err) reject(err);
        resolve(this.lastID);
      }
    );
  });
}

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM sales WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
}

module.exports = Sale;