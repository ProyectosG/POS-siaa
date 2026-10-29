const Category = require('../models/Category');

// El id de la ruta debe ser un entero positivo
const leerId = (req) => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const familiaValida = (family) => family && typeof family === 'string' && family.trim() !== '';

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

    if (!familiaValida(family)) {
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
    const id = leerId(req);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const { family, subfamily } = req.body;
    if (!familiaValida(family)) {
      return res.status(400).json({ error: 'family es requerido y debe ser texto' });
    }

    const existe = await Category.update(id, { family: family.trim(), subfamily: subfamily || null });
    if (!existe) return res.status(404).json({ error: 'Categoría no encontrada' });

    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = leerId(req);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const existe = await Category.delete(id);
    if (!existe) return res.status(404).json({ error: 'Categoría no encontrada' });

    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    // P2003: la categoría tiene productos (llave foránea)
    if (err.code === 'P2003') {
      return res.status(409).json({ error: 'No se puede eliminar: la categoría tiene productos' });
    }
    res.status(500).json({ error: err.message });
  }
};
