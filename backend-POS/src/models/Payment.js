// src/models/Payment.js
const db = require('../config/database');

class Payment {
  static create({
    sale_id,
    method,
    amount,
    payment_type = 'normal',
    bank,
    last4,
    reference,
    date
  }) {
    if (!method) {
      throw new Error('payment.method es obligatorio');
    }

    // FORZAR formato YYYY-MM-DD (elimina / o cualquier cosa rara)
    let safeDate = (date || new Date().toISOString().split('T')[0])
      .replace(/\//g, '-')        // Cambia / por -
      .replace(/[^0-9-]/g, '');   // Elimina cualquier carácter inválido

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payments (
          sale_id,
          method,
          amount,
          payment_type,
          bank,
          last4,
          reference,
          date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale_id,
          method,
          amount,
          payment_type,
          bank ?? null,
          last4 ?? null,
          reference ?? null,
          safeDate   // ← Fecha segura
        ],
        function (err) {
          if (err) {
            console.error('❌ Error al insertar pago:', err.message);
            console.error('Valor de date que se intentó insertar:', safeDate);
            return reject(err);
          }
          resolve(this.lastID);
        }
      );
    });
  }

  static findBySaleId(sale_id) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM payments WHERE sale_id = ?`,
        [sale_id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = Payment;