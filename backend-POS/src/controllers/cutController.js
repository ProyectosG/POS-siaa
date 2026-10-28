const db = require('../config/database');
const Cut = require('../models/Cut');
const { enTransaccion, ErrorNegocio } = require('../config/transaccion');
const { aPesos, camposAPesos, filaAPesos } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');
const { responderError } = require('../utils/idempotencia');

// Consultas sobre la conexión principal (para los GET)
const principal = {
  get: (sql, params = []) =>
    new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))),
  all: (sql, params = []) =>
    new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))),
};

const CAMPOS_VENTAS = ['total_ventas_monto', 'ventas_contado', 'ventas_credito', 'ventas_apartado', 'total_iva_gravado'];

/**
 * Calcula un corte en CENTAVOS. El X va desde el último corte (X o Z); el Z desde
 * el último Z. c es la conexión principal o una transacción (mismas funciones).
 */
async function calcularCorte(c, tipo) {
  const ultimo = tipo === 'Z'
    ? await c.get(`SELECT * FROM cuts WHERE type='Z' ORDER BY id DESC LIMIT 1`)
    : await c.get(`SELECT * FROM cuts ORDER BY id DESC LIMIT 1`);

  const desde = ultimo?.last_ticket != null
    ? ultimo.last_ticket + 1
    : (await c.get(`SELECT MIN(id) AS id FROM sales`)).id;
  const hasta = (await c.get(`SELECT MAX(id) AS id FROM sales`)).id;

  if (desde == null || hasta == null || desde > hasta) {
    return { ultimo, vacio: true };
  }

  const ventas = await c.get(
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
    [desde, hasta]
  );

  const money = await c.get(
    `
    SELECT
      COALESCE(SUM(CASE WHEN payment_type='anticipo' THEN amount ELSE 0 END),0) AS total_anticipos,
      COALESCE(SUM(CASE WHEN payment_type='abono' THEN amount ELSE 0 END),0) AS total_abonos,
      COALESCE(SUM(CASE WHEN payment_type='normal' THEN amount ELSE 0 END),0) AS total_normal
    FROM payments p
    JOIN sales s ON s.id = p.sale_id
    WHERE s.id BETWEEN ? AND ?
    `,
    [desde, hasta]
  );

  const pagosRows = await c.all(
    `
    SELECT method, SUM(amount) AS total
    FROM payments p
    JOIN sales s ON s.id = p.sale_id
    WHERE s.id BETWEEN ? AND ?
    GROUP BY method
    `,
    [desde, hasta]
  );

  const pagos = pagosRows.reduce((acc, r) => {
    acc[r.method] = r.total;
    return acc;
  }, {});

  return {
    ultimo,
    vacio: false,
    desde,
    hasta,
    ventas,
    pagos,
    total_anticipos: money.total_anticipos,
    total_abonos: money.total_abonos,
    total_recibido: money.total_anticipos + money.total_abonos + money.total_normal,
  };
}

// Respuesta del corte en curso (en pesos), igual que antes para el frontend
function respuestaCorte(corte, tipo) {
  const ultimo_corte = filaAPesos(corte.ultimo, 'cuts') || null;

  if (corte.vacio) {
    return {
      ventas: {},
      pagos: {},
      total_recibido: 0,
      total_anticipos: 0,
      total_abonos: 0,
      ticketRange: { first_ticket: null, last_ticket: null },
      ultimo_corte,
      tipo,
    };
  }

  const pagos = Object.fromEntries(Object.entries(corte.pagos).map(([m, v]) => [m, aPesos(v)]));

  return {
    ventas: camposAPesos(corte.ventas, CAMPOS_VENTAS),
    pagos,
    total_anticipos: aPesos(corte.total_anticipos),
    total_abonos: aPesos(corte.total_abonos),
    total_recibido: aPesos(corte.total_recibido),
    ticketRange: { first_ticket: corte.desde, last_ticket: corte.hasta },
    ultimo_corte,
    tipo,
  };
}

/**
 * GET /api/cuts/current → Corte X actual
 */
exports.getCurrentCorte = async (req, res) => {
  try {
    res.json(respuestaCorte(await calcularCorte(principal, 'X'), 'X'));
  } catch (err) {
    console.error('❌ Error Corte X:', err);
    res.status(500).json({ error: 'Error al calcular corte X' });
  }
};

/**
 * GET /api/cuts/current-z → Corte Z actual
 */
exports.getCurrentCorteZ = async (req, res) => {
  try {
    res.json(respuestaCorte(await calcularCorte(principal, 'Z'), 'Z'));
  } catch (err) {
    console.error('❌ Error Corte Z:', err);
    res.status(500).json({ error: 'Error al calcular corte Z' });
  }
};

/**
 * POST /api/cuts → Crear corte X o Z
 * El servidor calcula todos los montos y el rango de tickets en el momento de
 * guardar; del cuerpo solo se toman el tipo y la caja.
 */
exports.createCorte = async (req, res) => {
  const { type, cash_register } = req.body;

  try {
    const resultado = await enTransaccion(async (tx) => {
      const corte = await calcularCorte(tx, type);
      if (corte.vacio) throw new ErrorNegocio(400, 'No hay ventas nuevas para este corte');

      const { date } = ahoraNegocio();
      const p = corte.pagos;
      const otros = Object.entries(p)
        .filter(([m]) => !['efectivo', 'tarjeta', 'transferencia'].includes(m))
        .reduce((suma, [, v]) => suma + v, 0);

      const id = await Cut.crear(tx, {
        type,
        date,
        desde: String(corte.desde),
        hasta: String(corte.hasta),
        cash_register: cash_register || null,
        user_nickname: req.user.nickname, // el usuario del corte sale del token
        total_sales: corte.ventas.total_ventas_monto,
        ventas_contado: corte.ventas.ventas_contado,
        ventas_credito: corte.ventas.ventas_credito,
        ventas_apartado: corte.ventas.ventas_apartado,
        total_iva_gravado: corte.ventas.total_iva_gravado,
        total_recibido: corte.total_recibido,
        total_anticipos: corte.total_anticipos,
        total_abonos: corte.total_abonos,
        pago_efectivo: p.efectivo || 0,
        pago_tarjeta: p.tarjeta || 0,
        pago_transferencia: p.transferencia || 0,
        pago_otros: otros,
        cash_in_box: p.efectivo || 0,
        first_ticket: corte.desde,
        last_ticket: corte.hasta,
      });

      return { id, first_ticket: corte.desde, last_ticket: corte.hasta };
    });

    res.status(201).json({
      ...resultado,
      message: type === 'Z' ? '¡Corte Z registrado correctamente!' : 'Corte X registrado correctamente'
    });
  } catch (err) {
    responderError(res, err, 'Error al guardar corte');
  }
};

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
