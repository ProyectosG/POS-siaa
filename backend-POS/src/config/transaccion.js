// src/config/transaccion.js
// Transacciones para las operaciones que mueven dinero o inventario (ventas,
// abonos, entradas, salidas, cortes, alta de producto).
//
// Son transacciones interactivas de Prisma sobre su única conexión (adaptador
// libsql): mientras una está abierta, el adaptador forma en espera todo lo demás
// (otras transacciones y consultas sueltas), así que lo que corre dentro es todo
// o nada y nunca se mezcla con otra petición.
const { prisma } = require('./prisma');

// Por omisión Prisma espera solo 2 s para entrar a una transacción: con muchas
// ventas a la vez las últimas fallarían por tiempo y no por falta de stock
const OPCIONES = { maxWait: 15000, timeout: 15000 };

// Corre fn(tx) en una transacción; tx es el cliente de Prisma de esa transacción.
// Si fn lanza un error, se deshace todo y el error sale tal cual.
function enTransaccion(fn) {
  return prisma.$transaction((tx) => fn(tx), OPCIONES);
}

// Error con código HTTP: el controlador responde ese status con el mensaje
class ErrorNegocio extends Error {
  constructor(status, mensaje, extra = {}) {
    super(mensaje);
    this.status = status;
    this.extra = extra;
  }
}

module.exports = { enTransaccion, ErrorNegocio, OPCIONES };
