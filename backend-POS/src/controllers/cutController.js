const { prisma } = require('../config/prisma');
const Cut = require('../models/Cut');
const { enTransaccion, ErrorNegocio } = require('../config/transaccion');
const { aPesos, camposAPesos, filaAPesos } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');
const { responderError } = require('../utils/idempotencia');
const { leerId } = require('../utils/peticion');
const { tieneNivel, NIVELES } = require('../middleware/auth');
const { calcularCorte, columnasDeCorte } = require('../utils/cortes');
const { TIPO_GENERAL, armarGeneral, respuestaGeneral, esGeneral } = require('../utils/corteGeneral');
const { respaldarTrasCorteZ } = require('../utils/respaldoAuto');

const CAMPOS_VENTAS = ['total_ventas_monto', 'ventas_contado', 'ventas_credito', 'ventas_apartado', 'total_iva_gravado'];

// Respuesta del corte en curso (en pesos), igual que antes para el frontend
function respuestaCorte(corte, tipo, caja) {
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
      caja,
    };
  }

  const pagos = Object.fromEntries(Object.entries(corte.pagos).map(([m, v]) => [m, aPesos(v)]));

  return {
    ventas: camposAPesos(corte.ventas, CAMPOS_VENTAS),
    pagos,
    total_anticipos: aPesos(corte.total_anticipos),
    total_abonos: aPesos(corte.total_abonos),
    total_recibido: aPesos(corte.total_recibido),
    ticketRange: corte.hayVentas
      ? { first_ticket: corte.desde, last_ticket: corte.hasta }
      : { first_ticket: null, last_ticket: null },
    // true aunque no haya tickets nuevos, si hubo cobros (abonos a ventas anteriores)
    hay_movimientos: true,
    ultimo_corte,
    tipo,
    caja,
  };
}

// Corte en curso de la caja del token (X o Z), para la pantalla y para imprimir
exports.corteEnCurso = async (tipo, caja) => respuestaCorte(await calcularCorte(prisma, tipo, caja), tipo, caja);

/**
 * GET /api/cuts/current → Corte X actual de la caja del token
 */
exports.getCurrentCorte = async (req, res) => {
  try {
    res.json(await exports.corteEnCurso('X', req.caja.numero));
  } catch (err) {
    console.error('❌ Error Corte X:', err);
    res.status(500).json({ error: 'Error al calcular corte X' });
  }
};

/**
 * GET /api/cuts/current-z → Corte Z actual de la caja del token
 */
exports.getCurrentCorteZ = async (req, res) => {
  try {
    res.json(await exports.corteEnCurso('Z', req.caja.numero));
  } catch (err) {
    console.error('❌ Error Corte Z:', err);
    res.status(500).json({ error: 'Error al calcular corte Z' });
  }
};

/**
 * POST /api/cuts → Crear corte X o Z de la caja del token.
 * El servidor calcula todos los montos y el rango de tickets en el momento de
 * guardar; del cuerpo solo se toma el tipo. La caja sale del token.
 */
exports.createCorte = async (req, res) => {
  const type = String(req.body.type).toUpperCase();
  const caja = req.caja.numero;

  try {
    const resultado = await enTransaccion(async (tx) => {
      const corte = await calcularCorte(tx, type, caja);
      if (corte.vacio) throw new ErrorNegocio(400, 'No hay ventas ni cobros nuevos para este corte');

      const { date } = ahoraNegocio();
      const id = await Cut.crear(tx, {
        type,
        date,
        desde: corte.hayVentas ? String(corte.desde) : '-',
        hasta: corte.hayVentas ? String(corte.hasta) : '-',
        cash_register: caja,
        user_nickname: req.user.nickname, // el usuario del corte sale del token
        ...columnasDeCorte(corte),
        // Sin ventas nuevas no hay primer ticket, pero last_ticket conserva hasta dónde se cubrió
        first_ticket: corte.desde,
        last_ticket: corte.hasta,
        last_payment_id: corte.ultimoPago,
      });

      return { id, first_ticket: corte.desde, last_ticket: corte.hasta };
    });

    // Fuera de la transacción: VACUUM INTO no corre dentro de una. Si falla, el Z se queda
    const respaldo = type === 'Z' ? await respaldarTrasCorteZ() : null;

    res.status(201).json({
      ...resultado,
      caja,
      ...(respaldo && { respaldo }),
      message: type === 'Z' ? '¡Corte Z registrado correctamente!' : 'Corte X registrado correctamente'
    });
  } catch (err) {
    responderError(res, err, 'Error al guardar corte');
  }
};

// Lee ?tipo= o { type }: X o Z (también XG y ZG). Si no, null.
function tipoGeneral(valor) {
  const t = String(valor || '').toUpperCase().replace(/G$/, '');
  return TIPO_GENERAL[t] ? t : null;
}
exports.tipoGeneral = tipoGeneral;

/**
 * GET /api/cuts/general/current?tipo=X|Z → general en curso (solo Administrador)
 */
exports.getGeneralActual = async (req, res) => {
  const tipo = tipoGeneral(req.query.tipo);
  if (!tipo) return res.status(400).json({ error: 'tipo debe ser X o Z' });
  try {
    res.json(respuestaGeneral(await armarGeneral(prisma, tipo)));
  } catch (err) {
    responderError(res, err, 'Error al calcular el corte general');
  }
};

/**
 * POST /api/cuts/general { type } → guarda un XG o un ZG (solo Administrador).
 * ZG: consolida los Z sin consolidar, en una transacción: ninguno entra en dos, y si
 * algún monto no cuadra contra ventas y pagos deshace todo y responde 409.
 * XG: es una foto que se puede repetir; no marca nada ni mueve el conteo de las cajas.
 */
exports.createGeneral = async (req, res) => {
  const tipo = tipoGeneral(req.body && req.body.type);
  if (!tipo) return res.status(400).json({ error: 'type debe ser X o Z' });

  try {
    const resultado = await enTransaccion(async (tx) => {
      const g = await armarGeneral(tx, tipo);

      if (g.incluidos.length === 0) {
        throw new ErrorNegocio(400, tipo === 'Z'
          ? 'No hay cortes Z de caja por consolidar'
          : 'No hay cortes de caja para incluir');
      }
      if (tipo === 'Z' && !g.cuadra) {
        throw new ErrorNegocio(409, 'El corte general no cuadra contra las ventas y los pagos; no se guardó nada', {
          cuadra: false,
          diferencia_centavos: g.diferencia_centavos,
          diferencias: g.diferencias,
        });
      }

      const { date } = ahoraNegocio();
      const id = await Cut.crear(tx, {
        type: TIPO_GENERAL[tipo],
        date,
        desde: '-',
        hasta: '-',
        cash_register: null,
        user_nickname: req.user.nickname,
        ...g.columnas,
        first_ticket: null,
        last_ticket: null,
        last_payment_id: null,
      });

      const ids = g.incluidos.map((k) => k.id);
      await tx.corte_general_cortes.createMany({ data: ids.map((corte_id) => ({ general_id: id, corte_id })) });

      if (tipo === 'Z') {
        const { count } = await tx.cuts.updateMany({
          where: { id: { in: ids }, corte_general_id: null },
          data: { corte_general_id: id },
        });
        if (count !== ids.length) throw new ErrorNegocio(409, 'Otro corte general tomó estos cortes; vuelve a intentarlo');
      }

      return { id, tipo: TIPO_GENERAL[tipo], incluidos: ids.length, cuadra: g.cuadra, diferencia_centavos: g.diferencia_centavos };
    });

    // Un Z General respalda una sola vez; un X General no respalda
    const respaldo = tipo === 'Z' ? await respaldarTrasCorteZ() : null;

    res.status(201).json({ ...resultado, ...(respaldo && { respaldo }), message: `Corte ${tipo} General registrado correctamente` });
  } catch (err) {
    responderError(res, err, 'Error al guardar el corte general');
  }
};

/**
 * GET /api/cuts → Listar los cortes (con filtros opcionales). Los generales solo
 * los ve el Administrador.
 */
exports.getAllCuts = async (req, res) => {
  try {
    const { type, fromDate, toDate } = req.query;
    const sinGenerales = !tieneNivel(req.user, NIVELES.ADMIN);
    res.json(await Cut.findAll({ type, fromDate, toDate, sinGenerales }));
  } catch (err) {
    console.error('❌ Error al obtener lista de cortes:', err);
    res.status(500).json({ error: 'Error al obtener los cortes' });
  }
};

// Middleware de /:id, /:id/text y /:id/print: un general solo lo consulta el Administrador
exports.protegerGeneral = async (req, res, next) => {
  try {
    const id = leerId(req);
    const corte = id && (await prisma.cuts.findUnique({ where: { id }, select: { type: true } }));
    if (esGeneral(corte) && !tieneNivel(req.user, NIVELES.ADMIN)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  } catch (err) {
    responderError(res, err, 'Error al revisar el corte');
  }
};

/**
 * GET /api/cuts/:id → Obtener un corte específico
 */
exports.getCutById = async (req, res) => {
  try {
    const id = leerId(req);
    const cut = id && (await Cut.findById(id));
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
