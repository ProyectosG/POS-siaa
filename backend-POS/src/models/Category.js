// src/models/Category.js
// Primer modelo con Prisma (prueba de concepto de la Fase 3)
const { prisma } = require('../config/prisma');
const { ErrorNegocio } = require('../config/transaccion');

// "3 productos" / "1 producto, 1 desactivado": los desactivados no se ven en la
// venta, pero también impiden borrar la categoría
function describirProductos(productos) {
  const n = productos.length;
  const desactivados = productos.filter((p) => !p.activo).length;
  let texto = `${n} producto${n === 1 ? '' : 's'}`;
  if (desactivados > 0) texto += `, ${desactivados} desactivado${desactivados === 1 ? '' : 's'}`;
  return texto;
}

// "A", "A y B", "A, B y C"
const enLista = (partes) =>
  partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;

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

  // Por qué no se puede borrar una categoría: "la subfamilia Blusas tiene 3 productos"
  static async motivoNoBorrar(id) {
    const categoria = await prisma.categories.findUnique({
      where: { id },
      select: { family: true, subfamily: true, products: { select: { activo: true } } },
    });
    if (!categoria) return 'la categoría tiene productos';
    const nombre = categoria.subfamily ? `la subfamilia ${categoria.subfamily}` : `la familia ${categoria.family}`;
    return `${nombre} tiene ${describirProductos(categoria.products)}`;
  }

  // Borra la familia completa (la fila sin subfamilia y todas sus subfamilias)
  // dentro de la transacción tx: todo o nada. Si alguna tiene productos lanza
  // 409 diciendo dónde están; si no existe, 404. Devuelve cuántas filas borró.
  static async borrarFamilia(tx, family) {
    const filas = await tx.categories.findMany({
      where: { family },
      select: { id: true, subfamily: true, products: { select: { activo: true } } },
      orderBy: { id: 'asc' },
    });
    if (filas.length === 0) throw new ErrorNegocio(404, 'Familia no encontrada');

    const conProductos = filas.filter((f) => f.products.length > 0);
    if (conProductos.length > 0) {
      const donde = conProductos.map((f) => `${f.subfamily || 'sin subfamilia'} (${describirProductos(f.products)})`);
      throw new ErrorNegocio(
        409,
        `No se puede eliminar la familia ${family}: tiene productos en ${enLista(donde)}. Muévelos a otra familia primero.`
      );
    }

    const { count } = await tx.categories.deleteMany({ where: { id: { in: filas.map((f) => f.id) } } });
    return count;
  }
}

module.exports = Category;
