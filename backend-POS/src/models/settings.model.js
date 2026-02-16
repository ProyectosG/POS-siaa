const db = require('../config/database');

const Settings = {
  // Obtener la configuración única
  get: () => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM settings WHERE id = 1`, (err, row) => {
        if (err) {
          console.error("Error en Settings.get:", err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Actualización dinámica
  update: (data) => {
    return new Promise((resolve, reject) => {
      // Filtramos campos que no queremos que se actualicen manualmente o que no existen
      const forbiddenFields = ['id', 'created_at', 'updated_at'];
      const fields = Object.keys(data).filter(field => !forbiddenFields.includes(field));
      const values = fields.map(field => data[field]);

      if (fields.length === 0) {
        return resolve({ message: "No hay campos válidos para actualizar" });
      }

      // El campo 'dynamic_price_auth_key' entrará aquí automáticamente
      const setClause = fields.map(field => `${field} = ?`).join(', ');

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