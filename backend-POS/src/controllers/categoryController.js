const db = require('../config/database');
const Category = require('../models/Category');

exports.getAll = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { family, subfamily } = req.body;

    if (!family || typeof family !== 'string' || family.trim() === '') {
      return res.status(400).json({ error: 'family es requerido y debe ser texto' });
    }

    const id = await Category.create({ family: family.trim(), subfamily: subfamily || null });
    res.status(201).json({ id, message: 'Categoría creada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { family, subfamily } = req.body;

    if (!family || typeof family !== 'string' || family.trim() === '') {
      return res.status(400).json({ error: 'family es requerido y debe ser texto' });
    }

    await db.run(
      `UPDATE categories SET family = ?, subfamily = ? WHERE id = ?`,
      [family.trim(), subfamily || null, id]
    );

    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await db.run(`DELETE FROM categories WHERE id = ?`, [id]);

    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};