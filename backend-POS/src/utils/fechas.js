// src/utils/fechas.js
// Una sola zona horaria para todo el negocio. El servidor pone la fecha y hora
// de cada movimiento; nunca se usan las que manda el navegador.
// TZ_NEGOCIO en .env la cambia (por omisión, la del centro de México).

const ZONA_POR_OMISION = 'America/Mexico_City';

const zonasValidas = new Set();

function zonaNegocio() {
  const zona = process.env.TZ_NEGOCIO || ZONA_POR_OMISION;
  if (zonasValidas.has(zona)) return zona;
  try {
    new Intl.DateTimeFormat('es-MX', { timeZone: zona });
    zonasValidas.add(zona);
    return zona;
  } catch {
    throw new Error(`TZ_NEGOCIO no es una zona horaria válida: ${zona}`);
  }
}

// Crear un Intl.DateTimeFormat es caro (medido en la prueba de carga): se
// guarda uno por zona
const formatos = new Map();
function formatoDe(zona) {
  if (!formatos.has(zona)) {
    formatos.set(zona, new Intl.DateTimeFormat('en-CA', {
      timeZone: zona,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }));
  }
  return formatos.get(zona);
}

// { date: 'YYYY-MM-DD', time: 'HH:MM:SS' } en la zona del negocio
function ahoraNegocio(instante = new Date()) {
  const partes = formatoDe(zonaNegocio()).formatToParts(instante);

  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
}

// 'AAAA-MM-DD HH:MM:SS' en UTC: el mismo texto que pone CURRENT_TIMESTAMP de
// SQLite. Es para las columnas de registro (created_at, updated_at), no para la
// fecha de un movimiento del negocio (esa es ahoraNegocio).
function ahoraUTC(instante = new Date()) {
  return instante.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { zonaNegocio, ahoraNegocio, ahoraUTC };
