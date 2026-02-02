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
          type, date, desde, hasta, cash_register, user_nickname,
          total_sales, ventas_contado, ventas_credito, ventas_apartado, total_iva_gravado,
          total_recibido, total_anticipos, total_abonos,
          pago_efectivo, pago_tarjeta, pago_transferencia, pago_otros,
          cash_in_box, first_ticket, last_ticket
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          type, date, desde, hasta, cash_register, user_nickname,
          total_sales, ventas_contado, ventas_credito, ventas_apartado, total_iva_gravado,
          total_recibido, total_anticipos, total_abonos,
          pago_efectivo, pago_tarjeta, pago_transferencia, pago_otros,
          cash_in_box, first_ticket, last_ticket
        ],
        function (err) {
          if (err) {
            console.error('❌ Error al insertar corte:', err.message);
            return reject(err);
          }
          console.log(`✅ Corte creado con ID: ${this.lastID}`);
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

    // Logs útiles para depurar
    console.log('[Cut.findAll] Consulta SQL:', query);
    console.log('[Cut.findAll] Parámetros:', params);

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('❌ Error en Cut.findAll:', err.message);
          console.error('Query ejecutada:', query);
          console.error('Params:', params);
          return reject(err);
        }
        console.log(`[Cut.findAll] Encontrados ${rows.length} cortes`);
        resolve(rows);
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
        if (!row) {
          console.log(`[Cut.findById] No se encontró corte con ID: ${id}`);
        }
        resolve(row);
      });
    });
  }
}

module.exports = Cut;