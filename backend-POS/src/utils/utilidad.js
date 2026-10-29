// src/utils/utilidad.js
// Reporte de utilidad. Todo en centavos.
// - Cuenta las ventas por su fecha de venta (contado, apartado y crédito; lo
//   pendiente de apartados y créditos se informa aparte).
// - Venta sin IVA = subtotal del renglón (ya guardado sin IVA al vender).
// - Costo sin IVA = costo_unitario × cantidad; el costo se captura neto (con
//   IVA, como lo cobra el proveedor), así que si el renglón llevó IVA se le quita
//   igual que a la venta.
// - Un renglón sin costo_unitario (ventas anteriores al campo Costo, o producto
//   sin costo) no entra en el cálculo: se informa aparte. Nunca se usa el costo
//   actual del catálogo.
const { ahoraNegocio } = require('./fechas');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Día de la semana (0 = domingo) de una fecha AAAA-MM-DD
const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

// Restar días a una fecha AAAA-MM-DD (sin depender de la zona del servidor)
function restarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

// Rango del periodo en la zona del negocio: hoy; semana = lunes a hoy; mes = mes en curso
function rangoPeriodo(periodo, hoy = ahoraNegocio().date) {
  if (periodo === 'hoy') return { desde: hoy, hasta: hoy };
  if (periodo === 'semana') return { desde: restarDias(hoy, (diaSemana(hoy) + 6) % 7), hasta: hoy };
  if (periodo === 'mes') return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
  return null;
}

// Costo sin IVA de un renglón (centavos)
function costoSinIva(costoUnitario, cantidad, tasaIva) {
  const neto = costoUnitario * cantidad;
  const tasa = Number(tasaIva) || 0;
  return tasa > 0 ? Math.round((neto * 100) / (100 + tasa)) : neto;
}

// Margen sobre la venta sin IVA, en % con un decimal (null si no hubo venta)
const margen = (utilidad, venta) => (venta > 0 ? Math.round((utilidad * 1000) / venta) / 10 : null);

// ventas: [{ id, date, type, pending_balance, sale_details: [{ product_id, articulo,
// quantity, subtotal, tax_amount, tax_rate, costo_unitario }] }] con montos en centavos
function calcularUtilidad(ventas) {
  const total = { ventas: 0, venta_sin_iva: 0, costo: 0, utilidad: 0 };
  const sinCosto = { renglones: 0, ventas: 0, venta_sin_iva: 0, importe: 0 };
  const pendiente = { ventas: 0, monto: 0 };
  const porProducto = new Map();
  const porDia = new Map();

  for (const v of ventas) {
    const tipo = String(v.type || '').toLowerCase();
    if ((tipo === 'apartado' || tipo === 'credito') && v.pending_balance > 0) {
      pendiente.ventas++;
      pendiente.monto += v.pending_balance;
    }

    let conCosto = false;
    let faltaCosto = false;
    for (const d of v.sale_details) {
      if (d.costo_unitario === null || d.costo_unitario === undefined) {
        faltaCosto = true;
        sinCosto.renglones++;
        sinCosto.venta_sin_iva += d.subtotal;
        sinCosto.importe += d.subtotal + (d.tax_amount || 0);
        continue;
      }
      conCosto = true;
      const costo = costoSinIva(d.costo_unitario, d.quantity, d.tax_rate);
      const utilidad = d.subtotal - costo;

      total.venta_sin_iva += d.subtotal;
      total.costo += costo;
      total.utilidad += utilidad;

      const p = porProducto.get(d.product_id) || {
        product_id: d.product_id, articulo: d.articulo, cantidad: 0, venta_sin_iva: 0, costo: 0, utilidad: 0,
      };
      p.cantidad += d.quantity;
      p.venta_sin_iva += d.subtotal;
      p.costo += costo;
      p.utilidad += utilidad;
      porProducto.set(d.product_id, p);

      const dia = porDia.get(v.date) || { fecha: v.date, ventas: new Set(), venta_sin_iva: 0, costo: 0, utilidad: 0 };
      dia.ventas.add(v.id);
      dia.venta_sin_iva += d.subtotal;
      dia.costo += costo;
      dia.utilidad += utilidad;
      porDia.set(v.date, dia);
    }
    if (conCosto) total.ventas++;
    if (faltaCosto) sinCosto.ventas++;
  }

  return {
    totales: { ...total, margen: margen(total.utilidad, total.venta_sin_iva) },
    productos: [...porProducto.values()]
      .map((p) => ({ ...p, margen: margen(p.utilidad, p.venta_sin_iva) }))
      .sort((a, b) => b.utilidad - a.utilidad),
    dias: [...porDia.values()]
      .map(({ ventas: ids, ...d }) => ({ ...d, ventas: ids.size, margen: margen(d.utilidad, d.venta_sin_iva) }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    sin_costo: sinCosto,
    pendiente,
  };
}

module.exports = { FECHA, rangoPeriodo, costoSinIva, calcularUtilidad };
