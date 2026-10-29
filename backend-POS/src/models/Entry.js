// models/Entry.js
const { prisma } = require('../config/prisma');
const { ErrorNegocio } = require('../config/transaccion');
const Kardex = require('./Kardex');
const { idEntero } = require('../utils/peticion');

class Entry {
  // Va DENTRO de una transacción (tx de Prisma): si algo falla, no queda
  // ni el encabezado, ni el stock, ni el kardex a medias.
  static async crear(tx, data) {
    const { entry_type, comments, movement_reason, date, time, related_folio, items, id_user, nickname_user } = data;

    if (id_user === undefined || id_user === null || !nickname_user) {
      throw new ErrorNegocio(400, 'Usuario no válido');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorNegocio(400, 'No se enviaron productos');
    }

    const { id: entry_id } = await tx.entries.create({
      data: {
        entry_type: String(entry_type),
        comments: comments ? String(comments) : null,
        date,
        time,
        related_folio: related_folio ? String(related_folio) : null,
      },
      select: { id: true },
    });

    // Productos de una vez, con su stock leído DENTRO de la transacción
    const ids = [...new Set(items.map((i) => idEntero(i.product_id)).filter(Boolean))];
    const productos = new Map(
      (await tx.products.findMany({ where: { id: { in: ids } }, select: { id: true, articulo: true, stock: true } }))
        .map((p) => [p.id, p])
    );
    const renglones = [];
    const movimientos = [];

    for (const { product_id, quantity } of items) {
      const cantidad = Number(quantity);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new ErrorNegocio(400, 'Cada producto debe llevar una cantidad entera mayor a cero');
      }

      const product = productos.get(idEntero(product_id));
      if (!product) throw new ErrorNegocio(400, `Producto no encontrado: ${product_id}`);

      const previous_stock = product.stock;
      const new_stock = previous_stock + cantidad;

      product.stock = new_stock; // el siguiente renglón del mismo producto parte de aquí
      renglones.push({ entry_id, product_id: product.id, quantity: cantidad });
      movimientos.push({
        product_id: product.id,
        id_user,
        nickname_user,
        movement_type: 'ENTRADA',
        movement_reason: movement_reason || entry_type,
        previous_stock,
        moved_quantity: cantidad,
        new_stock,
        date,
        time,
        related_folio: related_folio || entry_id
      });
    }

    for (const p of productos.values()) {
      await tx.products.update({ where: { id: p.id }, data: { stock: p.stock }, select: { id: true } });
    }
    await tx.entry_details.createMany({ data: renglones });
    await Kardex.registrarVarios(movimientos, tx);

    return entry_id;
  }


  static findAll() {
    return prisma.entries.findMany({ orderBy: [{ date: 'desc' }, { time: 'desc' }] });
  }

  // Con sus renglones (items), cada uno con artículo, presentación y código de barras
  static async findById(id) {
    const fila = await prisma.entries.findUnique({
      where: { id },
      include: {
        entry_details: {
          include: { products: { select: { articulo: true, presentacion: true, codigo_barras: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!fila) return null;
    const { entry_details: renglones, ...entry } = fila;
    entry.items = renglones.map(({ products, ...d }) => ({ ...d, ...products }));
    return entry;
  }
}

module.exports = Entry;
