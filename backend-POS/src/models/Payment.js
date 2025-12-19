const db = require('../config/database');

class Payment {
  static create({ sale_id, amount, date }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payments (sale_id, amount, date) VALUES (?, ?, ?)`,
        [sale_id, amount, date],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findBySaleId(sale_id) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM payments WHERE sale_id = ?`, [sale_id], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }
}

module.exports = Payment;