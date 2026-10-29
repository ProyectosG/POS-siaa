const Product = require('../models/Product');
const Kardex = require('../models/Kardex');
const { ahoraNegocio } = require('../utils/fechas');
const { enTransaccion } = require('../config/transaccion');
const { idEntero, leerId, esDuplicado, tieneRelacionados, ErrorCampo } = require('../utils/peticion');

const CODIGO_REPETIDO = 'Ya existe un producto con ese código de barras';

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
    const id = leerId(req);
    const product = id && (await Product.findById(id));
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

    const categoria = idEntero(data.category_id);
    if (!categoria) {
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
      category_id: categoria,
      photo_url: data.photo_url || null,
      codigo_barras: data.codigo_barras || null,
      codigo_interno: data.codigo_interno || null,
      activo: data.activo !== undefined ? data.activo : true
    };

    // Producto y kardex del alta en una sola transacción. El stock inicial
    // queda en el kardex (antes se guardaba sin movimiento).
    const stockInicial = Number(cleanData.stock) || 0;
    if (!Number.isInteger(stockInicial) || stockInicial < 0) {
      return res.status(400).json({ error: 'El stock inicial debe ser un entero mayor o igual a cero' });
    }

    const productId = await enTransaccion(async (tx) => {
      const id = await Product.crear(tx, { ...cleanData, stock: stockInicial });
      const { date, time } = ahoraNegocio();

      await Kardex.logMovement({
        product_id: id,
        id_user: req.user.id,               // del token
        nickname_user: req.user.nickname,
        movement_type: "ALTA",
        movement_reason: "ALTA_PRODUCTO",
        previous_stock: 0,
        moved_quantity: stockInicial,
        new_stock: stockInicial,
        date,
        time,
        related_folio: null
      }, tx);

      return id;
    });

    res.status(201).json({
      id: productId,
      message: 'Producto creado y registrado en kardex'
    });

  } catch (err) {
    if (err instanceof ErrorCampo) return res.status(400).json({ error: err.message });
    if (esDuplicado(err)) return res.status(409).json({ error: CODIGO_REPETIDO });
    if (tieneRelacionados(err)) return res.status(400).json({ error: 'La familia (category_id) no existe' });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = leerId(req);
    if (!id) return res.status(404).json({ error: 'Producto no encontrado' });

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
    // El stock no se edita aquí: solo con ventas, entradas y salidas
    if (data.category_id !== undefined) cleanData.category_id = data.category_id;
    if (data.photo_url !== undefined) cleanData.photo_url = data.photo_url || null;
    if (data.codigo_barras !== undefined) cleanData.codigo_barras = data.codigo_barras || null;
    if (data.codigo_interno !== undefined) cleanData.codigo_interno = data.codigo_interno || null;
    if (data.activo !== undefined) cleanData.activo = data.activo ? 1 : 0;

    const existe = await Product.update(id, cleanData);
    if (!existe) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json({ message: 'Producto actualizado correctamente' });
  } catch (err) {
    if (err instanceof ErrorCampo) return res.status(400).json({ error: err.message });
    if (esDuplicado(err)) return res.status(409).json({ error: CODIGO_REPETIDO });
    if (tieneRelacionados(err)) return res.status(400).json({ error: 'La familia (category_id) no existe' });
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = leerId(req);
    const existe = id && (await Product.delete(id));
    if (!existe) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    // Todo producto tiene al menos el kardex de su alta
    if (tieneRelacionados(err)) {
      return res.status(409).json({ error: 'El producto tiene movimientos; desactívalo en lugar de borrarlo' });
    }
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
    const term = req.query.term || req.query.query;

    if (!term || term.trim().length < 2) {
      return res.json([]);
    }

    const products = await Product.searchByName(term.trim());

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};