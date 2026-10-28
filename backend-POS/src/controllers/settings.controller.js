const Settings = require('../models/settings.model');
const { hashear, comparar } = require('../utils/seguridad');
const { aCentavos } = require('../utils/dinero');
const { crearLimiteIntentos } = require('../utils/limiteIntentos');
const { firmarAutorizacionPrecio } = require('../utils/precios');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.get();
    res.json(settings);
  } catch (error) {
    console.error('Error al obtener settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

// PUT /api/settings (solo Administrador, ver rutas)
exports.updateSettings = async (req, res) => {
  try {
    // Nueva clave de precios: si viene vacía no se cambia; si viene, se guarda con hash
    const nuevaClave = req.body.dynamic_price_auth_key;
    if (typeof nuevaClave === 'string' && nuevaClave.trim() !== '') {
      await Settings.updatePriceKey(await hashear(nuevaClave.trim()));
    }

    await Settings.update(req.body);
    const updated = await Settings.get();
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

// 5 claves equivocadas por usuario → 15 minutos sin poder intentar
const intentosClave = crearLimiteIntentos({ maximo: 5, bloqueoMs: 15 * 60 * 1000 });

// POST /api/settings/validar-clave-precio
//   { clave }                         → { valida }
//   { clave, product_id, precio }     → { valida, autorizacion }
// La autorización (5 min, solo ese producto, ese precio y ese usuario) es lo que
// la venta acepta para cobrar un precio libre.
exports.validarClavePrecio = async (req, res) => {
  try {
    const { clave, product_id, precio } = req.body || {};
    if (clave === undefined || clave === null || String(clave) === '') {
      return res.status(400).json({ error: 'clave es requerida' });
    }

    const llave = `usuario:${req.user.id}`;
    const minutos = intentosClave.minutosBloqueado(llave);
    if (minutos > 0) {
      return res.status(429).json({ error: `Demasiados intentos. Espera ${minutos} min.` });
    }

    // Si se pide autorización, el precio y el producto deben ser válidos antes de probar la clave
    const pideAutorizacion = product_id !== undefined || precio !== undefined;
    const precioCentavos = aCentavos(precio);
    if (pideAutorizacion && (!product_id || !precioCentavos || precioCentavos <= 0)) {
      return res.status(400).json({ error: 'Para autorizar un precio se requieren product_id y un precio mayor a cero' });
    }

    const hash = await Settings.getPriceKeyHash();
    const valida = await comparar(String(clave).trim(), hash);

    if (!valida) {
      intentosClave.fallo(llave);
      return res.json({ valida: false });
    }
    intentosClave.exito(llave);

    if (!pideAutorizacion) return res.json({ valida: true });

    res.json({
      valida: true,
      autorizacion: firmarAutorizacionPrecio({ product_id, precio: precioCentavos, id_user: req.user.id }),
    });
  } catch (error) {
    console.error('Error al validar clave de precios:', error);
    res.status(500).json({ error: 'Error al validar la clave' });
  }
};

// Solo para las pruebas: limpia el registro de intentos
exports._limpiarIntentosClave = () => intentosClave.limpiar();
