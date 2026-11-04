// src/utils/respaldoAuto.js
// Respaldo automático al confirmar un Corte Z (de caja o General). Un archivo por
// periodo, que se reemplaza con cada Z para conservar lo último. Si falla, el Z no
// se deshace: la respuesta lo avisa y queda anotado en Configuración.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { prisma } = require('../config/prisma');
const respaldos = require('./respaldos');
const { ahoraNegocio, ahoraUTC } = require('./fechas');
const { esDemo } = require('../demo/demo');

const PERIODOS = ['diario', 'semanal'];
const CONSERVAR = { diario: 30, semanal: 12 };
const PATRON = {
  diario: /^pos_auto_diario_\d{4}-\d{2}-\d{2}\.db$/,
  semanal: /^pos_auto_semanal_\d{4}-\d{2}-\d{2}\.db$/,
};

const esNombreValido = (nombre) => PERIODOS.some((p) => PATRON[p].test(String(nombre)));

// El lunes de la semana de una fecha AAAA-MM-DD (semana de lunes a domingo)
function lunesDe(fecha) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// Nombre del archivo del periodo, con la fecha de la zona del negocio
function nombreDelPeriodo(periodo, fecha = ahoraNegocio().date) {
  return periodo === 'semanal' ? `pos_auto_semanal_${lunesDe(fecha)}.db` : `pos_auto_diario_${fecha}.db`;
}

// Solo los automáticos: los pos_respaldo_*, pos_antes_* y pos_backup_* no se tocan.
// El nombre ordena por fecha.
function limpiar(dir) {
  const archivos = fs.readdirSync(dir);
  for (const periodo of PERIODOS) {
    const suyos = archivos.filter((f) => PATRON[periodo].test(f)).sort();
    const sobran = suyos.slice(0, Math.max(0, suyos.length - CONSERVAR[periodo]));
    for (const f of sobran) fs.rmSync(path.join(dir, f), { force: true });
  }
}

// En Windows, un archivo que se está descargando no se puede reemplazar al momento
async function reemplazar(temporal, destino) {
  for (let intento = 1; ; intento++) {
    try {
      fs.renameSync(temporal, destino);
      return;
    } catch (err) {
      if (intento >= 5 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      await new Promise((r) => setTimeout(r, 200 * intento));
    }
  }
}

// Primero a un temporal, se verifica y luego reemplaza: una copia dañada nunca
// borra la buena
async function copiar(periodo) {
  const dir = respaldos.dirRespaldos();
  fs.mkdirSync(dir, { recursive: true });
  const nombre = nombreDelPeriodo(periodo);
  const temporal = path.join(dir, `${nombre}.tmp-${crypto.randomBytes(4).toString('hex')}`);
  try {
    await respaldos.copiarVerificada(temporal);
    await reemplazar(temporal, path.join(dir, nombre));
  } finally {
    fs.rmSync(temporal, { force: true });
  }
  limpiar(dir);
  return { nombre, bytes: fs.statSync(path.join(dir, nombre)).size };
}

// Texto para la pantalla: sin rutas del servidor (el detalle queda en el log)
const mensajeDe = (err) => {
  if (err.clientVersion) return 'Error de la base de datos';
  return err.code ? `Error del sistema de archivos (${err.code})` : err.message;
};

async function anotar(datos) {
  await prisma.settings.updateMany({ where: { id: 1 }, data: { ...datos, updated_at: ahoraUTC() } });
}

async function respaldar(periodo) {
  const { date, time } = ahoraNegocio();
  try {
    const { nombre, bytes } = await copiar(periodo);
    await anotar({
      respaldo_ultimo_fecha: `${date} ${time}`,
      respaldo_ultimo_nombre: nombre,
      respaldo_ultimo_bytes: bytes,
      respaldo_ultimo_error: null,
    });
    return { ok: true, nombre };
  } catch (err) {
    console.error('❌ Respaldo automático:', err);
    const error = mensajeDe(err);
    await anotar({ respaldo_ultimo_error: `${date} ${time}: ${error}` }).catch(() => {});
    return { ok: false, error };
  }
}

// Con varias cajas puede haber varios Z a la vez: uno tras otro
let cola = Promise.resolve();

/**
 * Se llama DESPUÉS de cerrar la transacción del Z (VACUUM INTO no corre dentro de
 * una). Nunca lanza error. Devuelve { ok, nombre }, { ok: false, error } o null si
 * no tocaba respaldar (apagado o en la demo).
 */
async function respaldarTrasCorteZ() {
  if (esDemo()) return null;
  try {
    const s = await prisma.settings.findUnique({
      where: { id: 1 },
      select: { respaldo_auto: true, respaldo_periodo: true },
    });
    if (!s?.respaldo_auto) return null;
    const periodo = PERIODOS.includes(s.respaldo_periodo) ? s.respaldo_periodo : 'diario';
    const turno = cola.then(() => respaldar(periodo));
    cola = turno.catch(() => {});
    return await turno;
  } catch (err) {
    console.error('❌ Respaldo automático:', err);
    return { ok: false, error: mensajeDe(err) };
  }
}

// Respaldos automáticos, del más reciente al más viejo
function listar() {
  const dir = respaldos.dirRespaldos();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(esNombreValido)
    .map((nombre) => {
      const { size, mtime } = fs.statSync(path.join(dir, nombre));
      const { date, time } = ahoraNegocio(mtime);
      return {
        nombre,
        periodo: PATRON.semanal.test(nombre) ? 'semanal' : 'diario',
        bytes: size,
        fecha: `${date} ${time}`,
        ms: mtime.getTime(),
      };
    })
    .sort((a, b) => b.ms - a.ms)
    .map(({ ms, ...f }) => f);
}

module.exports = {
  PERIODOS, CONSERVAR, esNombreValido, lunesDe, nombreDelPeriodo, limpiar, respaldarTrasCorteZ, listar,
};
