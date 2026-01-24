// models/Entry.js
const db = require('../config/database');
const Product = require('./Product');
const Kardex = require('./Kardex');

class Entry {
static create(data) {
  return new Promise((resolve, reject) => {
    const {
      entry_type,
      comments,
      movement_reason, // 👈 SIN alias
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
      return reject(new Error('No entry items provided'));
    }

    db.serialize(async () => {
      try {
        db.run(
          `INSERT INTO entries (entry_type, comments, date, time, related_folio)
           VALUES (?, ?, ?, ?, ?)`,
          [entry_type, comments || null, date, time, related_folio || null],
          async function (err) {
            if (err) return reject(err);

            const entry_id = this.lastID;

            for (const item of items) {
              const { product_id, quantity } = item;

              const product = await Product.findById(product_id);
              if (!product) throw new Error(`Product not found: ${product_id}`);

              const previous_stock = product.stock;
              const new_stock = previous_stock + Number(quantity);

              await Product.update(product_id, { stock: new_stock });

              db.run(
                `INSERT INTO entry_details (entry_id, product_id, quantity)
                 VALUES (?, ?, ?)`,
                [entry_id, product_id, quantity]
              );

        await Kardex.logMovement({
          product_id,
          id_user,
          nickname_user,
          movement_type: 'ENTRADA',
          movement_reason: movement_reason || entry_type,
          previous_stock,
          moved_quantity: quantity,
          new_stock,
          date,
          time,
          related_folio: related_folio || entry_id
      });


            }

            resolve(entry_id);
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
        `SELECT * FROM entries ORDER BY date DESC, time DESC`,
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
        `SELECT * FROM entries WHERE id = ?`,
        [id],
        (err, entry) => {
          if (err) return reject(err);
          if (!entry) return resolve(null);

          db.all(
            `SELECT ed.*, p.articulo, p.presentacion, p.codigo_barras
             FROM entry_details ed
             JOIN products p ON p.id = ed.product_id
             WHERE ed.entry_id = ?`,
            [id],
            (err, details) => {
              if (err) reject(err);
              entry.items = details;
              resolve(entry);
            }
          );
        }
      );
    });
  }
}

module.exports = Entry;
