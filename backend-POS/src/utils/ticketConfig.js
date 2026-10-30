// utils/ticketConfig.js
// Ancho del ticket y ayudantes de formato, comunes a la venta y al corte.
// El ancho sale de Configuración (settings.ticket_width: 57, 58 u 80 mm);
// sin dato, 58 mm. Ninguna línea del ticket pasa del ancho.
const { prisma } = require('../config/prisma');

const MM_POR_OMISION = 58;

// Caracteres por línea según el papel (fuente normal de las impresoras ESC/POS)
function columnas(mm) {
  return Number(mm) === 80 ? 48 : 32;
}

// Configuración de impresión vigente: ancho y textos del negocio
async function leerConfigTicket() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } }).catch(() => null);
  const mm = [57, 58, 80].includes(Number(s?.ticket_width)) ? Number(s.ticket_width) : MM_POR_OMISION;
  const lineas = (prefijo, n) =>
    Array.from({ length: n }, (_, i) => String(s?.[`${prefijo}${i + 1}`] || '').trim()).filter(Boolean);
  return {
    mm,
    ancho: columnas(mm),
    encabezado: lineas('ticket_header_line', 4),
    subencabezado: lineas('ticket_subheader_line', 4),
    pie: lineas('ticket_footer_line', 2),
  };
}

// Parte un texto en renglones de `ancho` (por palabras; una palabra más larga se corta)
function partir(texto, ancho) {
  const renglones = [];
  let actual = '';
  for (let palabra of String(texto).split(/\s+/).filter(Boolean)) {
    while (palabra.length > ancho) {
      if (actual) { renglones.push(actual); actual = ''; }
      renglones.push(palabra.slice(0, ancho));
      palabra = palabra.slice(ancho);
    }
    if (!palabra) continue;
    if (!actual) actual = palabra;
    else if (actual.length + 1 + palabra.length <= ancho) actual += ` ${palabra}`;
    else { renglones.push(actual); actual = palabra; }
  }
  if (actual) renglones.push(actual);
  return renglones.length ? renglones : [''];
}

// Centrado (si no cabe, se parte en varios renglones centrados)
function centrar(texto, ancho) {
  return partir(texto, ancho).map((r) => ' '.repeat(Math.floor((ancho - r.length) / 2)) + r);
}

// Etiqueta a la izquierda y monto a la derecha; si no caben juntos, el monto
// va en el renglón siguiente, también a la derecha
function renglonMonto(etiqueta, valor, ancho) {
  const monto = `$${Number(valor || 0).toFixed(2)}`;
  if (etiqueta.length + 1 + monto.length <= ancho) {
    return [etiqueta + ' '.repeat(ancho - etiqueta.length - monto.length) + monto];
  }
  return [...partir(etiqueta, ancho), monto.padStart(ancho)];
}

// Texto para la impresora: sin acentos ni signos que la impresora no tenga
// (la vista previa en pantalla los conserva)
function sinAcentos(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¡¿]/g, '')
    .replace(/[—–]/g, '-')
    .replace(/[^\x0A\x20-\x7E]/g, '?');
}

module.exports = { MM_POR_OMISION, columnas, leerConfigTicket, partir, centrar, renglonMonto, sinAcentos };
