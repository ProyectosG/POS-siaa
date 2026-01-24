const Entry = require('../models/Entry');

exports.getAll = async (req, res) => {
  try {
    const entries = await Entry.findAll();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const now = new Date();

    // Fecha local REAL en formato YYYY-MM-DD (sin desfase UTC)
    const date = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');

    // Hora local HH:mm:ss
    const time = now.toTimeString().split(' ')[0];

    console.log('[DEBUG] Guardando entrada con:', { date, time }); // ← Para verificar

    const id = await Entry.create({
      ...req.body,
      date,
      time
    });

    res.status(201).json({ id });
  } catch (err) {
    console.error('Error al crear entrada:', err);
    res.status(500).json({ error: err.message });
  }
};