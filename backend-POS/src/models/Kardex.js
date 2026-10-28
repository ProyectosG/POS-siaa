const db = require('../config/database');

class Kardex {
  static logMovement({
    product_id,
    id_user,
    nickname_user,
    movement_type,
    movement_reason,
    previous_stock,
    moved_quantity,
    new_stock,
    date,
    time,
    related_folio
  }, tx) {
    // Con tx (config/transaccion.js) el movimiento queda dentro de esa transacción
    const conexion = tx
      ? { run: (sql, params, cb) => tx.run(sql, params).then((r) => cb.call(r, null), (e) => cb(e)) }
      : db;

    return new Promise((resolve, reject) => {
      conexion.run(
        `INSERT INTO kardex
         (
          product_id,
          id_user,
          nickname_user,
          movement_type,
          movement_reason,
          previous_stock,
          moved_quantity,
          new_stock,
          date,
          time,
          related_folio
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product_id,
          id_user,
          nickname_user,
          movement_type,
          movement_reason || null,
          previous_stock,
          moved_quantity,
          new_stock,
          date,
          time,
          related_folio || null
        ],
        function (err) {
          if (err) reject(err)
          else resolve(this.lastID)
        }
      )
    })
  }

  static validateReason(movement_type, movement_reason) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 1
         FROM kardex_reasons
         WHERE code = ?
           AND movement_type = ?
           AND active = 1`,
        [movement_reason, movement_type],
        (err, row) => {
          if (err) reject(err)
          resolve(!!row)
        }
      )
    })
  }

  static findByProductId(product_id) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM kardex
         WHERE product_id = ?
         ORDER BY date ASC, time ASC`,
        [product_id],
        (err, rows) => {
          if (err) reject(err)
          resolve(rows)
        }
      )
    })
  }
}

module.exports = Kardex;
