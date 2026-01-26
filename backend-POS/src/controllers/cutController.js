// src/controllers/cutController.js
const db = require('../config/database');
const Cut = require('../models/Cut');

/**
 * GET /api/cuts/current
 * Calcula el corte actual (X) desde el último corte registrado hasta la fecha/hora actual
 */
exports.getCurrentCorte = async (req, res) => {
  try {
    // 1. Obtener el último corte registrado
    const ultimoCorte = await Cut.findLast();

    let desde;
    if (ultimoCorte) {
      // Usamos el timestamp completo del último corte (created_at si existe, sino date + 00:00:00)
      const fechaUltimo = ultimoCorte.created_at 
        ? new Date(ultimoCorte.created_at)
        : new Date(ultimoCorte.date + ' 00:00:00');

      // Desde el último corte + 1 segundo (para no incluir ventas del corte anterior)
      fechaUltimo.setSeconds(fechaUltimo.getSeconds() + 1);
      desde = fechaUltimo.toISOString(); // Formato completo: YYYY-MM-DDTHH:mm:ss.sssZ
    } else {
      // Si no hay cortes previos, desde una fecha inicial razonable
      desde = '2024-01-01T00:00:00.000Z';
    }

    // Hasta: fecha y hora actual exacta
    const hasta = new Date().toISOString();

    console.log(`[Corte Actual] Calculando desde ${desde} hasta ${hasta}`);

    // 2. Obtener totales de ventas en el rango (usando timestamp completo)
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
        WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)
        `,
        [desde, hasta],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || {});
        }
      );
    });

    // 3. Dinero recibido clasificado por tipo (anticipos, abonos, pagos normales)
    const money = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT
          COALESCE(SUM(CASE WHEN payment_type = 'anticipo' THEN amount ELSE 0 END), 0) AS total_anticipos,
          COALESCE(SUM(CASE WHEN payment_type = 'abono' THEN amount ELSE 0 END), 0) AS total_abonos,
          COALESCE(SUM(CASE WHEN payment_type = 'normal' THEN amount ELSE 0 END), 0) AS total_normal
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
        WHERE datetime(s.created_at) >= datetime(?) AND datetime(s.created_at) <= datetime(?)
        `,
        [desde, hasta],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || {});
        }
      );
    });

    // 4. Pagos por método (efectivo, tarjeta, transferencia, otros)
    const pagosRows = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT method, SUM(amount) AS total
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
        WHERE datetime(s.created_at) >= datetime(?) AND datetime(s.created_at) <= datetime(?)
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

    // 5. Total recibido (suma de todos los pagos)
    const total_recibido =
      money.total_anticipos +
      money.total_abonos +
      money.total_normal;

    // 6. Rango de tickets (opcional, pero útil para el frontend)
    const ticketRange = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT 
          MIN(id) AS first_ticket,
          MAX(id) AS last_ticket
        FROM sales
        WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)
        `,
        [desde, hasta],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { first_ticket: null, last_ticket: null });
        }
      );
    });

    // Respuesta completa
    res.json({
      desde: new Date(desde).toISOString().split('T')[0],
      hasta: new Date(hasta).toISOString().split('T')[0],
      ventas,
      pagos,
      total_anticipos: money.total_anticipos,
      total_abonos: money.total_abonos,
      total_recibido,
      ticketRange,
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