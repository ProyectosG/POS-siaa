// src/utils/dinero.js
// El dinero se guarda en la base en CENTAVOS ENTEROS (1500 = $15.00).
// El API sigue hablando en pesos: se convierte al entrar (aCentavos) y al salir (aPesos).
// Todas las cuentas de dinero se hacen en centavos, nunca con decimales.

// Columnas de dinero por tabla. Si se agrega una columna de dinero, va aquí.
const CAMPOS_DINERO = {
  products: ['precio_menudeo', 'precio_mayoreo', 'precio_especial', 'precio_oferta', 'costo'],
  customers: ['current_balance'],
  sales: ['subtotal', 'tax_total', 'discount_total', 'total', 'paid', 'pending_balance', 'efectivo_recibido', 'cambio'],
  sale_details: ['base_price', 'price', 'discount_amount', 'subtotal', 'tax_amount', 'costo_unitario'],
  payments: ['amount'],
  cuts: [
    'total_sales', 'ventas_contado', 'ventas_credito', 'ventas_apartado', 'total_iva_gravado',
    'total_recibido', 'total_anticipos', 'total_abonos',
    'pago_efectivo', 'pago_tarjeta', 'pago_transferencia', 'pago_otros', 'cash_in_box',
  ],
  customer_balance_history: ['previous_balance', 'amount', 'new_balance'],
};

// Pesos (número o texto) → centavos enteros. Vacío o inválido → null.
function aCentavos(pesos) {
  if (pesos === null || pesos === undefined || pesos === '') return null;
  const n = Number(pesos);
  if (!Number.isFinite(n)) return null;
  // toFixed corrige errores como 1.005 * 100 = 100.49999...
  return Math.round(Number((n * 100).toFixed(4)));
}

// Centavos enteros → pesos (número). null se queda null.
function aPesos(centavos) {
  if (centavos === null || centavos === undefined) return centavos;
  return Math.round(Number(centavos)) / 100;
}

// Copia de una fila con sus columnas de dinero convertidas a pesos
function filaAPesos(fila, tabla) {
  if (!fila) return fila;
  const copia = { ...fila };
  for (const campo of CAMPOS_DINERO[tabla]) {
    if (campo in copia) copia[campo] = aPesos(copia[campo]);
  }
  return copia;
}

const filasAPesos = (filas, tabla) => (filas || []).map((f) => filaAPesos(f, tabla));

// Convierte a pesos solo los campos indicados (para SUM y alias de consultas)
function camposAPesos(objeto, campos) {
  if (!objeto) return objeto;
  const copia = { ...objeto };
  for (const campo of campos) {
    if (campo in copia) copia[campo] = aPesos(copia[campo]);
  }
  return copia;
}

module.exports = { CAMPOS_DINERO, aCentavos, aPesos, filaAPesos, filasAPesos, camposAPesos };
