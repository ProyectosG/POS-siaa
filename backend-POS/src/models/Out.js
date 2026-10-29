const { prisma } = require('../config/prisma');
const { ErrorNegocio } = require('../config/transaccion');
const Kardex = require('./Kardex');
const { idEntero } = require('../utils/peticion');

class Out {
  // Va DENTRO de una transacción (tx de Prisma): si un producto no
  // alcanza, no queda nada registrado.
  static async crear(tx, data) {
    const { out_type, comments, movement_reason, date, time, related_folio, items, id_user, nickname_user } = data;

    if (id_user === undefined || id_user === null || !nickname_user) {
      throw new ErrorNegocio(400, 'Usuario no válido');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorNegocio(400, 'No se enviaron productos');
    }

    const { id: out_id } = await tx.outs.create({
      data: {
        out_type: String(out_type),
        comments: comments ? String(comments) : null,
        date,
        time,
        related_folio: related_folio ? String(related_folio) : null,
        id_user,
        nickname_user,
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
      if (previous_stock < cantidad) {
        throw new ErrorNegocio(409, `Stock insuficiente para ${product.articulo}. Disponible: ${previous_stock}`);
      }
      const new_stock = previous_stock - cantidad;

      product.stock = new_stock; // el siguiente renglón del mismo producto parte de aquí
      renglones.push({ out_id, product_id: product.id, quantity: cantidad });
      movimientos.push({
        product_id: product.id,
        id_user,
        nickname_user,
        movement_type: 'SALIDA',
        movement_reason: movement_reason || out_type,
        previous_stock,
        moved_quantity: cantidad,
        new_stock,
        date,
        time,
        related_folio: related_folio || out_id
      });
    }

    for (const p of productos.values()) {
      await tx.products.update({ where: { id: p.id }, data: { stock: p.stock }, select: { id: true } });
    }
    await tx.out_details.createMany({ data: renglones });
    await Kardex.registrarVarios(movimientos, tx);

    return out_id;
  }


  static findAll() {
    return prisma.outs.findMany({ orderBy: [{ date: 'desc' }, { time: 'desc' }] });
  }

  // Con sus renglones (items), cada uno con artículo, presentación y código de barras
  static async findById(id) {
    const fila = await prisma.outs.findUnique({
      where: { id },
      include: {
        out_details: {
          include: { products: { select: { articulo: true, presentacion: true, codigo_barras: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!fila) return null;
    const { out_details: renglones, ...out } = fila;
    out.items = renglones.map(({ products, ...d }) => ({ ...d, ...products }));
    return out;
  }
}

module.exports = Out;
