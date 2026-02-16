const Settings = require('../models/settings.model');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.get();
    res.json(settings);
  } catch (error) {
    console.error('Error al obtener settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    // Validamos si viene la clave de precio dinámico para que no se guarde vacía por error
    if (req.body.dynamic_price_auth_key !== undefined && req.body.dynamic_price_auth_key === "") {
        req.body.dynamic_price_auth_key = "1234"; // Default de seguridad
    }

    await Settings.update(req.body);
    const updated = await Settings.get();
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};