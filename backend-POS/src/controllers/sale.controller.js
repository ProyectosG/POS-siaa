// src/controllers/sale.controller.js
const { prisma } = require('../config/prisma');
const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Kardex = require('../models/Kardex');
const { ErrorNegocio } = require('../config/transaccion');
const { aCentavos, aPesos } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');
const { calcularVenta, leerPagos } = require('../utils/precios');
const { operacionIdempotente, responderError } = require('../utils/idempotencia');
const { leerId } = require('../utils/peticion');

const TIPOS_VENTA = ['contado', 'apartado', 'credito'];
const MOTIVO_KARDEX = { contado: 'VENTA_CONTADO', apartado: 'VENTA_APARTADO', credito: 'VENTA_CREDITO' };

/* =========================
   CONTROLLERS
========================= */

exports.getAll = async (req, res) => {
  try {
    res.json(await Sale.findAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = leerId(req);
    const sale = id && (await Sale.findById(id));
    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const [details, payments, client, cajero] = await Promise.all([
      Sale.renglones(id),
      Payment.findBySaleId(id),
      sale.customer_id
        ? prisma.customers.findUnique({
            where: { id: sale.customer_id },
            select: { id: true, first_name: true, last_name_paternal: true, last_name_maternal: true, phone: true },
          })
        : null,
      sale.id_user ? prisma.users.findUnique({ where: { id: sale.id_user }, select: { id: true, nickname: true } }) : null,
    ]);

    res.json({
      ...sale,
      details,
      payments,
      client: client || null,
      user: cajero ? { id: cajero.id, name: cajero.nickname } : { name: 'admin' },
    });
  } catch (err) {
    console.error('Error al obtener venta por ID:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/sales
 * Cuerpo: { type, customer_id, details: [{ product_id, quantity, tipo_precio,
 *   discount_pct, autorizacion_precio }], payments: [{ method, amount, bank, last4 }],
 *   efectivo_recibido, total_esperado }
 * El servidor calcula precios, IVA, descuentos, total, cambio y saldo. Si el total
 * que vio el cajero (total_esperado) no coincide, responde 409 y no cobra nada.
 * Encabezado obligatorio: Idempotency-Key.
 */
exports.create = async (req, res) => {
  const { type, customer_id, details, payments = [], efectivo_recibido, total_esperado } = req.body;

  // El usuario de la venta sale del token, nunca del cuerpo de la petición
  const { id: id_user, nickname: nickname_user } = req.user;

  try {
    const { status, body } = await operacionIdempotente(req, 'POST /sales', async (tx) => {
      if (!TIPOS_VENTA.includes(type)) throw new ErrorNegocio(400, `Tipo de venta no válido: ${type}`);

      // 1. Precios y totales con el catálogo
      const venta = await calcularVenta(tx, details, id_user);

      const esperado = aCentavos(total_esperado);
      if (esperado == null) throw new ErrorNegocio(400, 'Falta total_esperado (el total que se mostró en pantalla)');
      if (esperado !== venta.total) {
        throw new ErrorNegocio(409, 'Los precios cambiaron, revisa la venta', {
          total_servidor: aPesos(venta.total),
          total_esperado: aPesos(esperado),
        });
      }

      // 2. Pagos
      const pagos = leerPagos(payments, Payment.METODOS);
      const pagado = pagos.reduce((suma, p) => suma + p.amount, 0);

      if (type === 'contado' && pagado !== venta.total) {
        throw new ErrorNegocio(400, pagado < venta.total
          ? 'El pago no cubre el total de la venta'
          : 'Los pagos exceden el total de la venta');
      }
      if (type !== 'contado') {
        if (!customer_id) throw new ErrorNegocio(400, `La venta de ${type} requiere un cliente`);
        const cliente = await tx.get('SELECT id FROM customers WHERE id = ?', [customer_id]);
        if (!cliente) throw new ErrorNegocio(400, 'Cliente no encontrado');
        if (pagado > venta.total) throw new ErrorNegocio(400, 'Los pagos exceden el total de la venta');
        if (type === 'apartado' && pagado <= 0) throw new ErrorNegocio(400, 'El apartado requiere un anticipo');
      }

      // Efectivo: lo aplicado a la venta y el cambio que se entrega
      const efectivoAplicado = pagos.filter((p) => p.method === 'efectivo').reduce((s, p) => s + p.amount, 0);
      const recibido = aCentavos(efectivo_recibido) ?? efectivoAplicado;
      if (recibido < efectivoAplicado) {
        throw new ErrorNegocio(400, 'El efectivo recibido es menor al efectivo aplicado');
      }
      const cambio = recibido - efectivoAplicado;
      const pendiente = venta.total - pagado;

      // 3. Venta, renglones, inventario y kardex
      const { date, time } = ahoraNegocio();
      const saleId = await Sale.crear(tx, {
        date,
        time,
        type,
        movement_reason: MOTIVO_KARDEX[type],
        customer_id: type === 'contado' ? customer_id ?? null : customer_id,
        subtotal: venta.subtotal,
        tax_total: venta.tax_total,
        discount_total: venta.discount_total,
        total: venta.total,
        paid: pagado,
        efectivo_recibido: recibido,
        cambio,
        pending_balance: pendiente,
        status: pendiente > 0 ? 'pending' : 'completed',
        id_user,
        nickname_user,
      });

      for (const l of venta.lineas) {
        await SaleDetail.crear(tx, { ...l, sale_id: saleId });

        // La autorización de precio libre queda gastada con esta venta
        if (l.jti) {
          await tx.run('INSERT INTO autorizaciones_usadas (jti, sale_id, usado) VALUES (?, ?, ?)',
            [l.jti, saleId, `${date} ${time}`]);
        }

        // Stock leído DENTRO de la transacción: dos ventas no venden la misma última pieza
        const { stock } = await tx.get('SELECT stock FROM products WHERE id = ?', [l.product_id]);
        if (stock < l.quantity && !venta.config.permiteStockNegativo) {
          throw new ErrorNegocio(409, `Stock insuficiente para ${l.articulo}. Disponible: ${stock}`);
        }
        const nuevoStock = stock - l.quantity;
        await tx.run('UPDATE products SET stock = ? WHERE id = ?', [nuevoStock, l.product_id]);

        await Kardex.logMovement({
          product_id: l.product_id,
          id_user,
          nickname_user,
          movement_type: 'SALIDA',
          movement_reason: MOTIVO_KARDEX[type],
          previous_stock: stock,
          moved_quantity: l.quantity,
          new_stock: nuevoStock,
          date,
          time,
          related_folio: String(saleId),
        }, tx);
      }

      // 4. Pagos (anticipo en apartado y crédito)
      for (const p of pagos) {
        await Payment.crear(tx, {
          ...p,
          sale_id: saleId,
          payment_type: type === 'contado' ? 'normal' : 'anticipo',
          date,
        });
      }

      // 5. Saldo del cliente: sube por lo que queda pendiente
      if (type !== 'contado' && pendiente > 0) {
        await Customer.moverSaldo(tx, customer_id, pendiente, saleId,
          `Saldo pendiente de ${type} #${saleId}`);
      }

      return {
        status: 201,
        body: {
          id: saleId,
          message: 'Venta creada correctamente',
          total: aPesos(venta.total),
          paid: aPesos(pagado),
          cambio: aPesos(cambio),
          pending_balance: aPesos(pendiente),
        },
      };
    });

    res.status(status).json(body);
  } catch (err) {
    responderError(res, err, 'Error al crear venta');
  }
};

exports.getTicketRange = async (req, res) => {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Faltan parámetros desde/hasta' });
  }

  try {
    res.json(await Sale.rangoTickets(String(desde), String(hasta)));
  } catch (err) {
    console.error('Error al obtener rango de tickets:', err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};
