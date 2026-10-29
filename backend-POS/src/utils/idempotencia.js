// src/utils/idempotencia.js
// Cada venta, abono, entrada y salida trae el encabezado Idempotency-Key, que el
// navegador genera una vez por operación. Si la misma clave llega dos veces
// (doble clic, reintento tras perder la red), se devuelve la primera respuesta
// y no se registra nada nuevo.
const { enTransaccion, ErrorNegocio } = require('../config/transaccion');
const { ahoraNegocio } = require('./fechas');

const FORMATO_CLAVE = /^[A-Za-z0-9_-]{8,100}$/;

// fn(tx) debe devolver { status, body }. Corre dentro de una transacción; la clave
// se guarda en esa misma transacción, así que se registra solo si todo salió bien.
async function operacionIdempotente(req, ruta, fn) {
  const clave = req.get('Idempotency-Key');
  if (!clave || !FORMATO_CLAVE.test(clave)) {
    throw new ErrorNegocio(400, 'Falta el encabezado Idempotency-Key (o no es válido)');
  }

  return enTransaccion(async (tx) => {
    const previa = await tx.idempotencia.findUnique({
      where: { id_user_clave: { id_user: req.user.id, clave } },
      select: { ruta: true, status: true, respuesta: true },
    });

    if (previa) {
      if (previa.ruta !== ruta) {
        throw new ErrorNegocio(409, 'Esa clave de operación ya se usó en otra operación');
      }
      return { status: previa.status, body: { ...JSON.parse(previa.respuesta), repetida: true } };
    }

    const { status, body } = await fn(tx);
    const { date, time } = ahoraNegocio();

    await tx.idempotencia.create({
      data: { id_user: req.user.id, clave, ruta, status, respuesta: JSON.stringify(body), creado: `${date} ${time}` },
    });

    return { status, body };
  });
}

// Responde un error: los de negocio con su status, lo demás como 500
function responderError(res, err, contexto) {
  if (err instanceof ErrorNegocio) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  console.error(`❌ ${contexto}:`, err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { operacionIdempotente, responderError };
