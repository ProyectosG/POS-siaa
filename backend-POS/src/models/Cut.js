const db = require('../config/database');

class Cut {
  static create(data) {
    const {
      type,
      date,
      desde,
      hasta,
      cash_register,
      user_nickname,

      total_sales,
      ventas_contado,
      ventas_credito,
      ventas_apartado,
      total_iva_gravado,

      total_recibido,
      total_anticipos,
      total_abonos,

      pago_efectivo,
      pago_tarjeta,
      pago_transferencia,
      pago_otros,

      cash_in_box,

      first_ticket,
      last_ticket
    } = data;

    return new Promise((resolve, reject) => {
      db.run(
        `
        INSERT INTO cuts (
          type,
          date,
          desde,
          hasta,
          cash_register,
          user_nickname,

          total_sales,
          ventas_contado,
          ventas_credito,
          ventas_apartado,
          total_iva_gravado,

          total_recibido,
          total_anticipos,
          total_abonos,

          pago_efectivo,
          pago_tarjeta,
          pago_transferencia,
          pago_otros,

          cash_in_box,
          first_ticket,
          last_ticket
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          type,
          date,
          desde,
          hasta,
          cash_register,
          user_nickname,

          total_sales,
          ventas_contado,
          ventas_credito,
          ventas_apartado,
          total_iva_gravado,

          total_recibido,
          total_anticipos,
          total_abonos,

          pago_efectivo,
          pago_tarjeta,
          pago_transferencia,
          pago_otros,

          cash_in_box,
          first_ticket,
          last_ticket
        ],
        function (err) {
          if (err) {
            console.error('❌ Error al insertar corte:', err.message);
            return reject(err);
          }
          resolve(this.lastID);
        }
      );
    });
  }

  static findLast() {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM cuts ORDER BY id DESC LIMIT 1`,
        [],
        (err, row) => {
          if (err) {
            console.error('❌ Error al obtener último corte:', err.message);
            return reject(err);
          }
          resolve(row);
        }
      );
    });
  }
}

module.exports = Cut;
