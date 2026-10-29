// src/controllers/ticket.controller.js
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const buildTicketData = require('../utils/buildTicketData');
const buildTicketText = require('../utils/buildTicketText');
const buildTicketTextCorte = require('../utils/buildTicketTextCorte'); // ← Importamos la versión que respeta TICKET_WIDTH
const cutController = require('./cutController');
const { ahoraNegocio } = require('../utils/fechas');

// =======================
// TICKETS DE VENTA
// =======================

exports.getTicketText = async (req, res) => {
  try {
    const data = await buildTicketData(req.params.id);
    const ticketText = buildTicketText(data);
    res.json({ ticketText });
  } catch (err) {
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

        ticketText.split('\n').forEach(line => printer.text(line));
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
    console.error('[ERROR] Error al imprimir ticket de venta:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

// =======================
// TICKETS DE CORTES (X o Z)
// =======================

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

    // Usamos la función de utils que respeta TICKET_WIDTH
    const ticketText = buildTicketTextCorte(ticketData);
    const sinImpresora = () =>
      res.status(200).json({
        message: 'Impresora no detectada - modo prueba (ticket generado pero no impreso)',
        ticketText
      });

    let responded = false;

    try {
      const device = new escpos.USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (responded) return;
        responded = true;

        if (err) {
          console.warn('[WARN BACKEND] Impresora no detectada para corte:', err.message);
          return sinImpresora();
        }

        ticketText.split('\n').forEach(line => printer.text(line));
        printer.cut().close();
        res.json({ message: `Corte ${tipo} impreso correctamente` });
      });
    } catch (deviceErr) {
      console.warn('[WARN BACKEND] Error al crear dispositivo USB para corte:', deviceErr.message);
      return sinImpresora();
    }
  } catch (err) {
    console.error('[ERROR BACKEND] Error al imprimir corte actual:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Error interno al procesar el corte' });
    }
  }
};
