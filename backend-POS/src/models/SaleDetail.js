// models/SaleDetail.js

class SaleDetail {
  // Va DENTRO de una transacción; los montos ya vienen en centavos
  static async crear(tx, d) {
    const { lastID } = await tx.run(
      `INSERT INTO sale_details
       (sale_id, product_id, articulo, quantity, base_price, price, discount_pct, discount_amount, subtotal, tax_rate, tax_amount, tax_type, precio_libre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.sale_id,
        d.product_id,
        d.articulo || null,
        d.quantity,
        d.base_price,
        d.price,
        d.discount_pct,
        d.discount_amount,
        d.subtotal,
        d.tax_rate,
        d.tax_amount,
        d.tax_type,
        d.precio_libre ? 1 : 0,
      ]
    );
    return lastID;
  }
}

module.exports = SaleDetail;
