const db = require('../config/database');
const { ErrorNegocio } = require('../config/transaccion');
const Kardex = require('./Kardex');

class Out {
  // Va DENTRO de una transacción (config/transaccion.js): si un producto no
  // alcanza, no queda nada registrado.
  static async crear(tx, data) {
    const { out_type, comments, movement_reason, date, time, related_folio, items, id_user, nickname_user } = data;

    if (id_user === undefined || id_user === null || !nickname_user) {
      throw new ErrorNegocio(400, 'Usuario no válido');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorNegocio(400, 'No se enviaron productos');
    }

    const { lastID: out_id } = await tx.run(
      `INSERT INTO outs (out_type, comments, date, time, related_folio, id_user, nickname_user)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [out_type, comments || null, date, time, related_folio || null, id_user, nickname_user]
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
      if (previous_stock < cantidad) {
        throw new ErrorNegocio(409, `Stock insuficiente para ${product.articulo}. Disponible: ${previous_stock}`);
      }
      const new_stock = previous_stock - cantidad;

      await tx.run('UPDATE products SET stock = ? WHERE id = ?', [new_stock, product_id]);
      await tx.run(
        `INSERT INTO out_details (out_id, product_id, quantity) VALUES (?, ?, ?)`,
        [out_id, product_id, cantidad]
      );

      await Kardex.logMovement({
        product_id,
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
      }, tx);
    }

    return out_id;
  }


  static findAll() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM outs ORDER BY date DESC, time DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM outs WHERE id = ?`,
        [id],
        (err, out) => {
          if (err) return reject(err);
          if (!out) return resolve(null);

          db.all(
            `SELECT od.*, p.articulo, p.presentacion, p.codigo_barras
             FROM out_details od
             JOIN products p ON p.id = od.product_id
             WHERE od.out_id = ?`,
            [id],
            (err, details) => {
              if (err) reject(err);
              out.items = details;
              resolve(out);
            }
          );
        }
      );
    });
  }
}

module.exports = Out;
