const CashRegister = require('../models/CashRegister');

exports.getAll = async (req, res) => {
  try {
    const registers = await CashRegister.findAll();
    res.json(registers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const register = await CashRegister.findById(req.params.id);
    if (!register) return res.status(404).json({ error: 'Caja no encontrada' });
    res.json(register);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { numero_caja, tipo_caja, password } = req.body;
    console.log(req.body)
    if (!numero_caja || !password) return res.status(400).json({ error: 'numero_caja y password requeridos' });

    const id = await CashRegister.create({ numero_caja, tipo_caja, password });
    res.status(201).json({ id, message: 'Caja creada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    await CashRegister.update(req.params.id, req.body);
    res.json({ message: 'Caja actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await CashRegister.delete(req.params.id);
    res.json({ message: 'Caja eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};