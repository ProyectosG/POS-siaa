const db = require('../config/database');

class Sale {
  static create({ date, type, customer_id, total, paid, pending_balance, status }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sales (date, type, customer_id, total, paid, pending_balance, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [date, type, customer_id, total, paid, pending_balance || 0, status || 'pending'],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM sales WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }
}

module.exports = Sale;