const db = require('../config/database');
const Product = require('./Product');
const Kardex = require('./Kardex');

class Out {
  static create(data) {
    return new Promise((resolve, reject) => {
      const {
        out_type,
        comments,
        movement_reason,
        date,
        time,
        related_folio,
        items,
        id_user,
        nickname_user
      } = data;

      if (!id_user || !nickname_user) {
        return reject(new Error('Usuario no válido'));
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return reject(new Error('No out items provided'));
      }

      db.serialize(async () => {
        try {
          db.run(
            `INSERT INTO outs (
              out_type,
              comments,
              date,
              time,
              related_folio,
              id_user,
              nickname_user
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              out_type,
              comments || null,
              date,
              time,
              related_folio || null,
              id_user,
              nickname_user
            ],
            async function (err) {
              if (err) return reject(err);

              const out_id = this.lastID;

              for (const item of items) {
                const { product_id, quantity } = item;

                const product = await Product.findById(product_id);
                if (!product) {
                  throw new Error(`Producto no encontrado: ${product_id}`);
                }

                const previous_stock = product.stock;
                const qty = Number(quantity);

                if (previous_stock < qty) {
                  throw new Error(
                    `Stock insuficiente para ${product.articulo}. Disponible: ${previous_stock}`
                  );
                }

                const new_stock = previous_stock - qty;

                await Product.update(product_id, { stock: new_stock });

                db.run(
                  `INSERT INTO out_details (out_id, product_id, quantity)
                   VALUES (?, ?, ?)`,
                  [out_id, product_id, qty]
                );

                await Kardex.logMovement({
                  product_id,
                  id_user,
                  nickname_user,
                  movement_type: 'SALIDA',
                  movement_reason: movement_reason || out_type,
                  previous_stock,
                  moved_quantity: qty,
                  new_stock,
                  date,
                  time,
                  related_folio: related_folio || out_id
                });
              }

              resolve(out_id);
            }
          );
        } catch (err) {
          reject(err);
        }
      });
    });
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
