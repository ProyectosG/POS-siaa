const db = require('../config/database');

class Customer {
  static create({ 
    first_name, 
    last_name_paternal, 
    last_name_maternal, 
    phone, 
    email, 
    address, 
    rfc, 
    postal_code, 
    city, 
    saldo = 0 
  }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO customers 
         (first_name, last_name_paternal, last_name_maternal, phone, email, address, rfc, postal_code, city, current_balance) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [first_name, last_name_paternal, last_name_maternal, phone, email, address, rfc || null, postal_code || null, city || null, saldo],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
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

  static updateBalance(id, newBalance) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE customers SET current_balance = ? WHERE id = ?`, [newBalance, id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = Customer;