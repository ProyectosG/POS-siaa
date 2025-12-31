const Product = require('../models/Product');

exports.getAll = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = req.body;

    if (!data.articulo || data.articulo.trim() === '') {
      return res.status(400).json({ error: 'articulo es requerido' });
    }
    if (!data.category_id) {
      return res.status(400).json({ error: 'category_id es requerido' });
    }

    const cleanData = {
      articulo: data.articulo.trim(),
      presentacion: data.presentacion || null,
      unidad_medida: data.unidad_medida || null,
      precio_menudeo: data.precio_menudeo || null,
      precio_mayoreo: data.precio_mayoreo || null,
      precio_especial: data.precio_especial || null,
      precio_oferta: data.precio_oferta || null,
      iva: data.iva || null,
      ieps: data.ieps || null,
      stock: data.stock || 0,
      category_id: data.category_id,
      photo_url: data.photo_url || null,
      codigo_barras: data.codigo_barras || null,
      codigo_interno: data.codigo_interno || null,
      activo: data.activo !== undefined ? data.activo : true
    };

    const id = await Product.create(cleanData);
    res.status(201).json({ id, message: 'Producto creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const data = req.body;
    if (data.articulo && data.articulo.trim() === '') {
      return res.status(400).json({ error: 'articulo no puede estar vacío' });
    }

    const cleanData = {};
    if (data.articulo) cleanData.articulo = data.articulo.trim();
    if (data.presentacion !== undefined) cleanData.presentacion = data.presentacion || null;
    if (data.unidad_medida !== undefined) cleanData.unidad_medida = data.unidad_medida || null;
    if (data.precio_menudeo !== undefined) cleanData.precio_menudeo = data.precio_menudeo;
    if (data.precio_mayoreo !== undefined) cleanData.precio_mayoreo = data.precio_mayoreo;
    if (data.precio_especial !== undefined) cleanData.precio_especial = data.precio_especial;
    if (data.precio_oferta !== undefined) cleanData.precio_oferta = data.precio_oferta;
    if (data.iva !== undefined) cleanData.iva = data.iva;
    if (data.ieps !== undefined) cleanData.ieps = data.ieps;
    if (data.stock !== undefined) cleanData.stock = data.stock;
    if (data.category_id !== undefined) cleanData.category_id = data.category_id;
    if (data.photo_url !== undefined) cleanData.photo_url = data.photo_url || null;
    if (data.codigo_barras !== undefined) cleanData.codigo_barras = data.codigo_barras || null;
    if (data.codigo_interno !== undefined) cleanData.codigo_interno = data.codigo_interno || null;
    if (data.activo !== undefined) cleanData.activo = data.activo ? 1 : 0;

    await Product.update(req.params.id, cleanData);
    res.json({ message: 'Producto actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Product.delete(req.params.id);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByBarcode = async (req, res) => {
  try {
    const product = await Product.findByBarcode(req.params.code);

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchByName = async (req, res) => {
  try {
    const term = req.query.term || req.query.query

    if (!term || term.trim().length < 2) {
      return res.json([])
    }

    const products = await Product.searchByName(term.trim())
 
    res.json(products)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}


