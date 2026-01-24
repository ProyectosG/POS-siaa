const db = require('../config/database');
const Sale = require('../models/Sale');

module.exports = async function buildTicketData(saleId) {
  const sale = await Sale.findById(saleId);
  if (!sale) throw new Error('Venta no encontrada');

  const details = await new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM sale_details WHERE sale_id = ?',
      [saleId],
      (err, rows) => (err ? reject(err) : resolve(rows || []))
    );
  });

  const payments = await new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM payments WHERE sale_id = ?',
      [saleId],
      (err, rows) => (err ? reject(err) : resolve(rows || []))
    );
  });

  let customer = null;
  if (sale.customer_id) {
    customer = await new Promise((resolve) => {
      db.get(
        `
        SELECT
          first_name,
          last_name_paternal,
          last_name_maternal,
          phone
        FROM customers
        WHERE id = ?
        `,
        [sale.customer_id],
        (_, row) => resolve(row || null)
      );
    });
  }

  return {
    sale,
    details,
    payments,
    customer,
  };
};
