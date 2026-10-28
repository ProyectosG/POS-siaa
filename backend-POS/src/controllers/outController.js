const Out = require('../models/Out');
const { ErrorNegocio } = require('../config/transaccion');
const { ahoraNegocio } = require('../utils/fechas');
const { operacionIdempotente } = require('../utils/idempotencia');

// POST /api/outs — en una transacción y con Idempotency-Key obligatorio
exports.create = async (req, res) => {
  try {
    const { status, body } = await operacionIdempotente(req, 'POST /outs', async (tx) => {
      // Fecha y hora del servidor, en la zona del negocio (antes llegaban del navegador)
      const { date, time } = ahoraNegocio();

      const out_id = await Out.crear(tx, {
        ...req.body,
        // El usuario sale del token, nunca del cuerpo de la petición
        id_user: req.user.id,
        nickname_user: req.user.nickname,
        date,
        time
      });

      return { status: 201, body: { success: true, out_id } };
    });

    res.status(status).json(body);
  } catch (err) {
    if (err instanceof ErrorNegocio) {
      return res.status(err.status).json({ success: false, message: err.message, error: err.message });
    }
    console.error('❌ Error al crear salida:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};


exports.getAll = async (req, res) => {
  try {
    const outs = await Out.findAll();
    res.json(outs);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const out = await Out.findById(req.params.id);
    if (!out) {
      return res.status(404).json({
        message: 'Salida no encontrada'
      });
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};
