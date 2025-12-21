const Product = require('../models/Product');

exports.getAll = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      articulo,
      precio_menudeo,
      precio_mayoreo,
      precio_especial,
      precio_oferta,
      iva,
      ieps,
      stock,
      category_id,
      photo_url,
      presentacion,
      unidad_medida
    } = req.body;

    // Validaciones básicas
    if (!articulo || typeof articulo !== 'string' || articulo.trim() === '') {
      return res.status(400).json({ error: 'articulo es requerido y debe ser texto' });
    }

    if (precio_menudeo !== undefined && (isNaN(precio_menudeo) || precio_menudeo < 0)) {
      return res.status(400).json({ error: 'precio_menudeo debe ser número positivo' });
    }

    // Opcional: valida otros precios, iva, ieps, stock similarmente

    const data = {
      articulo: articulo.trim(),
      presentacion,
      unidad_medida,
      precio_menudeo: precio_menudeo || null,
      precio_mayoreo: precio_mayoreo || null,
      precio_especial: precio_especial || null,
      precio_oferta: precio_oferta || null,
      iva: iva || null,
      ieps: ieps || null,
      stock: stock || 0,
      category_id: category_id || null,
      photo_url: photo_url || null
    };

    const id = await Product.create(data);
    res.status(201).json({ id, message: 'Producto creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};