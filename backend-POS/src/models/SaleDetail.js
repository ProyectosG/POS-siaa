const db = require('../config/database');

class SaleDetail {
  static create({
    sale_id,
    product_id,
    quantity,
    price,
    subtotal,
    base_price,
    discount_pct,
    discount_amount
  }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sale_details (
          sale_id,
          product_id,
          quantity,
          price,
          subtotal,
          base_price,
          discount_pct,
          discount_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale_id,
          product_id,
          quantity,
          price,
          subtotal,
          base_price,
          discount_pct,
          discount_amount
        ],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static createMany(details) {
    return Promise.all(details.map(d => this.create(d)));
  }
}


module.exports = SaleDetail;