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

  static updateBalance(id, newBalance) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE customers SET current_balance = ? WHERE id = ?`, [newBalance, id], err => {
        if (err) reject(err);
        resolve();
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
}

module.exports = Customer;