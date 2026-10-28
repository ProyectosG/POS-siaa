// src/utils/limiteIntentos.js
// Límite de intentos fallidos por llave (usuario, IP...), en memoria:
// al llegar a `maximo` fallos se bloquea durante `bloqueoMs`.
// Se reinicia si se reinicia el servidor.

function crearLimiteIntentos({ maximo = 5, bloqueoMs = 15 * 60 * 1000 } = {}) {
  const registros = new Map(); // llave → { fallos, bloqueadoHasta }

  return {
    // Minutos que faltan de bloqueo, o 0 si puede intentar
    minutosBloqueado(llave) {
      const r = registros.get(llave);
      const resta = r ? r.bloqueadoHasta - Date.now() : 0;
      return resta > 0 ? Math.ceil(resta / 60000) : 0;
    },
    fallo(llave) {
      const r = registros.get(llave) || { fallos: 0, bloqueadoHasta: 0 };
      r.fallos += 1;
      if (r.fallos >= maximo) {
        r.fallos = 0;
        r.bloqueadoHasta = Date.now() + bloqueoMs;
      }
      registros.set(llave, r);
    },
    exito(llave) {
      registros.delete(llave);
    },
    limpiar() {
      registros.clear();
    },
  };
}

module.exports = { crearLimiteIntentos };
