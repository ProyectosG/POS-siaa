// src/models/User.js (con Prisma)
// Las consultas de usuarios. La conversión de contraseñas a hash al arrancar
// sigue en utils/seguridad.js (es parte del arranque, junto a las migraciones).
const { prisma } = require('../config/prisma');
const { ahoraUTC } = require('../utils/fechas');

// Columnas que se pueden devolver (nunca password)
const COLUMNAS_PUBLICAS = {
  id: true, nickname: true, full_name: true, phone: true, email: true, access_level: true, photo_url: true,
};

class User {
  // created_at se escribe aquí con el mismo texto de siempre (UTC), sin
  // depender de que la tabla tenga su DEFAULT
  static async create({ nickname, full_name, phone, email, password, access_level, photo_url }) {
    const usuario = await prisma.users.create({
      data: {
        nickname,
        full_name: full_name || null,
        phone: phone || null,
        email: email || null,
        password,
        access_level,
        photo_url: photo_url || null,
        created_at: ahoraUTC(),
      },
    });
    return usuario.id;
  }

  static findAllPublic() {
    return prisma.users.findMany({ select: COLUMNAS_PUBLICAS, orderBy: { id: 'asc' } });
  }

  static findByIdPublic(id) {
    return prisma.users.findUnique({ where: { id }, select: COLUMNAS_PUBLICAS });
  }

  static findByNicknamePublic(nickname) {
    return prisma.users.findUnique({ where: { nickname }, select: COLUMNAS_PUBLICAS });
  }

  // Con password: solo para el login
  static findByNickname(nickname) {
    return prisma.users.findUnique({ where: { nickname } });
  }

  static findNivel(id) {
    return prisma.users.findUnique({ where: { id }, select: { id: true, access_level: true } });
  }

  static contarConNivelMinimo(nivel) {
    return prisma.users.count({ where: { access_level: { gte: nivel } } });
  }

  // data ya viene filtrada por la lista fija del controlador. Devuelve false si no existe.
  static async update(id, data) {
    const { count } = await prisma.users.updateMany({ where: { id }, data });
    return count > 0;
  }

  static async delete(id) {
    const { count } = await prisma.users.deleteMany({ where: { id } });
    return count > 0;
  }
}

module.exports = User;
