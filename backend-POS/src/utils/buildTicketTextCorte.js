// src/utils/buildTicketTextCorte.js
// Texto del ticket de corte. Cabe en el ancho de Configuración (32 caracteres
// en 57/58 mm, 48 en 80 mm): etiquetas a la izquierda y montos a la derecha.
const { columnas, partir, centrar, renglonMonto } = require('./ticketConfig');

// Función principal para generar texto del ticket de corte.
// Opcionales: numero (corte guardado), usuario (quien hizo el corte) y
// reimpresion { fecha, usuario } para marcar una copia de un corte viejo.
// `ancho`: caracteres por línea (de leerConfigTicket); sin él, 58 mm.
function buildTicketTextCorte(data, ancho = columnas(58)) {
  const lines = [];
  const agregar = (...renglones) => lines.push(...renglones.flat());
  const divider = '-'.repeat(ancho);
  const seccion = (titulo) => agregar(titulo, divider);
  const monto = (etiqueta, valor) => agregar(renglonMonto(etiqueta, valor, ancho));

  // El general ya dice "CORTE X GENERAL": no lleva "DE CAJA"
  agregar(centrar(data.general ? data.type : `${data.type} DE CAJA`, ancho));
  if (data.reimpresion) agregar(centrar('*** REIMPRESIÓN ***', ancho));
  agregar(divider);
  if (data.numero) agregar(`Corte #${data.numero}`);
  agregar(partir(`Caja: ${data.caja}`, ancho));
  if (data.usuario) agregar(partir(`Usuario: ${data.usuario}`, ancho));
  agregar(`Fecha: ${data.fecha}`);
  // Los folios no son consecutivos entre cajas: el general los muestra por caja
  if (!data.general) {
    const desdeHasta = `Desde: ${data.desde}   Hasta: ${data.hasta}`;
    agregar(desdeHasta.length <= ancho ? desdeHasta : partir(desdeHasta, ancho));
    agregar(partir(`Tickets: ${data.firstTicket} al ${data.lastTicket}`, ancho));
  }
  agregar(divider);

  seccion('VENTAS TOTALES');
  monto('Total Ventas:', data.totalVentas);
  monto('Contado:', data.contado);
  monto('Crédito:', data.credito);
  monto('Apartado:', data.apartado);
  monto('IVA Gravado:', data.iva);
  agregar(divider);

  seccion('DINERO RECIBIDO');
  monto('Total Recibido:', data.totalRecibido);
  monto('Anticipos:', data.anticipos);
  monto('Abonos:', data.abonos);
  agregar(divider);

  seccion('FORMAS DE PAGO');
  monto('Efectivo:', data.efectivo);
  monto('Tarjeta:', data.tarjeta);
  monto('Transferencia:', data.transferencia);
  monto('Otros:', data.otros);
  agregar(divider);

  monto('EFECTIVO EN CAJA:', data.cashInBox);
  agregar(divider);

  if (data.porCaja) {
    seccion('DESGLOSE POR CAJA');
    for (const f of data.porCaja) {
      agregar(partir(f.primer_ticket == null ? `Caja ${f.caja}` : `Caja ${f.caja} - tickets ${f.primer_ticket} al ${f.ultimo_ticket}`, ancho));
      monto(' Ventas:', f.ventas);
      monto(' IVA:', f.iva);
      monto(' Recibido:', f.recibido);
      monto(' Efectivo:', f.efectivo);
      monto(' Tarjeta:', f.tarjeta);
      monto(' Transferencia:', f.transferencia);
      monto(' Otros:', f.otros);
    }
    agregar(divider);
  }

  // Solo en el ticket del momento: la reimpresión usa lo guardado y no los calcula
  if (data.cuadra !== undefined) {
    agregar(partir(data.cuadra ? 'Cuadra con ventas y pagos' : `NO CUADRA: diferencia de ${data.diferencia}`, ancho));
    agregar(divider);
  }
  if (data.fuera && data.fuera.length) {
    seccion('FUERA DE ESTE CORTE');
    for (const f of data.fuera) agregar(partir(f.texto, ancho));
    agregar(divider);
  }

  if (data.reimpresion) {
    agregar(`Reimpreso: ${data.reimpresion.fecha}`);
    agregar(partir(`Por: ${data.reimpresion.usuario}`, ancho));
    agregar(divider);
  }

  agregar(centrar('¡Gracias por tu turno!', ancho));
  agregar(divider);

  return lines.join('\n');
}

module.exports = buildTicketTextCorte;
