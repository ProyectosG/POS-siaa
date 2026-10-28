const Entry = require('../models/Entry');
const { ahoraNegocio } = require('../utils/fechas');
const { operacionIdempotente, responderError } = require('../utils/idempotencia');

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

// POST /api/entries — en una transacción y con Idempotency-Key obligatorio
exports.create = async (req, res) => {
  try {
    const { status, body } = await operacionIdempotente(req, 'POST /entries', async (tx) => {
      // Fecha y hora del servidor, en la zona del negocio
      const { date, time } = ahoraNegocio();

      const id = await Entry.crear(tx, {
        ...req.body,
        // El usuario sale del token, nunca del cuerpo de la petición
        id_user: req.user.id,
        nickname_user: req.user.nickname,
        date,
        time
      });

      return { status: 201, body: { id } };
    });

    res.status(status).json(body);
  } catch (err) {
    responderError(res, err, 'Error al crear entrada');
  }
};