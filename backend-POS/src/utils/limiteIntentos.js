// src/utils/limiteIntentos.js
// Límite de intentos fallidos por llave (usuario, IP...): al llegar a `maximo`
// fallos se bloquea durante `bloqueoMs`. Se guarda en la base (tabla
// intentos_clave, migración 7), así que reiniciar el servidor no lo borra.
// Cada limitador usa su `prefijo` para no mezclar llaves (login, caja...).
const { prisma } = require('../config/prisma');
const { ahoraUTC } = require('./fechas');

function crearLimiteIntentos({ prefijo, maximo = 5, bloqueoMs = 15 * 60 * 1000 }) {
  if (!prefijo) throw new Error('crearLimiteIntentos necesita un prefijo');
  const id = (llave) => `${prefijo}:${llave}`;
  const bloqueadoHasta = (r) => (r && r.bloqueado_hasta ? Date.parse(r.bloqueado_hasta) : 0);

  return {
    // Minutos que faltan de bloqueo, o 0 si puede intentar
    async minutosBloqueado(llave) {
      const r = await prisma.intentos_clave.findUnique({ where: { llave: id(llave) } });
      const resta = bloqueadoHasta(r) - Date.now();
      return resta > 0 ? Math.ceil(resta / 60000) : 0;
    },

    async fallo(llave) {
      const ahora = Date.now();
      const r = await prisma.intentos_clave.findUnique({ where: { llave: id(llave) } });
      // Los fallos viejos (más de bloqueoMs sin intentar) ya no cuentan
      const vigente = r && r.updated_at && r.updated_at >= ahoraUTC(new Date(ahora - bloqueoMs));
      const fallos = (vigente ? r.fallos : 0) + 1;
      const datos = fallos >= maximo
        ? { fallos: 0, bloqueado_hasta: new Date(ahora + bloqueoMs).toISOString(), updated_at: ahoraUTC() }
        : { fallos, bloqueado_hasta: bloqueadoHasta(r) > ahora ? r.bloqueado_hasta : null, updated_at: ahoraUTC() };
      await prisma.intentos_clave.upsert({ where: { llave: id(llave) }, create: { llave: id(llave), ...datos }, update: datos });

      // Limpieza: registros sin bloqueo vigente y sin intentos recientes
      await prisma.intentos_clave.deleteMany({
        where: {
          updated_at: { lt: ahoraUTC(new Date(ahora - bloqueoMs)) },
          OR: [{ bloqueado_hasta: null }, { bloqueado_hasta: { lt: new Date(ahora).toISOString() } }],
        },
      });
    },

    async exito(llave) {
      await prisma.intentos_clave.deleteMany({ where: { llave: id(llave) } });
    },

    // Solo para las pruebas: borra los registros de este limitador
    async limpiar() {
      await prisma.intentos_clave.deleteMany({ where: { llave: { startsWith: `${prefijo}:` } } });
    },
  };
}

module.exports = { crearLimiteIntentos };
