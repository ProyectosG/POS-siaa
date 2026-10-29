// src/utils/peticion.js
// Ayudas comunes de los controladores que usan Prisma.

// El id de la ruta debe ser un entero positivo; si no, null
function leerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// P2002: se repitió un valor único (número de caja, nickname, email...)
const esDuplicado = (err) => err?.code === 'P2002';

// P2003: el registro tiene otros que dependen de él (llave foránea)
const tieneRelacionados = (err) => err?.code === 'P2003';

module.exports = { leerId, esDuplicado, tieneRelacionados };
