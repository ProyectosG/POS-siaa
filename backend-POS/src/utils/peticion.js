// src/utils/peticion.js
// Ayudas comunes de los controladores que usan Prisma.

// Un id (número o texto con número) → entero positivo; si no, null
function idEntero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// El id de la ruta debe ser un entero positivo; si no, null
function leerId(req, nombre = 'id') {
  return idEntero(req.params[nombre]);
}

// P2002: se repitió un valor único (número de caja, nickname, email...)
const esDuplicado = (err) => err?.code === 'P2002';

// P2003: el registro tiene otros que dependen de él, o apunta a uno que no
// existe (llave foránea)
const tieneRelacionados = (err) => err?.code === 'P2003';

// Un valor que no es del tipo de su columna (el controlador responde 400).
// SQLite aceptaba texto en columnas numéricas; Prisma no.
class ErrorCampo extends Error {
  constructor(campo) {
    super(`Valor inválido para ${campo}`);
    this.campo = campo;
  }
}

// Número (o texto con número) → número; vacío → null; otra cosa → ErrorCampo
function numeroONulo(campo, valor, { entero = false } = {}) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'boolean') return valor ? 1 : 0;
  const n = Number(valor);
  if (!Number.isFinite(n) || (entero && !Number.isInteger(n))) throw new ErrorCampo(campo);
  return n;
}

module.exports = { idEntero, leerId, esDuplicado, tieneRelacionados, ErrorCampo, numeroONulo };
