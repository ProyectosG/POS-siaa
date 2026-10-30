// src/utils/buildTicketTextCorte.js
const TICKET_WIDTH = process.env.TICKET_WIDTH || '80'; // 80 o 58
const CHARS_PER_LINE = TICKET_WIDTH === '80' ? 48 : 32; // caracteres por línea

// Función auxiliar para centrar texto
function centerText(text) {
  const padding = Math.max(0, CHARS_PER_LINE - text.length);
  const leftPad = Math.floor(padding / 2);
  return ' '.repeat(leftPad) + text;
}

// Función auxiliar para línea divisoria
function divider() {
  return '-'.repeat(CHARS_PER_LINE);
}

// Función principal para generar texto del ticket de corte.
// Opcionales: numero (corte guardado), usuario (quien hizo el corte) y
// reimpresion { fecha, usuario } para marcar una copia de un corte viejo.
function buildTicketTextCorte(data) {
  const lines = [];

  lines.push(centerText(`${data.type} DE CAJA`));
  if (data.reimpresion) lines.push(centerText('*** REIMPRESIÓN ***'));
  lines.push(divider());
  if (data.numero) lines.push(`Corte #${data.numero}`);
  lines.push(`Caja: ${data.caja}`);
  if (data.usuario) lines.push(`Usuario: ${data.usuario}`);
  lines.push(`Fecha: ${data.fecha}`);
  lines.push(`Desde: ${data.desde}   Hasta: ${data.hasta}`);
  lines.push(`Tickets: ${data.firstTicket} al ${data.lastTicket}`);
  lines.push(divider());

  lines.push('VENTAS TOTALES');
  lines.push(divider());
  lines.push(`Total Ventas:    $${data.totalVentas.toFixed(2)}`);
  lines.push(`Contado:         $${data.contado.toFixed(2)}`);
  lines.push(`Crédito:         $${data.credito.toFixed(2)}`);
  lines.push(`Apartado:        $${data.apartado.toFixed(2)}`);
  lines.push(`IVA Gravado:     $${data.iva.toFixed(2)}`);
  lines.push(divider());

  lines.push('DINERO RECIBIDO');
  lines.push(divider());
  lines.push(`Total Recibido:  $${data.totalRecibido.toFixed(2)}`);
  lines.push(`Anticipos:       $${data.anticipos.toFixed(2)}`);
  lines.push(`Abonos:          $${data.abonos.toFixed(2)}`);
  lines.push(divider());

  lines.push('FORMAS DE PAGO');
  lines.push(divider());
  lines.push(`Efectivo:        $${data.efectivo.toFixed(2)}`);
  lines.push(`Tarjeta:         $${data.tarjeta.toFixed(2)}`);
  lines.push(`Transferencia:   $${data.transferencia.toFixed(2)}`);
  lines.push(`Otros:           $${data.otros.toFixed(2)}`);
  lines.push(divider());

  lines.push(`EFECTIVO EN CAJA: $${data.cashInBox.toFixed(2)}`);
  lines.push(divider());

  if (data.reimpresion) {
    lines.push(`Reimpreso: ${data.reimpresion.fecha}`);
    lines.push(`Por: ${data.reimpresion.usuario}`);
    lines.push(divider());
  }

  // Sin emojis: la impresora térmica no los tiene y los imprime como basura
  lines.push(centerText('¡Gracias por tu turno! Sigue rockeándola'));
  lines.push(divider());

  return lines.join('\n');
}

module.exports = buildTicketTextCorte;
