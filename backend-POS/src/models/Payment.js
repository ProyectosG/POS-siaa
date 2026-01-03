const db = require('../config/database');

class Payment {
  static create({
    sale_id,
    method,
    amount,
    bank,
    last4,
    reference,
    date
  }) {
    if (!method) {
      throw new Error('payment.method es obligatorio');
    }

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payments (
          sale_id,
          method,
          amount,
          bank,
          last4,
          reference,
          date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sale_id,
          method,              // 👈 CRÍTICO
          amount,
          bank ?? null,
          last4 ?? null,
          reference ?? null,
          date
        ],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findBySaleId(sale_id) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM payments WHERE sale_id = ?`,
        [sale_id],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
  }
}

module.exports = Payment;
