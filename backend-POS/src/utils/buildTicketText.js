// utils/buildTicketText.js
// Texto del ticket de venta. Cabe en el ancho de Configuración (32 caracteres
// en 57/58 mm, 48 en 80 mm): ningún renglón pasa del ancho y todos los montos
// quedan alineados a la derecha. Lleva el encabezado y el pie del negocio.

const { columnas, partir, centrar, renglonMonto } = require('./ticketConfig');

module.exports = function buildTicketText({
  sale,
  customer,
  details,
  payments,
  config = {},
}) {
  const ancho = config.ancho || columnas(58);
  const separador = '-'.repeat(ancho);
  const doble = '='.repeat(ancho);
  const lineas = [];
  const agregar = (...renglones) => lineas.push(...renglones.flat());

  // =====================================================
  // ENCABEZADO DEL NEGOCIO (Configuración) Y DE LA VENTA
  // =====================================================
  for (const texto of config.encabezado || []) agregar(centrar(texto, ancho));
  for (const texto of config.subencabezado || []) agregar(centrar(texto, ancho));
  agregar(doble);
  agregar(centrar(`TICKET DE VENTA ${String(sale.type || '').toUpperCase()}`, ancho));
  agregar(doble, '');
  agregar(`Folio: ${sale.id}`);
  const fechaHora = `Fecha: ${sale.date}   Hora: ${sale.time}`;
  if (fechaHora.length <= ancho) agregar(fechaHora);
  else agregar(`Fecha: ${sale.date}`, `Hora: ${sale.time}`);
  agregar(partir(`Cajero: ${sale.nickname_user || '—'}`, ancho), '');

  // =====================================================
  // CLIENTE
  // =====================================================
  if (customer) {
    const clienteNombre = `${customer.first_name || ''} ${customer.last_name_paternal || ''} ${customer.last_name_maternal || ''}`.trim();
    agregar(partir(`Cliente: ${clienteNombre}`, ancho));
    agregar(`Tel: ${customer.phone || '—'}`, '');
  }

  // =====================================================
  // PRODUCTOS: cantidad, artículo (recortado) e importe
  // =====================================================
  const anchoCant = ancho >= 48 ? 4 : 3;
  const anchoImporte = ancho >= 48 ? 10 : 9; // con el $: hasta 999999.99 / 9999999.99
  const anchoNombre = ancho - anchoCant - anchoImporte - 2;

  agregar(separador);
  agregar(`${(anchoCant >= 4 ? 'Cant' : 'Cnt').padEnd(anchoCant)} ${'Artículo'.padEnd(anchoNombre)} ${'Importe'.padStart(anchoImporte)}`);
  agregar(separador);
  details.forEach((d) => {
    const qty = String(Number(d.quantity || 1)).slice(0, anchoCant).padStart(anchoCant);
    const name = String(d.articulo || 'ARTÍCULO').slice(0, anchoNombre).padEnd(anchoNombre);
    const importe = `$${Number(d.subtotal || 0).toFixed(2)}`;
    if (importe.length <= anchoImporte) agregar(`${qty} ${name} ${importe.padStart(anchoImporte)}`);
    else agregar(`${qty} ${name.trimEnd()}`, importe.padStart(ancho)); // importe muy grande: renglón aparte
  });

  // =====================================================
  // TOTALES
  // =====================================================
  agregar(separador);
  agregar(renglonMonto('Subtotal:', sale.subtotal, ancho));
  agregar(renglonMonto('IVA 16%:', sale.tax_total, ancho));
  agregar(renglonMonto('Total:', sale.total, ancho));
  agregar('');

  // ANTICIPO: lo que realmente se pagó como anticipo (apartado y crédito; en crédito puede ser 0)
  if (sale.type === 'apartado' || sale.type === 'credito') {
    const anticipo = payments
      .filter((p) => p.payment_type === 'anticipo')
      .reduce((suma, p) => suma + Number(p.amount || 0), 0);
    agregar(renglonMonto('ANTICIPO:', anticipo, ancho), '');
  }

  // =====================================================
  // PAGOS
  // =====================================================
  agregar('Pagos:');
  payments.forEach((p) => {
    const metodo = p.method === 'efectivo' ? 'Efectivo'
      : p.method === 'transferencia' ? 'Transferencia'
      : `Tarjeta ${p.bank || ''}`.trim();
    agregar(renglonMonto(`- ${metodo}`, p.amount, ancho));
  });
  agregar('');

  agregar(renglonMonto('Total pagado:', sale.paid, ancho));
  agregar(renglonMonto('Saldo pendiente:', sale.pending_balance, ancho));
  agregar('');

  // Crédito (fiado): el cliente firma de recibido
  if (sale.type === 'credito') {
    agregar('Firma del cliente:', '', '', '_'.repeat(ancho), '');
  }

  // =====================================================
  // PIE
  // =====================================================
  agregar(centrar('¡Gracias por su compra!', ancho));
  for (const texto of config.pie || []) agregar(centrar(texto, ancho));
  agregar(doble);

  return lineas.join('\n') + '\n';
};
