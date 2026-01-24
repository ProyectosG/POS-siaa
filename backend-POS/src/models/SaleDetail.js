// models/SaleDetail.js
const db = require('../config/database');

class SaleDetail {
  static create({
    sale_id,
    product_id,
    quantity,
    price,
    subtotal,
    base_price,
    discount_pct = 0,
    discount_amount = 0,
    tax_type = 'EXENTO',
    tax_rate = 0,
    tax_amount = 0,
  }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sale_details (
          sale_id,
          product_id,
          quantity,
          base_price,
          price,
          discount_pct,
          discount_amount,
          subtotal,
          tax_type,
          tax_rate,
          tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale_id,
          product_id,
          quantity,
          base_price || price,
          price,
          discount_pct,
          discount_amount,
          subtotal || (price * quantity),
          tax_type,
          tax_rate,
          tax_amount,
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

static createMany(details) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO sale_details 
       (sale_id, product_id, quantity, base_price, price, discount_pct, discount_amount, subtotal, tax_rate, tax_amount, tax_type, articulo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    details.forEach(d => {
      stmt.run(
        d.sale_id,
        d.product_id,
        d.quantity,
        d.base_price,
        d.price,
        d.discount_pct,
        d.discount_amount,
        d.subtotal,
        d.tax_rate,
        d.tax_amount,
        d.tax_type,
        d.articulo || null   // ← Esto está perfecto
      );
    });

    stmt.finalize(err => {
      if (err) reject(err);
      else resolve();
    });
  });
}
}

module.exports = SaleDetail;