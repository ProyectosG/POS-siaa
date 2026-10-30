const Category = require('../models/Category');
const { enTransaccion, ErrorNegocio } = require('../config/transaccion');
const { leerId, tieneRelacionados } = require('../utils/peticion');

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
    if (tieneRelacionados(err)) {
      const motivo = await Category.motivoNoBorrar(leerId(req)).catch(() => 'la categoría tiene productos');
      return res.status(409).json({ error: `No se puede eliminar: ${motivo}. Muévelos a otra familia primero.` });
    }
    res.status(500).json({ error: err.message });
  }
};

// Familia completa con sus subfamilias, todo o nada (antes el navegador borraba
// una por una y la familia quedaba a medias si alguna tenía productos)
exports.deleteFamilia = async (req, res) => {
  try {
    const family = String(req.params.nombre || '');
    if (!familiaValida(family)) return res.status(400).json({ error: 'Falta el nombre de la familia' });

    const borradas = await enTransaccion((tx) => Category.borrarFamilia(tx, family));
    res.json({ message: `Familia ${family} eliminada`, borradas });
  } catch (err) {
    if (err instanceof ErrorNegocio) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};
