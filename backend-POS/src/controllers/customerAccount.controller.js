const db = require('../config/database');

exports.getEstadoCuenta = (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT
      date,
      time,
      sale_id,
      previous_balance,
      amount,
      new_balance,
      description
    FROM customer_balance_history
    WHERE customer_id = ?
    ORDER BY id DESC
    `,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        `SELECT current_balance FROM customers WHERE id = ?`,
        [id],
        (err2, customer) => {
          if (err2) return res.status(500).json({ error: err2.message });

          res.json({
            current_balance: customer.current_balance,
            movements: rows
          });
        }
      );
    }
  );
};
