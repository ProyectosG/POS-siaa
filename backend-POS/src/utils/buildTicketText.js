// utils/buildTicketText.js
// Versión FINAL: Todas las cantidades (incluyendo Anticipo, Total pagado y Saldo pendiente)
// alineadas exactamente igual que Subtotal, IVA y Total

const buildTicketConfig = require('./ticketConfig');

module.exports = function buildTicketText({
  sale,
  customer,
  details,
  payments,
}) {
  const cfg = buildTicketConfig();
  const { lineWidth, qty: qtyWidth, name: nameWidth, amount: amountWidth } = cfg;
  let t = '';

  // =====================================================
  // ENCABEZADO
  // =====================================================
  t += `${cfg.header}\n`;
  t += `     TICKET DE VENTA ${String(sale.type || '').toUpperCase()}\n`;
  t += `${cfg.header}\n\n`;
  t += `Folio: ${sale.id}\n`;
  t += `Fecha: ${sale.date}   Hora: ${sale.time}\n`;
  t += `Cajero: ${sale.nickname_user || '—'}\n\n`;

  // =====================================================
  // CLIENTE
  // =====================================================
  if (customer) {
    const clienteNombre = `${customer.first_name || ''} ${customer.last_name_paternal || ''} ${customer.last_name_maternal || ''}`.trim();
    t += `Cliente: ${clienteNombre}\n`;
    t += `Tel: ${customer.phone || '—'}\n\n`;
  }

  // =====================================================
  // PRODUCTOS
  // =====================================================
  t += `${cfg.separator}\n`;
  t += `Cant ${'Artículo'.padEnd(nameWidth)} Importe\n`;
  t += `${cfg.separator}\n`;

  details.forEach((d) => {
    const qty = String(Number(d.quantity || 1)).padStart(qtyWidth);
    const name = String(d.articulo || 'ARTÍCULO').slice(0, nameWidth).padEnd(nameWidth);
    const importe = Number(d.subtotal || 0).toFixed(2).padStart(amountWidth);

    t += `${qty} ${name} $${importe}\n`;
  });

  // =====================================================
  // TOTALES - Función de alineación perfecta (usada en TODAS las líneas de cantidades)
  // =====================================================
  t += `${cfg.separator}\n`;

  const printRightAligned = (label, value) => {
    const valStr = Number(value).toFixed(2);
    const paddedValue = valStr.padStart(amountWidth);
    const spaces = ' '.repeat(lineWidth - label.length - paddedValue.length - 1); // -1 por el $
    return `${label}${spaces}$${paddedValue}\n`;
  };

  t += printRightAligned('Subtotal:', sale.subtotal || 0);
  t += printRightAligned('IVA 16%:', sale.tax_total || 0);
  t += printRightAligned('Total:', sale.total || 0);
  t += '\n';

  // ANTICIPO (ahora usa la misma alineación)
  if (sale.type === 'apartado') {
    const anticipo = (Number(sale.total || 0) * 0.3).toFixed(2);
    t += printRightAligned('ANTICIPO (30%):', anticipo);
    t += '\n';
  }

  // =====================================================
  // PAGOS (se mantienen como antes, a la izquierda)
  // =====================================================
  t += 'Pagos:\n';
  payments.forEach((p) => {
    let metodo = p.method === 'efectivo' ? 'Efectivo' : `Tarjeta ${p.bank || ''}`.slice(0, 15);
    metodo = metodo.padEnd(18);
    const monto = Number(p.amount || 0).toFixed(2).padStart(amountWidth);
    t += `- ${metodo} $${monto}\n`;
  });
  t += '\n';

  // CIERRE - También alineados con la misma función
  t += printRightAligned('Total pagado:', sale.paid || 0);
  t += printRightAligned('Saldo pendiente:', sale.pending_balance || 0);
  t += '\n';
  t += '¡Gracias por su compra!\n';
  t += `${cfg.header}\n`;

  return t;
};