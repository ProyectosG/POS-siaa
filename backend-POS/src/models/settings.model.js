const db = require('../config/database');

// Campos que se pueden actualizar desde PUT /api/settings (el resto se ignora).
// La clave de precios no está aquí: se cambia aparte con hash (ver updatePriceKey).
const CAMPOS_EDITABLES = [
  'ticket_header_line1', 'ticket_header_line2', 'ticket_header_line3', 'ticket_header_line4',
  'ticket_subheader_line1', 'ticket_subheader_line2', 'ticket_subheader_line3', 'ticket_subheader_line4',
  'ticket_footer_line1', 'ticket_footer_line2',
  'ticket_width', 'auto_print_ticket',
  'allow_discounts', 'max_discount_without_auth', 'allow_negative_balance',
  'customer_form_mode',
  'card_payment_max_reprints',
];

const Settings = {
  // Obtener la configuración única (sin la clave de precios)
  get: () => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM settings WHERE id = 1`, (err, row) => {
        if (err) {
          console.error("Error en Settings.get:", err);
          reject(err);
        } else {
          if (row) delete row.dynamic_price_auth_key;
          resolve(row);
        }
      });
    });
  },

  // Hash guardado de la clave para liberar precios
  getPriceKeyHash: () => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT dynamic_price_auth_key FROM settings WHERE id = 1`, (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.dynamic_price_auth_key : null);
      });
    });
  },

  // Guarda el hash de la nueva clave de precios
  updatePriceKey: (hash) => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE settings SET dynamic_price_auth_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        [hash],
        (err) => (err ? reject(err) : resolve())
      );
    });
  },

  // Actualización con lista fija de campos
  update: (data) => {
    return new Promise((resolve, reject) => {
      const fields = CAMPOS_EDITABLES.filter((field) => data[field] !== undefined);
      const values = fields.map((field) => data[field]);

      if (fields.length === 0) {
        return resolve({ message: "No hay campos válidos para actualizar" });
      }

      const setClause = fields.map((field) => `${field} = ?`).join(', ');

      db.run(
        `UPDATE settings
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        values,
        function (err) {
          if (err) {
            console.error("Error en Settings.update:", err);
            reject(err);
          } else {
            // Retornamos el número de cambios (debería ser 1)
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }
};

module.exports = Settings;
