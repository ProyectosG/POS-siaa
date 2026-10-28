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

  // models/CashRegister.js
 static findByNumeroCaja(numero_caja) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM cash_registers WHERE numero_caja = ? LIMIT 1`,
      [numero_caja],
      (err, row) => {
        if (err) reject(err);
        resolve(row); // puede ser undefined si no existe
      }
    );
  });
}




  // password llega ya con hash; si no viene, la clave no cambia
  static update(id, { numero_caja, tipo_caja, password }) {
    const sql = password
      ? `UPDATE cash_registers SET numero_caja = ?, tipo_caja = ?, password = ? WHERE id = ?`
      : `UPDATE cash_registers SET numero_caja = ?, tipo_caja = ? WHERE id = ?`;
    const params = password
      ? [numero_caja, tipo_caja, password, id]
      : [numero_caja, tipo_caja, id];

    return new Promise((resolve, reject) => {
      db.run(
        sql,
        params,
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