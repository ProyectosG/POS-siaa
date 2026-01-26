// src/controllers/ticket.controller.js
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const buildTicketData = require('../utils/buildTicketData');
const buildTicketText = require('../utils/buildTicketText');
const buildTicketTextCorte = require('../utils/buildTicketTextCorte'); // ← Importamos la versión que respeta TICKET_WIDTH
const cutController = require('./cutController');

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
    console.log('[DEBUG] Iniciando printById para ticket ID:', req.params.id);

    const data = await buildTicketData(req.params.id);
    const ticketText = buildTicketText(data);

    let responded = false;

    try {
      const device = new escpos.USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (responded) {
          console.log('[DEBUG] Callback open llamado de nuevo - ignorando');
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
  try {
    console.log('[DEBUG] Iniciando printCorteCurrent...');

    const corteData = await new Promise((resolve, reject) => {
      const mockReq = { query: {} };
      const mockRes = {
        json: resolve,
        status: (code) => ({ json: (err) => reject(new Error(err.error || `Error ${code}`)) })
      };
      cutController.getCurrentCorte(mockReq, mockRes);
    });

    console.log('[DEBUG] Datos del corte obtenidos:', corteData);

    const ticketData = {
      type: 'CORTE X',
      caja: corteData.cash_register || 'N/A',
      fecha: corteData.hasta,
      desde: corteData.desde,
      hasta: corteData.hasta,
      firstTicket: corteData.first_ticket || 'N/A',
      lastTicket: corteData.last_ticket || 'N/A',
      totalVentas: corteData.ventas.total_ventas_monto || 0,
      contado: corteData.ventas.ventas_contado || 0,
      credito: corteData.ventas.ventas_credito || 0,
      apartado: corteData.ventas.ventas_apartado || 0,
      iva: corteData.ventas.total_iva_gravado || 0,
      totalRecibido: corteData.total_recibido || 0,
      anticipos: corteData.total_anticipos || 0,
      abonos: corteData.total_abonos || 0,
      efectivo: corteData.pagos.efectivo || 0,
      tarjeta: corteData.pagos.tarjeta || 0,
      transferencia: corteData.pagos.transferencia || 0,
      otros: corteData.pagos.otros || 0,
      cashInBox: corteData.cash_in_box || 0,
    };

    // Usamos la función de utils que respeta TICKET_WIDTH
    const ticketText = buildTicketTextCorte(ticketData);

    console.log('[DEBUG] Ticket de corte generado, intentando abrir impresora...');

    let responded = false;

    try {
      const device = new escpos.USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (responded) {
          console.log('[DEBUG] Callback open llamado de nuevo - ignorando');
          return;
        }

        responded = true;

        if (err) {
          console.warn('[WARN BACKEND] Impresora no detectada para corte:', err.message);
          console.log('[DEBUG] Enviando respuesta 200 (modo prueba) para corte actual');
          return res.status(200).json({ 
            message: 'Impresora no detectada - modo prueba (ticket generado pero no impreso)',
            ticketText
          });
        }

        console.log('[DEBUG] Impresora abierta correctamente, imprimiendo corte...');
        ticketText.split('\n').forEach(line => printer.text(line));
        printer.cut().close();

        console.log('[DEBUG] Enviando respuesta éxito para corte actual');
        res.json({ message: 'Corte X impreso correctamente' });
      });
    } catch (deviceErr) {
      console.warn('[WARN BACKEND] Error al crear dispositivo USB para corte:', deviceErr.message);
      console.log('[DEBUG] Enviando respuesta 200 (modo prueba) por error de dispositivo');
      return res.status(200).json({ 
        message: 'Impresora no detectada - modo prueba (ticket generado pero no impreso)',
        ticketText
      });
    }
  } catch (err) {
    console.error('[ERROR BACKEND] Error al imprimir corte actual:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Error interno al procesar el corte' });
    }
  }
};

/**
 * GET /cuts/print/:id
 * Imprime un corte específico por ID
 */
exports.printCorteById = async (req, res) => {
  try {
    console.log('[DEBUG] Iniciando printCorteById para ID:', req.params.id);

    const Cut = require('../models/Cut');
    const corte = await Cut.findById(req.params.id);
    if (!corte) {
      console.log('[DEBUG] Corte no encontrado para ID:', req.params.id);
      return res.status(404).json({ error: 'Corte no encontrado' });
    }

    const ticketData = {
      type: corte.type,
      caja: corte.cash_register || 'N/A',
      fecha: corte.date,
      desde: corte.desde,
      hasta: corte.hasta,
      firstTicket: corte.first_ticket || 'N/A',
      lastTicket: corte.last_ticket || 'N/A',
      totalVentas: corte.total_sales || 0,
      contado: corte.ventas.contado || 0,
      credito: corte.ventas.credito || 0,
      apartado: corte.ventas.apartado || 0,
      iva: corte.total_iva_gravado || 0,
      totalRecibido: corte.total_recibido || 0,
      anticipos: corte.total_anticipos || 0,
      abonos: corte.total_abonos || 0,
      efectivo: corte.pago_efectivo || 0,
      tarjeta: corte.pago_tarjeta || 0,
      transferencia: corte.pago_transferencia || 0,
      otros: corte.pago_otros || 0,
      cashInBox: corte.cash_in_box || 0,
    };

    // Usamos la función de utils que respeta TICKET_WIDTH
    const ticketText = buildTicketTextCorte(ticketData);

    console.log('[DEBUG] Ticket de corte por ID generado, intentando abrir impresora...');

    let responded = false;

    try {
      const device = new escpos.USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (responded) {
          console.log('[DEBUG] Callback open llamado de nuevo - ignorando');
          return;
        }

        responded = true;

        if (err) {
          console.warn('[WARN BACKEND] Impresora no detectada para corte por ID:', err.message);
          console.log('[DEBUG] Enviando respuesta 200 (modo prueba) para corte por ID');
          return res.status(200).json({ 
            message: 'Impresora no detectada - modo prueba (ticket generado pero no impreso)',
            ticketText
          });
        }

        console.log('[DEBUG] Impresora abierta correctamente, imprimiendo corte por ID...');
        ticketText.split('\n').forEach(line => printer.text(line));
        printer.cut().close();

        console.log('[DEBUG] Enviando respuesta éxito para corte por ID');
        res.json({ message: `Corte ${corte.type} impreso correctamente` });
      });
    } catch (deviceErr) {
      console.warn('[WARN BACKEND] Error al crear dispositivo USB para corte por ID:', deviceErr.message);
      console.log('[DEBUG] Enviando respuesta 200 (modo prueba) por error de dispositivo');
      return res.status(200).json({ 
        message: 'Impresora no detectada - modo prueba (ticket generado pero no impreso)',
        ticketText
      });
    }
  } catch (err) {
    console.error('[ERROR BACKEND] Error al imprimir corte por ID:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Error interno al procesar el corte' });
    }
  }
};