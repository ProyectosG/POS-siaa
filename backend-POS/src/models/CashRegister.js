// src/models/CashRegister.js (con Prisma)
const { prisma } = require('../config/prisma');

class CashRegister {
  static async create({ numero_caja, tipo_caja = 'Normal', password }) {
    const caja = await prisma.cash_registers.create({ data: { numero_caja, tipo_caja, password } });
    return caja.id;
  }

  static findAll() {
    return prisma.cash_registers.findMany({ orderBy: { id: 'asc' } });
  }

  static findById(id) {
    return prisma.cash_registers.findUnique({ where: { id } });
  }

  // Puede ser null si no existe
  static findByNumeroCaja(numero_caja) {
    return prisma.cash_registers.findUnique({ where: { numero_caja: String(numero_caja) } });
  }

  // password llega ya con hash; si no viene, la clave no cambia.
  // Devuelve false si no existe.
  static async update(id, { numero_caja, tipo_caja, password }) {
    const data = { numero_caja, tipo_caja };
    if (password) data.password = password;
    const { count } = await prisma.cash_registers.updateMany({ where: { id }, data });
    return count > 0;
  }

  // Devuelve false si no existe
  static async delete(id) {
    const { count } = await prisma.cash_registers.deleteMany({ where: { id } });
    return count > 0;
  }
}

module.exports = CashRegister;
