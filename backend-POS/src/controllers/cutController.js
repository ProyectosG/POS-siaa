const db = require('../config/database');
const Cut = require('../models/Cut');

/**
 * =========================================
 * UTILIDADES DE TICKETS
 * =========================================
 */
const getLastTicket = () =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT MAX(id) AS last_ticket FROM sales`,
      [],
      (err, row) => {
        if (err) reject(err);
        else resolve(row?.last_ticket ?? null);
      }
    );
  });

const getFirstRealTicket = () =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM sales ORDER BY id ASC LIMIT 1`,
      [],
      (err, row) => {
        if (err) reject(err);
        else resolve(row?.id ?? null);
      }
    );
  });

/**
 * =========================================
 * GET /api/cuts/current → Corte X actual
 * =========================================
 */
exports.getCurrentCorte = async (req, res) => {
  try {
    const ultimoCorte = await Cut.findLast();

    let desdeTicket;
    if (ultimoCorte?.last_ticket != null) {
      desdeTicket = ultimoCorte.last_ticket + 1;
    } else {
      desdeTicket = await getFirstRealTicket();
    }

    const hastaTicket = await getLastTicket();

    if (desdeTicket === null || hastaTicket === null || desdeTicket > hastaTicket) {
      return res.json({
        ventas: {},
        pagos: {},
        total_recibido: 0,
        total_anticipos: 0,
        total_abonos: 0,
        ticketRange: { first_ticket: null, last_ticket: null },
        ultimo_corte: ultimoCorte || null,
        tipo: 'X'
      });
    }

    console.log(`[Corte X] Tickets ${desdeTicket} → ${hastaTicket}`);

    const ventas = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT 
          COUNT(*) AS total_ventas,
          COALESCE(SUM(total),0) AS total_ventas_monto,
          COALESCE(SUM(CASE WHEN type='contado' THEN total ELSE 0 END),0) AS ventas_contado,
          COALESCE(SUM(CASE WHEN type='credito' THEN total ELSE 0 END),0) AS ventas_credito,
          COALESCE(SUM(CASE WHEN type='apartado' THEN total ELSE 0 END),0) AS ventas_apartado,
          COALESCE(SUM(tax_total),0) AS total_iva_gravado
        FROM sales
        WHERE id BETWEEN ? AND ?
        `,
        [desdeTicket, hastaTicket],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    const money = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT
          COALESCE(SUM(CASE WHEN payment_type='anticipo' THEN amount ELSE 0 END),0) AS total_anticipos,
          COALESCE(SUM(CASE WHEN payment_type='abono' THEN amount ELSE 0 END),0) AS total_abonos,
          COALESCE(SUM(CASE WHEN payment_type='normal' THEN amount ELSE 0 END),0) AS total_normal
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
        WHERE s.id BETWEEN ? AND ?
        `,
        [desdeTicket, hastaTicket],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    const pagosRows = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT method, SUM(amount) AS total
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
        WHERE s.id BETWEEN ? AND ?
        GROUP BY method
        `,
        [desdeTicket, hastaTicket],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    const pagos = pagosRows.reduce((acc, r) => {
      acc[r.method] = r.total;
      return acc;
    }, {});

    const total_recibido = money.total_anticipos + money.total_abonos + money.total_normal;

    res.json({
      ventas,
      pagos,
      total_anticipos: money.total_anticipos,
      total_abonos: money.total_abonos,
      total_recibido,
      ticketRange: { first_ticket: desdeTicket, last_ticket: hastaTicket },
      ultimo_corte: ultimoCorte || null,
      tipo: 'X'
    });
  } catch (err) {
    console.error('❌ Error Corte X:', err);
    res.status(500).json({ error: 'Error al calcular corte X' });
  }
};

/**
 * =========================================
 * GET /api/cuts/current-z → Corte Z actual
 * =========================================
 */
exports.getCurrentCorteZ = async (req, res) => {
  try {
    const ultimoCorteZ = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM cuts WHERE type='Z' ORDER BY id DESC LIMIT 1`,
        [],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    let desdeTicket;
    if (ultimoCorteZ?.last_ticket != null) {
      desdeTicket = ultimoCorteZ.last_ticket + 1;
    } else {
      desdeTicket = await getFirstRealTicket();
    }

    const hastaTicket = await getLastTicket();

    if (desdeTicket === null || hastaTicket === null || desdeTicket > hastaTicket) {
      return res.json({
        ventas: {},
        pagos: {},
        total_recibido: 0,
        total_anticipos: 0,
        total_abonos: 0,
        ticketRange: { first_ticket: null, last_ticket: null },
        ultimo_corte: ultimoCorteZ || null,
        tipo: 'Z'
      });
    }

    console.log(`[Corte Z] Tickets ${desdeTicket} → ${hastaTicket}`);

    // (el resto del cálculo es idéntico al de Corte X, solo cambia el tipo)
    const ventas = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT 
          COUNT(*) AS total_ventas,
          COALESCE(SUM(total),0) AS total_ventas_monto,
          COALESCE(SUM(CASE WHEN type='contado' THEN total ELSE 0 END),0) AS ventas_contado,
          COALESCE(SUM(CASE WHEN type='credito' THEN total ELSE 0 END),0) AS ventas_credito,
          COALESCE(SUM(CASE WHEN type='apartado' THEN total ELSE 0 END),0) AS ventas_apartado,
          COALESCE(SUM(tax_total),0) AS total_iva_gravado
        FROM sales
        WHERE id BETWEEN ? AND ?
        `,
        [desdeTicket, hastaTicket],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    const money = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT
          COALESCE(SUM(CASE WHEN payment_type='anticipo' THEN amount ELSE 0 END),0) AS total_anticipos,
          COALESCE(SUM(CASE WHEN payment_type='abono' THEN amount ELSE 0 END),0) AS total_abonos,
          COALESCE(SUM(CASE WHEN payment_type='normal' THEN amount ELSE 0 END),0) AS total_normal
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
        WHERE s.id BETWEEN ? AND ?
        `,
        [desdeTicket, hastaTicket],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    const pagosRows = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT method, SUM(amount) AS total
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
        WHERE s.id BETWEEN ? AND ?
        GROUP BY method
        `,
        [desdeTicket, hastaTicket],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    const pagos = pagosRows.reduce((acc, r) => {
      acc[r.method] = r.total;
      return acc;
    }, {});

    const total_recibido = money.total_anticipos + money.total_abonos + money.total_normal;

    res.json({
      ventas,
      pagos,
      total_anticipos: money.total_anticipos,
      total_abonos: money.total_abonos,
      total_recibido,
      ticketRange: { first_ticket: desdeTicket, last_ticket: hastaTicket },
      ultimo_corte: ultimoCorteZ || null,
      tipo: 'Z'
    });
  } catch (err) {
    console.error('❌ Error Corte Z:', err);
    res.status(500).json({ error: 'Error al calcular corte Z' });
  }
};

/**
 * =========================================
 * POST /api/cuts → Crear corte X o Z
 * =========================================
 */
exports.createCorte = async (req, res) => {
  try {
    const data = req.body;

    if (!data.type || data.first_ticket === null || data.last_ticket === null) {
      return res.status(400).json({
        error: 'type, first_ticket y last_ticket son obligatorios'
      });
    }

    const cutId = await Cut.create({ ...data });

    res.status(201).json({
      id: cutId,
      message: data.type === 'Z' ? '¡Corte Z registrado correctamente!' : 'Corte X registrado correctamente'
    });
  } catch (err) {
    console.error('❌ Error al guardar corte:', err);
    res.status(500).json({ error: 'Error interno al guardar corte' });
  }
};

/**
 * =========================================
 * NUEVOS MÉTODOS PARA EL REPORTE
 * =========================================
 */

/**
 * GET /api/cuts → Listar todos los cortes (con filtros opcionales)
 */
exports.getAllCuts = async (req, res) => {
  try {
    const { type, fromDate, toDate } = req.query;
    const cuts = await Cut.findAll({ type, fromDate, toDate });
    res.json(cuts);
  } catch (err) {
    console.error('❌ Error al obtener lista de cortes:', err);
    res.status(500).json({ error: 'Error al obtener los cortes' });
  }
};

/**
 * GET /api/cuts/:id → Obtener un corte específico
 */
exports.getCutById = async (req, res) => {
  try {
    const { id } = req.params;
    const cut = await Cut.findById(id);
    if (!cut) {
      return res.status(404).json({ error: 'Corte no encontrado' });
    }
    res.json(cut);
  } catch (err) {
    console.error('❌ Error al obtener corte específico:', err);
    res.status(500).json({ error: 'Error al obtener el corte' });
  }
};

module.exports = exports;