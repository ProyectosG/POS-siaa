const Kardex = require('../models/Kardex');
const { leerId } = require('../utils/peticion');

// Ya no hay POST /api/kardex: dejaba registrar movimientos con el stock que
// mandara el navegador sin mover el stock del producto. Los movimientos los
// registran las ventas, entradas, salidas y altas, dentro de su transacción.

exports.getByProduct = async (req, res) => {
  try {
    const productId = leerId(req, 'product_id');
    if (!productId) {
      return res.status(400).json({ error: 'product_id inválido' });
    }

    const movements = await Kardex.findByProductId(productId);

    res.json(movements);
  } catch (error) {
    console.error('Kardex fetch error:', error);
    res.status(500).json({ error: error.message });
  }
};
