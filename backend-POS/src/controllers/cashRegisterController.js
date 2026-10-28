const CashRegister = require('../models/CashRegister');
const { hashear, comparar } = require('../utils/seguridad');

// Nunca se devuelve la clave de la caja
const sinPassword = (register) => {
  if (!register) return register;
  const { password, ...safe } = register;
  return safe;
};

exports.getAll = async (req, res) => {
  try {
    const registers = await CashRegister.findAll();
    res.json(registers.map(sinPassword));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const register = await CashRegister.findById(req.params.id);
    if (!register) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }
    res.json(sinPassword(register));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 🔥 ABRIR / VALIDAR CAJA
exports.abrirCaja = async (req, res) => {
  try {
    const { numero_caja, password } = req.body;

    // 1️⃣ Validación básica
    if (!numero_caja || !password) {
      return res.status(400).json({
        error: 'numero_caja y password son requeridos',
      });
    }

    // 2️⃣ Buscar caja por número
    const register = await CashRegister.findByNumeroCaja(numero_caja);

    if (!register) {
      return res.status(404).json({
        error: 'Caja no encontrada',
      });
    }

    // 3️⃣ Validar clave contra el hash
    if (!(await comparar(password, register.password))) {
      return res.status(401).json({
        error: 'Clave de caja incorrecta',
      });
    }

    // 4️⃣ (Opcional) Marcar caja como abierta en BD
    // await CashRegister.marcarAbierta(register.id);

    // 5️⃣ RESPUESTA FINAL (SIN PASSWORD)
    res.json({
      id: register.id,
      numero_caja: register.numero_caja,
      tipo_caja: register.tipo_caja,
      estado: 'ABIERTA',
      abierta_en: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Error abrirCaja:', err);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
};



// 🔥 NUEVO: buscar por numero_caja
exports.getByNumeroCaja = async (req, res) => {
  try {
    const { numero_caja } = req.params;

    const register = await CashRegister.findByNumeroCaja(numero_caja);

    if (!register) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    res.json(sinPassword(register));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { numero_caja, tipo_caja, password } = req.body;

    if (!numero_caja || !password) {
      return res
        .status(400)
        .json({ error: 'numero_caja y password requeridos' });
    }

    const id = await CashRegister.create({
      numero_caja,
      tipo_caja,
      password: await hashear(password),
    });

    res.status(201).json({
      id,
      numero_caja,
      tipo_caja,
      message: 'Caja creada',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { numero_caja, tipo_caja, password } = req.body;
    await CashRegister.update(req.params.id, {
      numero_caja,
      tipo_caja,
      // Clave vacía = no se cambia
      password: password ? await hashear(password) : undefined,
    });
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
