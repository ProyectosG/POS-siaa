const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const buildTicketData = require('../utils/buildTicketData');
const buildTicketText = require('../utils/buildTicketText');

// =======================
// TEXTO DE TICKET
// =======================
exports.getTicketText = async (req, res) => {
  try {
    const data = await buildTicketData(req.params.id);
    const ticketText = buildTicketText(data);
    res.json({ ticketText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =======================
// IMPRESIÓN ESC/POS
// =======================
exports.printById = async (req, res) => {
  try {
    const data = await buildTicketData(req.params.id);
    const ticketText = buildTicketText(data);

    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'No se pudo abrir la impresora' });
      }

      ticketText.split('\n').forEach(line => printer.text(line));
      printer.cut().close();

      res.json({ message: 'Ticket impreso correctamente' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
