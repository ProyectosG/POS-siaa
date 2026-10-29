// src/models/Category.js
// Primer modelo con Prisma (prueba de concepto de la Fase 3)
const { prisma } = require('../config/prisma');

class Category {
  static async create({ family, subfamily }) {
    const categoria = await prisma.categories.create({ data: { family, subfamily } });
    return categoria.id;
  }

  static findAll() {
    return prisma.categories.findMany({ orderBy: { id: 'asc' } });
  }

  static findById(id) {
    return prisma.categories.findUnique({ where: { id } });
  }

  // Devuelve false si no existe
  static async update(id, { family, subfamily }) {
    const { count } = await prisma.categories.updateMany({ where: { id }, data: { family, subfamily } });
    return count > 0;
  }

  // Devuelve false si no existe. Si tiene productos, SQLite rechaza el borrado
  // (llave foránea) y Prisma lanza el error P2003.
  static async delete(id) {
    const { count } = await prisma.categories.deleteMany({ where: { id } });
    return count > 0;
  }
}

module.exports = Category;
