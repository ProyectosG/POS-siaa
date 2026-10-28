const Settings = require('../models/settings.model');
const { hashear, comparar } = require('../utils/seguridad');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.get();
    res.json(settings);
  } catch (error) {
    console.error('Error al obtener settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

// PUT /api/settings (solo Administrador, ver rutas)
exports.updateSettings = async (req, res) => {
  try {
    // Nueva clave de precios: si viene vacía no se cambia; si viene, se guarda con hash
    const nuevaClave = req.body.dynamic_price_auth_key;
    if (typeof nuevaClave === 'string' && nuevaClave.trim() !== '') {
      await Settings.updatePriceKey(await hashear(nuevaClave.trim()));
    }

    await Settings.update(req.body);
    const updated = await Settings.get();
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

// POST /api/settings/validar-clave-precio  { clave } → { valida }
exports.validarClavePrecio = async (req, res) => {
  try {
    const { clave } = req.body || {};
    if (clave === undefined || clave === null || String(clave) === '') {
      return res.status(400).json({ error: 'clave es requerida' });
    }

    const hash = await Settings.getPriceKeyHash();
    const valida = await comparar(String(clave).trim(), hash);
    res.json({ valida });
  } catch (error) {
    console.error('Error al validar clave de precios:', error);
    res.status(500).json({ error: 'Error al validar la clave' });
  }
};
