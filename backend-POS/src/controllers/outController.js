const Out = require('../models/Out');

exports.create = async (req, res) => {
  try {
    const out_id = await Out.create({
      ...req.body,
      id_user: req.body.id_user,         // ⚠️ usar del body
      nickname_user: req.body.nickname_user // ⚠️ usar del body
    });

    res.status(201).json({
      success: true,
      out_id
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
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
