const db = require('../config/database');
const { filaAPesos, filasAPesos } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');

// Campos que se pueden modificar con update()
const CAMPOS_EDITABLES = [
  'first_name', 'last_name_paternal', 'last_name_maternal',
  'phone', 'email', 'address', 'rfc', 'postal_code', 'city',
];

class Customer {
  // Un cliente nuevo empieza sin saldo: el saldo solo cambia con moverSaldo
  static create(data) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO customers
         (first_name, last_name_paternal, last_name_maternal, phone, email, address, rfc, postal_code, city, current_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          data.first_name || null,
          data.last_name_paternal || null,
          data.last_name_maternal || null,
          data.phone || null,
          data.email || null,
          data.address || null,
          data.rfc || null,
          data.postal_code || null,
          data.city || null,
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM customers`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(filasAPesos(rows, 'customers'));
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM customers WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(filaAPesos(row, 'customers'));
      });
    });
  }

  // Solo campos de la lista fija; lo demás (incluido current_balance) se ignora.
  // El saldo solo cambia con moverSaldo, que deja historial.
  static update(id, data) {
    return new Promise((resolve, reject) => {
      const campos = CAMPOS_EDITABLES.filter(key => data[key] !== undefined);
      if (campos.length === 0) return resolve();

      const fields = campos.map(key => `${key} = ?`).join(', ');
      const values = campos.map(key => data[key]);
      values.push(id);

      db.run(`UPDATE customers SET ${fields} WHERE id = ?`, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Mueve el saldo (lo que el cliente debe) y deja historial. Va DENTRO de una
  // transacción (tx de config/transaccion.js). centavos > 0 aumenta la deuda,
  // < 0 la reduce. Devuelve el saldo nuevo en centavos.
  static async moverSaldo(tx, id, centavos, saleId, description) {
    const row = await tx.get(`SELECT current_balance FROM customers WHERE id = ?`, [id]);
    if (!row) throw new Error('Cliente no encontrado');

    const previousBalance = Math.round(row.current_balance || 0);
    const newBalance = previousBalance + centavos;
    const { date, time } = ahoraNegocio();

    await tx.run(`UPDATE customers SET current_balance = ? WHERE id = ?`, [newBalance, id]);
    await tx.run(
      `INSERT INTO customer_balance_history
       (customer_id, date, time, sale_id, previous_balance, amount, new_balance, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, date, time, saleId, previousBalance, centavos, newBalance, description]
    );
    return newBalance;
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM customers WHERE id = ?`, [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static search(q) {
    return new Promise((resolve, reject) => {
      const like = `%${q}%`;
      db.all(
        `
        SELECT
          id,
          first_name,
          last_name_paternal,
          last_name_maternal,
          phone,
          current_balance
        FROM customers
        WHERE
          first_name LIKE ?
          OR last_name_paternal LIKE ?
          OR last_name_maternal LIKE ?
          OR phone LIKE ?
        LIMIT 20
        `,
        [like, like, like, like],
        (err, rows) => {
          if (err) reject(err);
          else resolve(filasAPesos(rows, 'customers'));
        }
      );
    });
  }
}

module.exports = Customer;
