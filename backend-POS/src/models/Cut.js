const db = require('../config/database');

class Cut {
  static create({ type, date, total_sales, cash_in_box }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO cuts (type, date, total_sales, cash_in_box) VALUES (?, ?, ?, ?)`,
        [type, date, total_sales, cash_in_box],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findLast() {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM cuts ORDER BY id DESC LIMIT 1`, [], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }
}

module.exports = Cut;