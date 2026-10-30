// src/controllers/ticket.controller.js
const buildTicketData = require('../utils/buildTicketData');
const buildTicketText = require('../utils/buildTicketText');
const buildTicketTextCorte = require('../utils/buildTicketTextCorte');
const { leerConfigTicket, sinAcentos } = require('../utils/ticketConfig');
const cutController = require('./cutController');
const Cut = require('../models/Cut');
const { leerId } = require('../utils/peticion');
const { ahoraNegocio } = require('../utils/fechas');
const { esDemo } = require('../demo/demo');

// La librería de la impresora (USB, módulo nativo) se carga hasta que se va a
// imprimir: si no está disponible en el equipo, se responde en modo prueba.
function cargarEscpos() {
  const escpos = require('escpos');
  escpos.USB = require('escpos-usb');
  return escpos;
}

// =======================
// TICKETS DE VENTA
// =======================

exports.getTicketText = async (req, res) => {
  try {
    const data = await buildTicketData(req.params.id);
    const ticketText = buildTicketText(data);
    res.json({ ticketText });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    console.error('[ERROR] Error al generar texto de ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.printById = async (req, res) => {
  try {

    const data = await buildTicketData(req.params.id);
    const ticketText = buildTicketText(data);

    let responded = false;

    try {
      const escpos = cargarEscpos();
      const device = new escpos.USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (responded) {
          return;
        }

        responded = true;

        if (err) {
          console.warn('[WARN] Impresora no detectada para ticket de venta:', err.message);
          return res.status(200).json({ 
            message: 'Impresora no detectada - modo prueba (ticket generado pero no impreso)',
            ticketText
          });
        }

        // La impresora recibe el texto sin acentos (no los tiene); la vista previa los conserva
        sinAcentos(ticketText).split('\n').forEach(line => printer.text(line));
        printer.cut().close();

        res.json({ message: 'Ticket impreso correctamente' });
      });
    } catch (deviceErr) {
      console.warn('[WARN] Error al crear dispositivo USB para ticket de venta:', deviceErr.message);
      return res.status(200).json({ 
        message: 'Impresora no detectada - modo prueba (ticket generado pero no impreso)',
        ticketText
      });
    }
  } catch (err) {
    if (err.status === 404 && !res.headersSent) return res.status(404).json({ error: err.message });
    console.error('[ERROR] Error al imprimir ticket de venta:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

// =======================
// TICKETS DE CORTES (X o Z)
// =======================

// Manda el texto a la impresora y responde. Sin impresora responde 200 en
// "modo prueba" con el texto; en la demo nunca imprime, solo lo devuelve.
function imprimirCorte(res, ticketText, mensajeImpreso) {
  const sinImpresora = () =>
    res.status(200).json({
      message: 'Impresora no detectada - modo prueba (ticket generado pero no impreso)',
      ticketText
    });

  // En la demo el corte solo se muestra en pantalla: nunca se imprime
  if (esDemo()) return res.status(200).json({ message: 'Demo: el corte no se imprime, solo se muestra en pantalla', ticketText });

  let responded = false;

  try {
    const escpos = cargarEscpos();
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open((err) => {
      if (responded) return;
      responded = true;

      if (err) {
        console.warn('[WARN BACKEND] Impresora no detectada para corte:', err.message);
        return sinImpresora();
      }

      // La impresora recibe el texto sin acentos (no los tiene); la vista previa los conserva
        sinAcentos(ticketText).split('\n').forEach(line => printer.text(line));
      printer.cut().close();
      res.json({ message: mensajeImpreso });
    });
  } catch (deviceErr) {
    console.warn('[WARN BACKEND] Error al crear dispositivo USB para corte:', deviceErr.message);
    return sinImpresora();
  }
}

/**
 * GET /cuts/print/current
 * Imprime directamente el corte actual (X) en impresora ESC/POS
 */
exports.printCorteCurrent = async (req, res) => {
  const tipo = req.query.tipo === 'Z' ? 'Z' : 'X';

  try {
    // Mismo cálculo que GET /cuts/current (X) o /cuts/current-z (Z)
    const corteData = await new Promise((resolve, reject) => {
      const mockRes = {
        json: resolve,
        status: (code) => ({ json: (err) => reject(new Error(err.error || `Error ${code}`)) })
      };
      const calcular = tipo === 'Z' ? cutController.getCurrentCorteZ : cutController.getCurrentCorte;
      calcular({ query: {} }, mockRes);
    });

    const ventas = corteData.ventas || {};
    const pagos = corteData.pagos || {};
    const { first_ticket, last_ticket } = corteData.ticketRange || {};

    const ticketData = {
      type: `CORTE ${tipo}`,
      caja: req.query.caja || 'N/A',
      usuario: req.user.nickname,
      fecha: ahoraNegocio().date,
      desde: first_ticket ?? '-',
      hasta: last_ticket ?? '-',
      firstTicket: first_ticket ?? 'N/A',
      lastTicket: last_ticket ?? 'N/A',
      totalVentas: ventas.total_ventas_monto || 0,
      contado: ventas.ventas_contado || 0,
      credito: ventas.ventas_credito || 0,
      apartado: ventas.ventas_apartado || 0,
      iva: ventas.total_iva_gravado || 0,
      totalRecibido: corteData.total_recibido || 0,
      anticipos: corteData.total_anticipos || 0,
      abonos: corteData.total_abonos || 0,
      efectivo: pagos.efectivo || 0,
      tarjeta: pagos.tarjeta || 0,
      transferencia: pagos.transferencia || 0,
      otros: pagos.otros || 0,
      cashInBox: pagos.efectivo || 0,
    };

    // Ancho del ticket según Configuración (58 mm por omisión)
    const { ancho } = await leerConfigTicket();
    imprimirCorte(res, buildTicketTextCorte(ticketData, ancho), `Corte ${tipo} impreso correctamente`);
  } catch (err) {
    console.error('[ERROR BACKEND] Error al imprimir corte actual:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Error interno al procesar el corte' });
    }
  }
};

// Ticket de un corte ya guardado: los montos son los que quedaron al cerrarlo
// (no se vuelven a calcular) y va marcado como reimpresión, con fecha y usuario.
async function textoCorteGuardado(req) {
  const id = leerId(req);
  const corte = id && (await Cut.findById(id));
  if (!corte) return null;

  // Hora del corte original: created_at está en UTC. Solo se muestra si cae en
  // el mismo día que la fecha del corte (en la demo las fechas son simuladas).
  let fecha = corte.date || '-';
  if (corte.created_at) {
    const original = ahoraNegocio(new Date(`${corte.created_at.replace(' ', 'T')}Z`));
    if (original.date === corte.date) fecha += ` ${original.time.slice(0, 5)}`;
  }
  const ahora = ahoraNegocio();
  const monto = (v) => Number(v) || 0;
  const { ancho } = await leerConfigTicket();

  return buildTicketTextCorte({
    type: `CORTE ${corte.type}`,
    numero: corte.id,
    caja: corte.cash_register || 'N/A',
    usuario: corte.user_nickname || 'N/A',
    fecha,
    desde: corte.desde || '-',
    hasta: corte.hasta || '-',
    firstTicket: corte.first_ticket ?? 'N/A',
    lastTicket: corte.last_ticket ?? 'N/A',
    totalVentas: monto(corte.total_sales),
    contado: monto(corte.ventas_contado),
    credito: monto(corte.ventas_credito),
    apartado: monto(corte.ventas_apartado),
    iva: monto(corte.total_iva_gravado),
    totalRecibido: monto(corte.total_recibido),
    anticipos: monto(corte.total_anticipos),
    abonos: monto(corte.total_abonos),
    efectivo: monto(corte.pago_efectivo),
    tarjeta: monto(corte.pago_tarjeta),
    transferencia: monto(corte.pago_transferencia),
    otros: monto(corte.pago_otros),
    cashInBox: monto(corte.cash_in_box),
    reimpresion: { fecha: `${ahora.date} ${ahora.time.slice(0, 5)}`, usuario: req.user.nickname },
  }, ancho);
}

/**
 * GET /cuts/:id/text
 * Vista previa de la reimpresión de un corte guardado
 */
exports.getCorteText = async (req, res) => {
  try {
    const ticketText = await textoCorteGuardado(req);
    if (!ticketText) return res.status(404).json({ error: 'Corte no encontrado' });
    res.json({ ticketText });
  } catch (err) {
    console.error('[ERROR BACKEND] Error al generar texto del corte:', err);
    res.status(500).json({ error: 'Error al generar el ticket del corte' });
  }
};

/**
 * GET /cuts/:id/print
 * Reimprime un corte guardado
 */
exports.printCorteById = async (req, res) => {
  try {
    const ticketText = await textoCorteGuardado(req);
    if (!ticketText) return res.status(404).json({ error: 'Corte no encontrado' });
    imprimirCorte(res, ticketText, `Corte #${req.params.id} reimpreso correctamente`);
  } catch (err) {
    console.error('[ERROR BACKEND] Error al reimprimir corte:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error al reimprimir el corte' });
  }
};
