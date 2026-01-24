// src/controllers/cutController.js
const db = require('../config/database');
const Cut = require('../models/Cut');

/**
 * GET /api/cuts/current
 * Calcula el corte actual (X) desde el último corte hasta ahora
 */
exports.getCurrentCorte = async (req, res) => {
  try {
    // 1. Obtener el último corte registrado
    const ultimoCorte = await Cut.findLast();

    // Definir rango de fechas
    let desde;
    if (ultimoCorte) {
      // Desde la fecha del último corte + 1 segundo (para no incluirlo)
      const fechaUltimo = new Date(ultimoCorte.date + ' ' + (ultimoCorte.time || '00:00:00'));
      fechaUltimo.setSeconds(fechaUltimo.getSeconds() + 1);
      desde = fechaUltimo.toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD
    } else {
      // Si no hay cortes previos, desde el inicio del sistema (ej: 2024-01-01)
      desde = '2024-01-01';
    }

    // Hasta: fecha actual
    const ahora = new Date();
    const hasta = ahora.toISOString().split('T')[0];

    console.log(`[Corte Actual] Calculando desde ${desde} hasta ${hasta}`);

    // 2. Obtener totales de ventas en el rango
    const ventas = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT 
          COUNT(*) AS total_ventas,
          COALESCE(SUM(total), 0) AS total_ventas_monto,
          COALESCE(SUM(CASE WHEN type = 'contado' THEN total ELSE 0 END), 0) AS ventas_contado,
          COALESCE(SUM(CASE WHEN type = 'credito' THEN total ELSE 0 END), 0) AS ventas_credito,
          COALESCE(SUM(CASE WHEN type = 'apartado' THEN total ELSE 0 END), 0) AS ventas_apartado,
          COALESCE(SUM(tax_total), 0) AS total_iva_gravado
        FROM sales
        WHERE date BETWEEN ? AND ?
        `,
        [desde, hasta],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || {});
        }
      );
    });

    // 3. Dinero recibido correctamente clasificado
    const money = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT
          COALESCE(SUM(CASE WHEN payment_type = 'anticipo' THEN amount ELSE 0 END), 0) AS total_anticipos,
          COALESCE(SUM(CASE WHEN payment_type = 'abono' THEN amount ELSE 0 END), 0) AS total_abonos,
          COALESCE(SUM(CASE WHEN payment_type = 'normal' THEN amount ELSE 0 END), 0) AS total_normal
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
        WHERE s.date BETWEEN ? AND ?
        `,
        [desde, hasta],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || {});
        }
      );
    });

    // 4. Pagos por método (desglose)
    const pagosRows = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT method, SUM(amount) AS total
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
        WHERE s.date BETWEEN ? AND ?
        GROUP BY method
        `,
        [desde, hasta],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const pagos = pagosRows.reduce((acc, r) => {
      acc[r.method] = r.total || 0;
      return acc;
    }, {});

    // 5. Total recibido
    const total_recibido =
      money.total_anticipos +
      money.total_abonos +
      money.total_normal;

    // Respuesta completa
    res.json({
      desde,
      hasta,
      ventas,
      pagos,
      total_anticipos: money.total_anticipos,
      total_abonos: money.total_abonos,
      total_recibido,
      ultimo_corte: ultimoCorte || null
    });
  } catch (err) {
    console.error('❌ Error en getCurrentCorte:', err.message);
    res.status(500).json({ error: 'Error al calcular corte actual' });
  }
};

/**
 * POST /api/cuts
 * Guarda un corte COMPLETO (snapshot)
 */
exports.createCorte = async (req, res) => {
  try {
    const data = req.body;

    // Validaciones mínimas
    if (!data.type || !data.date || !data.desde || !data.hasta) {
      return res.status(400).json({
        error: 'type, date, desde y hasta son obligatorios'
      });
    }

    const cutId = await Cut.create({
      type: data.type,
      date: data.date,
      desde: data.desde,
      hasta: data.hasta,
      cash_register: data.cash_register || null,
      user_nickname: data.user_nickname || null,

      total_sales: data.total_sales || 0,
      ventas_contado: data.ventas_contado || 0,
      ventas_credito: data.ventas_credito || 0,
      ventas_apartado: data.ventas_apartado || 0,
      total_iva_gravado: data.total_iva_gravado || 0,

      total_recibido: data.total_recibido || 0,
      total_anticipos: data.total_anticipos || 0,
      total_abonos: data.total_abonos || 0,

      pago_efectivo: data.pago_efectivo || 0,
      pago_tarjeta: data.pago_tarjeta || 0,
      pago_transferencia: data.pago_transferencia || 0,
      pago_otros: data.pago_otros || 0,

      cash_in_box: data.cash_in_box || 0,
      first_ticket: data.first_ticket || null,
      last_ticket: data.last_ticket || null
    });

    res.status(201).json({
      id: cutId,
      message: `Corte ${data.type} registrado correctamente`
    });
  } catch (err) {
    console.error('❌ Error al crear corte:', err.message);
    res.status(500).json({
      error: 'Error interno al registrar corte'
    });
  }
};

module.exports = exports;