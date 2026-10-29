// src/utils/precios.js
// El servidor calcula precios y totales con el catálogo. Del navegador solo se
// toman producto, cantidad, cuál de los 4 precios, % de descuento y, si aplica,
// la autorización de precio libre. Todo en CENTAVOS.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ErrorNegocio } = require('../config/transaccion');
const { aCentavos } = require('./dinero');
const { idEntero } = require('./peticion');

const TIPOS_PRECIO = ['menudeo', 'mayoreo', 'especial', 'oferta'];
const IVA_PCT = 16; // los precios del catálogo ya incluyen IVA
const MAX_RENGLONES = 200;
const VIGENCIA_AUTORIZACION = '5m';

// Autorización de precio libre: la entrega validar-clave-precio y solo sirve
// para ese producto, ese precio y ese usuario, durante 5 minutos y UNA vez
// (su jti queda en autorizaciones_usadas al venderse).
function firmarAutorizacionPrecio({ product_id, precio, id_user }) {
  return jwt.sign(
    { tipo: 'precio_libre', product_id: Number(product_id), precio, id_user },
    process.env.JWT_SECRET,
    { expiresIn: VIGENCIA_AUTORIZACION, jwtid: crypto.randomUUID() }
  );
}

function verificarAutorizacionPrecio(autorizacion, product_id, id_user) {
  try {
    const p = jwt.verify(autorizacion, process.env.JWT_SECRET);
    if (p.tipo !== 'precio_libre' || p.product_id !== Number(product_id) || p.id_user !== id_user || !p.jti) return null;
    return { precio: p.precio, jti: p.jti };
  } catch {
    return null;
  }
}

// Configuración de ventas vigente (descuentos y stock negativo)
async function leerConfigVentas(tx) {
  const s = await tx.settings.findUnique({
    where: { id: 1 },
    select: { allow_discounts: true, max_discount_without_auth: true, allow_negative_balance: true },
  });
  return {
    permiteDescuentos: Number(s?.allow_discounts ?? 1) !== 0,
    descuentoMaximo: Number(s?.max_discount_without_auth ?? 0),
    permiteStockNegativo: Number(s?.allow_negative_balance ?? 0) !== 0,
  };
}

// Calcula cada renglón y los totales de la venta. Lanza ErrorNegocio(400) si algo no cuadra.
async function calcularVenta(tx, details, id_user) {
  if (!Array.isArray(details) || details.length === 0) {
    throw new ErrorNegocio(400, 'Venta sin productos');
  }
  if (details.length > MAX_RENGLONES) {
    throw new ErrorNegocio(400, `Una venta admite hasta ${MAX_RENGLONES} renglones`);
  }

  const config = await leerConfigVentas(tx);
  const lineas = [];

  // Todos los productos de la venta en una consulta (dentro de la transacción:
  // su stock es el vigente y nadie lo cambia mientras tanto)
  const idsProductos = [...new Set(details.map((d) => idEntero(d.product_id)).filter(Boolean))];
  const productos = new Map(
    (await tx.products.findMany({ where: { id: { in: idsProductos } } })).map((p) => [p.id, p])
  );

  // Autorizaciones de precio libre ya usadas (una consulta para todas)
  const jtis = details
    .filter((d) => d.autorizacion_precio)
    .map((d) => verificarAutorizacionPrecio(d.autorizacion_precio, d.product_id, id_user)?.jti)
    .filter(Boolean);
  const usadas = new Set(
    jtis.length
      ? (await tx.autorizaciones_usadas.findMany({ where: { jti: { in: jtis } }, select: { jti: true } })).map((u) => u.jti)
      : []
  );

  for (const d of details) {
    const cantidad = Number(d.quantity);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ErrorNegocio(400, 'Cada producto debe llevar una cantidad entera mayor a cero');
    }

    const producto = productos.get(idEntero(d.product_id));
    if (!producto) throw new ErrorNegocio(400, `Producto no encontrado: ${d.product_id}`);
    if (Number(producto.activo) === 0) throw new ErrorNegocio(400, `Producto inactivo: ${producto.articulo}`);

    // Precio unitario: el del catálogo, o el libre si viene autorizado
    let precio;
    let precioLibre = false;
    let jti = null;
    if (d.autorizacion_precio) {
      const autorizacion = verificarAutorizacionPrecio(d.autorizacion_precio, producto.id, id_user);
      if (!autorizacion) {
        throw new ErrorNegocio(400, `La autorización de precio de ${producto.articulo} no es válida o ya venció`);
      }
      if (usadas.has(autorizacion.jti) || lineas.some((l) => l.jti === autorizacion.jti)) {
        throw new ErrorNegocio(400, `La autorización de precio de ${producto.articulo} ya se usó; pide una nueva`);
      }
      ({ precio, jti } = autorizacion);
      precioLibre = true;
    } else {
      const tipo = d.tipo_precio || 'menudeo';
      if (!TIPOS_PRECIO.includes(tipo)) throw new ErrorNegocio(400, `Tipo de precio no válido: ${tipo}`);
      precio = Math.round(producto[`precio_${tipo}`] || 0);
      if (precio <= 0) throw new ErrorNegocio(400, `${producto.articulo} no tiene precio de ${tipo}`);
    }

    // Descuento: solo si está permitido y sin pasar del máximo
    const descuentoPct = Number(d.discount_pct || 0);
    if (!Number.isFinite(descuentoPct) || descuentoPct < 0 || descuentoPct > 100) {
      throw new ErrorNegocio(400, 'El descuento debe estar entre 0 y 100%');
    }
    if (descuentoPct > 0 && !config.permiteDescuentos) {
      throw new ErrorNegocio(400, 'Los descuentos están desactivados');
    }
    if (descuentoPct > config.descuentoMaximo) {
      throw new ErrorNegocio(400, `El descuento máximo permitido es ${config.descuentoMaximo}%`);
    }

    const bruto = precio * cantidad;
    const descuento = Math.round((bruto * descuentoPct) / 100);
    const importe = bruto - descuento; // con IVA incluido

    // Desglose del IVA incluido en el precio
    const ivaPct = producto.iva ? IVA_PCT : 0;
    const base = Math.round((importe * 100) / (100 + ivaPct));
    const iva = importe - base;

    lineas.push({
      producto,
      product_id: producto.id,
      articulo: producto.articulo,
      quantity: cantidad,
      base_price: precio,
      price: Math.round(importe / cantidad),
      discount_pct: descuentoPct,
      discount_amount: descuento,
      subtotal: base,
      tax_rate: ivaPct,
      tax_amount: iva,
      tax_type: ivaPct > 0 ? 'IVA' : 'EXENTO',
      precio_libre: precioLibre,
      // Costo del catálogo en este momento (centavos); sin costo = null. La
      // utilidad de la venta usa siempre este, aunque el costo cambie después.
      costo_unitario: producto.costo ?? null,
      jti,
      importe,
    });
  }

  const sumar = (campo) => lineas.reduce((suma, l) => suma + l[campo], 0);

  return {
    config,
    lineas,
    subtotal: sumar('subtotal'),
    tax_total: sumar('tax_amount'),
    discount_total: sumar('discount_amount'),
    total: sumar('importe'),
  };
}

// Pagos recibidos → centavos, con forma de pago válida. Lanza ErrorNegocio(400).
function leerPagos(pagos, metodosValidos) {
  if (!Array.isArray(pagos)) throw new ErrorNegocio(400, 'Los pagos deben ser una lista');

  return pagos.map((p) => {
    const monto = aCentavos(p.amount);
    if (!monto || monto <= 0) throw new ErrorNegocio(400, 'Cada pago debe tener un monto mayor a cero');
    if (!metodosValidos.includes(p.method)) throw new ErrorNegocio(400, `Forma de pago no válida: ${p.method}`);
    return {
      method: p.method,
      amount: monto,
      bank: p.method === 'tarjeta' ? p.bank || null : null,
      last4: p.method === 'tarjeta' ? p.last4 || null : null,
      reference: p.reference || null,
    };
  });
}

module.exports = {
  TIPOS_PRECIO,
  calcularVenta,
  leerPagos,
  firmarAutorizacionPrecio,
  verificarAutorizacionPrecio,
};
