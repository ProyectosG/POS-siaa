const db = require('../config/database');

class Customer {
  static create(data) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO customers 
         (first_name, last_name_paternal, last_name_maternal, phone, email, address, rfc, postal_code, city, current_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          data.current_balance || 0
        ],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM customers`, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM customers WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }

  static update(id, data) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = Object.values(data);
      values.push(id);

      db.run(`UPDATE customers SET ${fields} WHERE id = ?`, values, err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  // Método para actualizar saldo + registrar historia
  static updateBalance(id, amount, saleId, description) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT current_balance FROM customers WHERE id = ?`, [id], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(new Error('Cliente no encontrado'));

        const previousBalance = row.current_balance;
        const newBalance = previousBalance + amount;  // amount positivo para incremento

        db.run(`UPDATE customers SET current_balance = ? WHERE id = ?`, [newBalance, id], err => {
          if (err) return reject(err);

          const now = new Date();
          const date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
          const time = now.toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

          db.run(
            `INSERT INTO customer_balance_history 
             (customer_id, date, time, sale_id, previous_balance, amount, new_balance, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, date, time, saleId, previousBalance, amount, newBalance, description],
            err => {
              if (err) return reject(err);
              resolve(newBalance);
            }
          );
        });
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM customers WHERE id = ?`, [id], err => {
        if (err) reject(err);
        resolve();
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
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = Customer;