const CashRegister = require('../models/CashRegister');
const { hashear, comparar } = require('../utils/seguridad');
const { leerId, esDuplicado } = require('../utils/peticion');
const { crearLimiteIntentos } = require('../utils/limiteIntentos');

const CAJA_REPETIDA = 'Ya existe una caja con ese número';

// Abrir caja: el mismo mensaje si la caja no existe o la clave está mal, para no
// revelar qué números de caja existen. Si no existe se compara contra un hash de
// relleno, así la respuesta tarda lo mismo.
const CAJA_O_CLAVE_INCORRECTA = 'Número de caja o clave incorrectos';
const HASH_RELLENO = require('bcrypt').hashSync('caja-inexistente', 10);

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
    const id = leerId(req);
    const register = id && (await CashRegister.findById(id));
    if (!register) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }
    res.json(sinPassword(register));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 🔥 ABRIR / VALIDAR CAJA
// 5 claves de caja equivocadas para la misma caja desde el mismo equipo → 15 minutos sin poder intentar
const intentosCaja = crearLimiteIntentos({ prefijo: 'caja', maximo: 5, bloqueoMs: 15 * 60 * 1000 });

exports.abrirCaja = async (req, res) => {
  try {
    const { numero_caja, password } = req.body;

    // 1️⃣ Validación básica
    if (!numero_caja || !password) {
      return res.status(400).json({
        error: 'numero_caja y password son requeridos',
      });
    }

    const llave = `${String(numero_caja).trim()}:${req.ip || 'desconocido'}`;
    const minutos = await intentosCaja.minutosBloqueado(llave);
    if (minutos > 0) {
      return res.status(429).json({ error: `Demasiados intentos. Espera ${minutos} min.` });
    }

    // 2️⃣ Buscar caja por número
    const register = await CashRegister.findByNumeroCaja(numero_caja);

    // 3️⃣ Validar clave contra el hash (caja inexistente: contra el de relleno)
    const valida = await comparar(password, register ? register.password : HASH_RELLENO);
    if (!register || !valida) {
      await intentosCaja.fallo(llave);
      // 403, no 401: el usuario sí tiene sesión (con 401 la pantalla la cerraría)
      return res.status(403).json({ error: CAJA_O_CLAVE_INCORRECTA });
    }

    await intentosCaja.exito(llave);

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

exports.create = async (req, res) => {
  try {
    const { numero_caja, tipo_caja, password } = req.body;

    if (!numero_caja || !password) {
      return res
        .status(400)
        .json({ error: 'numero_caja y password requeridos' });
    }

    const id = await CashRegister.create({
      numero_caja: String(numero_caja),
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
    if (esDuplicado(err)) return res.status(409).json({ error: CAJA_REPETIDA });
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = leerId(req);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const { numero_caja, tipo_caja, password } = req.body;
    if (numero_caja !== undefined && !String(numero_caja).trim()) {
      return res.status(400).json({ error: 'numero_caja no puede quedar vacío' });
    }

    const existe = await CashRegister.update(id, {
      numero_caja: numero_caja === undefined ? undefined : String(numero_caja),
      tipo_caja,
      // Clave vacía = no se cambia
      password: password ? await hashear(password) : undefined,
    });
    if (!existe) return res.status(404).json({ error: 'Caja no encontrada' });

    res.json({ message: 'Caja actualizada' });
  } catch (err) {
    if (esDuplicado(err)) return res.status(409).json({ error: CAJA_REPETIDA });
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = leerId(req);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const existe = await CashRegister.delete(id);
    if (!existe) return res.status(404).json({ error: 'Caja no encontrada' });

    res.json({ message: 'Caja eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
