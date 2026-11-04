const Settings = require('../models/settings.model');
const { hashear, comparar } = require('../utils/seguridad');
const { aCentavos } = require('../utils/dinero');
const { crearLimiteIntentos } = require('../utils/limiteIntentos');
const { firmarAutorizacionPrecio } = require('../utils/precios');
const { tieneNivel, NIVELES } = require('../middleware/auth');
const respaldoAuto = require('../utils/respaldoAuto');
const { dirRespaldos } = require('../utils/respaldos');
const fs = require('fs');
const path = require('path');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.get();
    // El resultado del último respaldo es solo para quien administra los respaldos
    if (settings && !tieneNivel(req.user, NIVELES.ADMIN)) {
      for (const campo of ['respaldo_ultimo_fecha', 'respaldo_ultimo_nombre', 'respaldo_ultimo_bytes', 'respaldo_ultimo_error']) {
        delete settings[campo];
      }
    }
    res.json(settings);
  } catch (error) {
    console.error('Error al obtener settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

// PUT /api/settings (solo Administrador, ver rutas)
exports.updateSettings = async (req, res) => {
  try {
    // Primero los campos (si uno es inválido responde 400 sin guardar nada)
    await Settings.update(req.body);

    // Nueva clave de precios: si viene vacía no se cambia; si viene, se guarda con hash
    const nuevaClave = req.body.dynamic_price_auth_key;
    if (typeof nuevaClave === 'string' && nuevaClave.trim() !== '') {
      await Settings.updatePriceKey(await hashear(nuevaClave.trim()));
    }

    const updated = await Settings.get();
    res.json(updated);
  } catch (error) {
    if (error instanceof Settings.ErrorCampo) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al actualizar settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

// GET /api/settings/respaldos: respaldos automáticos, del más reciente al más viejo
exports.listarRespaldos = (req, res) => {
  try {
    res.json(respaldoAuto.listar());
  } catch (error) {
    console.error('Error al listar respaldos:', error);
    res.status(500).json({ error: 'No se pudo leer la lista de respaldos' });
  }
};

// GET /api/settings/respaldos/:nombre: descarga uno. Solo nombres de respaldo
// automático: ni otros archivos ni rutas.
exports.descargarRespaldo = (req, res) => {
  const { nombre } = req.params;
  const archivo = respaldoAuto.esNombreValido(nombre) ? path.join(dirRespaldos(), nombre) : null;
  if (!archivo || !fs.existsSync(archivo)) return res.status(404).json({ error: 'Respaldo no encontrado' });
  res.download(archivo, nombre, (err) => {
    if (err && !res.headersSent) res.status(500).json({ error: 'No se pudo enviar el respaldo' });
  });
};

// 5 claves equivocadas por usuario → 15 minutos sin poder intentar
const intentosClave = crearLimiteIntentos({ prefijo: 'precio', maximo: 5, bloqueoMs: 15 * 60 * 1000 });

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
    const minutos = await intentosClave.minutosBloqueado(llave);
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
      await intentosClave.fallo(llave);
      return res.json({ valida: false });
    }
    await intentosClave.exito(llave);

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
