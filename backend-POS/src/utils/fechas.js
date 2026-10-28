// src/utils/fechas.js
// Una sola zona horaria para todo el negocio. El servidor pone la fecha y hora
// de cada movimiento; nunca se usan las que manda el navegador.
// TZ_NEGOCIO en .env la cambia (por omisión, la del centro de México).

const ZONA_POR_OMISION = 'America/Mexico_City';

function zonaNegocio() {
  const zona = process.env.TZ_NEGOCIO || ZONA_POR_OMISION;
  try {
    new Intl.DateTimeFormat('es-MX', { timeZone: zona });
    return zona;
  } catch {
    throw new Error(`TZ_NEGOCIO no es una zona horaria válida: ${zona}`);
  }
}

// { date: 'YYYY-MM-DD', time: 'HH:MM:SS' } en la zona del negocio
function ahoraNegocio(instante = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaNegocio(),
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instante);

  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
}

module.exports = { zonaNegocio, ahoraNegocio };
