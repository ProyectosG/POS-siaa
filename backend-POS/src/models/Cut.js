const db = require('../config/database');
const { filaAPesos, filasAPesos } = require('../utils/dinero');

class Cut {
  // Va DENTRO de una transacción; los montos ya vienen en centavos (los calcula el servidor)
  static async crear(tx, data) {
    const { lastID } = await tx.run(
      `
      INSERT INTO cuts (
        type, date, desde, hasta, cash_register, user_nickname,
        total_sales, ventas_contado, ventas_credito, ventas_apartado, total_iva_gravado,
        total_recibido, total_anticipos, total_abonos,
        pago_efectivo, pago_tarjeta, pago_transferencia, pago_otros,
        cash_in_box, first_ticket, last_ticket, last_payment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.type, data.date, data.desde, data.hasta, data.cash_register, data.user_nickname,
        data.total_sales, data.ventas_contado, data.ventas_credito, data.ventas_apartado, data.total_iva_gravado,
        data.total_recibido, data.total_anticipos, data.total_abonos,
        data.pago_efectivo, data.pago_tarjeta, data.pago_transferencia, data.pago_otros,
        data.cash_in_box, data.first_ticket, data.last_ticket, data.last_payment_id,
      ]
    );
    return lastID;
  }

  // En pesos, para responder al API
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
          resolve(filaAPesos(row, 'cuts'));
        }
      );
    });
  }

  // Método para listar TODOS los cortes con filtros opcionales
  static findAll(filters = {}) {
    let query = 'SELECT * FROM cuts';
    const whereClauses = [];
    const params = [];

    if (filters.type) {
      whereClauses.push('type = ?');
      params.push(filters.type);
    }
    if (filters.fromDate) {
      whereClauses.push('date >= ?');
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      whereClauses.push('date <= ?');
      params.push(filters.toDate);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY date DESC, id DESC';

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('❌ Error en Cut.findAll:', err.message);
          return reject(err);
        }
        resolve(filasAPesos(rows, 'cuts'));
      });
    });
  }

  // Método para obtener un corte por ID
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM cuts WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('❌ Error en Cut.findById:', err.message);
          return reject(err);
        }
        resolve(filaAPesos(row, 'cuts'));
      });
    });
  }
}

module.exports = Cut;
