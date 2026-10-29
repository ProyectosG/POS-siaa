// src/models/settings.model.js (con Prisma)
// La lectura que hace la venta dentro de su transacción sigue en utils/precios.js.
const { prisma } = require('../config/prisma');
const { ahoraUTC } = require('../utils/fechas');

// Campos que se pueden actualizar desde PUT /api/settings (el resto se ignora).
// La clave de precios no está aquí: se cambia aparte con hash (ver updatePriceKey).
const CAMPOS_EDITABLES = [
  'ticket_header_line1', 'ticket_header_line2', 'ticket_header_line3', 'ticket_header_line4',
  'ticket_subheader_line1', 'ticket_subheader_line2', 'ticket_subheader_line3', 'ticket_subheader_line4',
  'ticket_footer_line1', 'ticket_footer_line2',
  'ticket_width', 'auto_print_ticket',
  'allow_discounts', 'max_discount_without_auth', 'allow_negative_balance',
  'customer_form_mode',
  'card_payment_max_reprints',
];

// Tipo de cada campo en la base: SQLite aceptaba texto en columnas numéricas,
// Prisma no. Se convierte igual que lo guardaba SQLite.
const CAMPOS_ENTEROS = ['ticket_width', 'auto_print_ticket', 'allow_discounts', 'allow_negative_balance', 'card_payment_max_reprints'];
const CAMPOS_DECIMALES = ['max_discount_without_auth'];

function convertir(campo, valor) {
  if (valor === null) return null;
  if (CAMPOS_ENTEROS.includes(campo)) {
    if (typeof valor === 'boolean') return valor ? 1 : 0;
    const n = Number(valor);
    if (!Number.isInteger(n)) throw new ErrorCampo(campo);
    return n;
  }
  if (CAMPOS_DECIMALES.includes(campo)) {
    const n = Number(valor);
    if (!Number.isFinite(n)) throw new ErrorCampo(campo);
    return n;
  }
  return String(valor);
}

// Un valor que no es del tipo del campo (el controlador responde 400)
class ErrorCampo extends Error {
  constructor(campo) {
    super(`Valor inválido para ${campo}`);
    this.campo = campo;
  }
}

const Settings = {
  ErrorCampo,

  // Obtener la configuración única (sin la clave de precios)
  get: async () => {
    const row = await prisma.settings.findUnique({ where: { id: 1 } });
    if (row) delete row.dynamic_price_auth_key;
    return row;
  },

  // Hash guardado de la clave para liberar precios
  getPriceKeyHash: async () => {
    const row = await prisma.settings.findUnique({ where: { id: 1 }, select: { dynamic_price_auth_key: true } });
    return row ? row.dynamic_price_auth_key : null;
  },

  // Guarda el hash de la nueva clave de precios. updated_at se pone a mano
  // (texto UTC): Prisma no lo actualiza solo.
  updatePriceKey: async (hash) => {
    await prisma.settings.updateMany({
      where: { id: 1 },
      data: { dynamic_price_auth_key: hash, updated_at: ahoraUTC() },
    });
  },

  // Actualización con lista fija de campos; updated_at a mano (texto UTC)
  update: async (data) => {
    const campos = CAMPOS_EDITABLES.filter((campo) => data[campo] !== undefined);
    if (campos.length === 0) {
      return { message: 'No hay campos válidos para actualizar' };
    }

    const cambios = {};
    for (const campo of campos) cambios[campo] = convertir(campo, data[campo]);
    cambios.updated_at = ahoraUTC();

    const { count } = await prisma.settings.updateMany({ where: { id: 1 }, data: cambios });
    return { changes: count };
  },
};

module.exports = Settings;
