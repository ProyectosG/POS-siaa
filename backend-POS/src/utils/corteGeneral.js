// src/utils/corteGeneral.js
// Corte X General (XG) y Corte Z General (ZG): la suma de los cortes individuales
// ya guardados. No cierran ninguna caja. Regla de oro: SUMAN columnas guardadas en
// centavos enteros; nunca recalculan IVA ni totales sobre el total. Toda
// comparación se hace aquí, en centavos.
const { aPesos, camposAPesos } = require('./dinero');
const { COLUMNAS_CORTE, sumarRango, columnasDeCorte, corteAnterior, calcularCorte } = require('./cortes');

const TIPO_GENERAL = { X: 'XG', Z: 'ZG' };
const TIPOS_GENERALES = ['XG', 'ZG'];
const esGeneral = (corte) => TIPOS_GENERALES.includes(corte?.type);

const centavos = (v) => Math.round(Number(v) || 0);

// $1,250.00 (para los textos que arma el servidor)
const conFormato = (c) => `$${(centavos(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Número de caja para ordenar: 1, 2, 10 (no 1, 10, 2)
const ordenCaja = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });

async function numerosDeCaja(c) {
  const filas = await c.cash_registers.findMany({ select: { numero_caja: true } });
  return filas.map((f) => f.numero_caja);
}

function sumarColumnas(cortes) {
  const suma = Object.fromEntries(COLUMNAS_CORTE.map((col) => [col, 0]));
  for (const corte of cortes) {
    for (const col of COLUMNAS_CORTE) suma[col] += centavos(corte[col]);
  }
  return suma;
}

// Z con caja y aún sin consolidar. Los viejos sin caja (o marcados con 0 por la
// migración) no entran.
const zPorConsolidar = (c) => c.cuts.findMany({
  where: { type: 'Z', corte_general_id: null, NOT: [{ cash_register: null }, { cash_register: '' }] },
  orderBy: { id: 'asc' },
});

// Qué cortes incluye un general:
// ZG: los Z sin consolidar.
// XG: además, por caja, sus X guardados DESPUÉS de su último Z. Los anteriores a
//     ese Z no, porque el Z ya los incluye.
async function cortesIncluidos(c, tipo) {
  const zetas = await zPorConsolidar(c);
  if (tipo === 'Z') return zetas;

  const equis = [];
  for (const caja of await numerosDeCaja(c)) {
    const ultimoZ = await corteAnterior(c, 'Z', caja);
    equis.push(...await c.cuts.findMany({
      where: { type: 'X', cash_register: caja, corte_general_id: null, id: { gt: ultimoZ?.id ?? 0 } },
    }));
  }
  return [...zetas, ...equis].sort((a, b) => a.id - b.id);
}

// Una fila por caja, incluidas las de cero. El rango de folios es por caja: los
// folios no son consecutivos entre cajas.
function filasPorCaja(cortes, numeros) {
  const todas = [...new Set([...numeros, ...cortes.map((k) => k.cash_register)])].sort(ordenCaja);
  return todas.map((caja) => {
    const suyos = cortes.filter((k) => k.cash_register === caja);
    const conTickets = suyos.filter((k) => k.first_ticket != null);
    return {
      caja,
      cortes: suyos.length,
      primer_ticket: conTickets.length ? Math.min(...conTickets.map((k) => k.first_ticket)) : null,
      ultimo_ticket: conTickets.length ? Math.max(...conTickets.map((k) => k.last_ticket)) : null,
      ...sumarColumnas(suyos),
    };
  });
}

// Vuelve a sumar de sales y payments lo que cubrió cada corte, filtrando por caja.
// Devuelve las diferencias, columna por columna (vacío = cuadra al centavo).
async function verificarContraOrigen(c, cortes) {
  const diferencias = [];
  for (const corte of cortes) {
    const anterior = await corteAnterior(c, corte.type, corte.cash_register, corte.id);
    const sumas = await sumarRango(c, corte.cash_register, {
      ticketDesde: anterior?.last_ticket ?? 0,
      ticketHasta: corte.last_ticket ?? 0,
      pagoDesde: anterior?.last_payment_id ?? 0,
      pagoHasta: corte.last_payment_id ?? 0,
    });
    const calculado = columnasDeCorte(sumas);
    for (const col of COLUMNAS_CORTE) {
      const guardado = centavos(corte[col]);
      if (guardado !== calculado[col]) {
        diferencias.push({
          corte_id: corte.id,
          caja: corte.cash_register,
          columna: col,
          guardado_centavos: guardado,
          calculado_centavos: calculado[col],
          diferencia_centavos: calculado[col] - guardado,
        });
      }
    }
  }
  return diferencias;
}

// Lo que cada caja tiene sin cortar en este momento: solo para mostrar. No se suma
// al general ni participa en la verificación.
async function quedaFuera(c, tipo, numeros) {
  const fuera = [];
  for (const caja of [...numeros].sort(ordenCaja)) {
    const corte = await calcularCorte(c, tipo, caja);
    if (corte.vacio) continue;
    const ventas = corte.ventas.total_ventas_monto;
    const recibido = corte.total_recibido;
    const cuanto = ventas === recibido || recibido === 0 || ventas === 0
      ? conFormato(ventas || recibido)
      : `${conFormato(ventas)} en ventas y ${conFormato(recibido)} recibidos`;
    fuera.push({
      caja,
      ventas: aPesos(ventas),
      recibido: aPesos(recibido),
      texto: `Caja ${caja}: sin corte, ${cuanto} quedan fuera (entran en el siguiente)`,
    });
  }
  return fuera;
}

// Calcula el general en curso, en centavos
async function armarGeneral(c, tipo) {
  const incluidos = await cortesIncluidos(c, tipo);
  const numeros = await numerosDeCaja(c);
  const diferencias = await verificarContraOrigen(c, incluidos);
  return {
    tipo,
    incluidos,
    columnas: sumarColumnas(incluidos),
    porCaja: filasPorCaja(incluidos, numeros),
    fuera: await quedaFuera(c, tipo, numeros),
    diferencias,
    diferencia_centavos: diferencias.reduce((s, d) => s + Math.abs(d.diferencia_centavos), 0),
    cuadra: diferencias.length === 0,
  };
}

// Desglose de un general ya guardado: sale de corte_general_cortes y de los montos
// guardados. No vuelve a calcular nada. Las cajas sin cortes incluidos salen en cero.
async function desgloseGuardado(c, generalId) {
  const ligas = await c.corte_general_cortes.findMany({ where: { general_id: generalId }, select: { corte_id: true } });
  const cortes = await c.cuts.findMany({ where: { id: { in: ligas.map((l) => l.corte_id) } } });
  return filasPorCaja(cortes, await numerosDeCaja(c));
}

// Fila por caja, en pesos, para el API y los tickets
const filaEnPesos = (f) => ({
  caja: f.caja,
  cortes: f.cortes,
  primer_ticket: f.primer_ticket,
  ultimo_ticket: f.ultimo_ticket,
  ventas: aPesos(f.total_sales),
  iva: aPesos(f.total_iva_gravado),
  recibido: aPesos(f.total_recibido),
  efectivo: aPesos(f.pago_efectivo),
  tarjeta: aPesos(f.pago_tarjeta),
  transferencia: aPesos(f.pago_transferencia),
  otros: aPesos(f.pago_otros),
});

// Fila final de total: suma en centavos (no se suman pesos con decimales)
function totalEnPesos(filas) {
  return filaEnPesos({ caja: 'Total', cortes: filas.reduce((s, f) => s + f.cortes, 0), primer_ticket: null, ultimo_ticket: null, ...sumarColumnas(filas) });
}

// Respuesta del general en curso (en pesos), con el formato del corte de siempre
function respuestaGeneral(g) {
  const k = g.columnas;
  return {
    tipo: g.tipo,
    alcance: 'general',
    incluidos: g.incluidos.length,
    ventas: camposAPesos({
      total_ventas_monto: k.total_sales,
      ventas_contado: k.ventas_contado,
      ventas_credito: k.ventas_credito,
      ventas_apartado: k.ventas_apartado,
      total_iva_gravado: k.total_iva_gravado,
    }, ['total_ventas_monto', 'ventas_contado', 'ventas_credito', 'ventas_apartado', 'total_iva_gravado']),
    pagos: {
      efectivo: aPesos(k.pago_efectivo),
      tarjeta: aPesos(k.pago_tarjeta),
      transferencia: aPesos(k.pago_transferencia),
      otros: aPesos(k.pago_otros),
    },
    total_recibido: aPesos(k.total_recibido),
    total_anticipos: aPesos(k.total_anticipos),
    total_abonos: aPesos(k.total_abonos),
    cash_in_box: aPesos(k.cash_in_box),
    ticketRange: { first_ticket: null, last_ticket: null },
    por_caja: g.porCaja.map(filaEnPesos),
    total_por_caja: totalEnPesos(g.porCaja),
    fuera: g.fuera,
    cuadra: g.cuadra,
    diferencia_centavos: g.diferencia_centavos,
    diferencias: g.diferencias,
  };
}

module.exports = {
  TIPO_GENERAL, TIPOS_GENERALES, esGeneral, conFormato,
  armarGeneral, desgloseGuardado, respuestaGeneral, filaEnPesos, totalEnPesos,
};
