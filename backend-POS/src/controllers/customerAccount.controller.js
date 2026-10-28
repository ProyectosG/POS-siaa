const db = require('../config/database');
const { aPesos, filasAPesos } = require('../utils/dinero');

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
          if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

          res.json({
            current_balance: aPesos(customer.current_balance),
            movements: filasAPesos(rows, 'customer_balance_history')
          });
        }
      );
    }
  );
};
