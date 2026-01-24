// utils/ticketConfig.js
// Decide el ancho del ticket según el papel configurado en .env

const PAPER_WIDTH = Number(process.env.TICKET_PAPER_WIDTH || 80);

// Configuración por tipo de papel
const CONFIGS = {
  58: {
    lineWidth: 32,
    qty: 3,
    name: 18,
    amount: 7,
    separator: '-'.repeat(32),
    header: '='.repeat(32),
  },
  80: {
    lineWidth: 42,
    qty: 4,
    name: 30,
    amount: 7,
    separator: '-'.repeat(42),
    header: '='.repeat(42),
  },
};

module.exports = function buildTicketConfig() {
  return CONFIGS[PAPER_WIDTH] || CONFIGS[80];
};
