const db = require('../config/database');

class Kardex {
  static logMovement({ product_id, movement_type, previous_stock, moved_quantity, new_stock, date, time, related_folio }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO kardex (product_id, movement_type, previous_stock, moved_quantity, new_stock, date, time, related_folio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [product_id, movement_type, previous_stock, moved_quantity, new_stock, date, time, related_folio || null],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findByProductId(product_id) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM kardex WHERE product_id = ? ORDER BY date DESC, time DESC`, [product_id], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }
}

module.exports = Kardex;