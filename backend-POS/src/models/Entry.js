// models/Entry.js
const { prisma } = require('../config/prisma');
const { ErrorNegocio } = require('../config/transaccion');
const Kardex = require('./Kardex');

class Entry {
  // Va DENTRO de una transacción (config/transaccion.js): si algo falla, no queda
  // ni el encabezado, ni el stock, ni el kardex a medias.
  static async crear(tx, data) {
    const { entry_type, comments, movement_reason, date, time, related_folio, items, id_user, nickname_user } = data;

    if (id_user === undefined || id_user === null || !nickname_user) {
      throw new ErrorNegocio(400, 'Usuario no válido');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorNegocio(400, 'No se enviaron productos');
    }

    const { lastID: entry_id } = await tx.run(
      `INSERT INTO entries (entry_type, comments, date, time, related_folio)
       VALUES (?, ?, ?, ?, ?)`,
      [entry_type, comments || null, date, time, related_folio || null]
    );

    for (const { product_id, quantity } of items) {
      const cantidad = Number(quantity);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new ErrorNegocio(400, 'Cada producto debe llevar una cantidad entera mayor a cero');
      }

      // Stock leído DENTRO de la transacción
      const product = await tx.get('SELECT id, articulo, stock FROM products WHERE id = ?', [product_id]);
      if (!product) throw new ErrorNegocio(400, `Producto no encontrado: ${product_id}`);

      const previous_stock = product.stock;
      const new_stock = previous_stock + cantidad;

      await tx.run('UPDATE products SET stock = ? WHERE id = ?', [new_stock, product_id]);
      await tx.run(
        `INSERT INTO entry_details (entry_id, product_id, quantity) VALUES (?, ?, ?)`,
        [entry_id, product_id, cantidad]
      );

      await Kardex.logMovement({
        product_id,
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
      }, tx);
    }

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
