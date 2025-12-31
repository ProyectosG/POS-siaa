const db = require('../config/database');

class CashRegister {
  static create({ numero_caja, tipo_caja = 'Normal', password }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO cash_registers (numero_caja, tipo_caja, password) VALUES (?, ?, ?)`,
        [numero_caja, tipo_caja, password],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM cash_registers`, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM cash_registers WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }

  static update(id, { numero_caja, tipo_caja }) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE cash_registers SET numero_caja = ?, tipo_caja = ? WHERE id = ?`,
        [numero_caja, tipo_caja, id],
        err => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM cash_registers WHERE id = ?`, [id], err => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = CashRegister;