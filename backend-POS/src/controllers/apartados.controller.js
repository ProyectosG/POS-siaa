// src/controllers/apartados.controller.js
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const { prisma } = require('../config/prisma');
const { ErrorNegocio } = require('../config/transaccion');
const { aCentavos, aPesos, filasAPesos } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');
const { leerPagos } = require('../utils/precios');
const { operacionIdempotente, responderError } = require('../utils/idempotencia');
const { idEntero } = require('../utils/peticion');

// Ventas que se pagan con abonos (la ruta conserva el nombre /apartados/abono)
const TIPOS_CON_ABONO = { apartado: 'apartado', credito: 'crédito' };

// Apartados del cliente con saldo pendiente (el más reciente primero)
exports.getApartadosByCustomer = async (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isInteger(customerId) || customerId <= 0) return res.json([]);

  try {
    const filas = await prisma.sales.findMany({
      where: { customer_id: customerId, status: { not: 'paid' }, pending_balance: { gt: 0 } },
      select: { id: true, type: true, date: true, total: true, paid: true, pending_balance: true, status: true },
      orderBy: { id: 'desc' },
    });
    // El tipo sin distinguir mayúsculas (las ventas viejas guardaban 'APARTADO')
    const apartados = filas
      .filter((f) => String(f.type).toLowerCase() === 'apartado')
      .map(({ type, ...f }) => f);
    res.json(filasAPesos(apartados, 'sales'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/apartados/abono  (apartados y créditos)
 * Cuerpo: { sale_id, customer_id, amount, pagos: [{ method, amount, bank, last4 }] }
 * Todo en una transacción: pagos, venta y saldo del cliente, o nada.
 * Encabezado obligatorio: Idempotency-Key.
 */
exports.registrarAbono = async (req, res) => {
  const { sale_id, customer_id, amount: totalAmount, pagos } = req.body;

  try {
    const { status, body } = await operacionIdempotente(req, 'POST /apartados/abono', async (tx) => {
      if (!sale_id || !Array.isArray(pagos) || pagos.length === 0) {
        throw new ErrorNegocio(400, 'Datos inválidos: se requiere sale_id y un array de pagos');
      }

      const pagosCentavos = leerPagos(pagos, Payment.METODOS);
      const abono = pagosCentavos.reduce((suma, p) => suma + p.amount, 0);

      // Si viene el monto total, debe coincidir con la suma de los pagos
      if (totalAmount !== undefined && aCentavos(totalAmount) !== abono) {
        throw new ErrorNegocio(400, 'La suma de los pagos no coincide con el monto total');
      }

      // La venta se lee DENTRO de la transacción: dos abonos no pueden pasarse del saldo
      const idVenta = idEntero(sale_id);
      const sale = idVenta && (await tx.sales.findUnique({ where: { id: idVenta } }));
      if (!sale) throw new ErrorNegocio(404, 'Venta no encontrada');

      // El abono solo aplica a un apartado o crédito de ese mismo cliente (nunca a contado)
      const tipo = String(sale.type).toLowerCase();
      if (
        !TIPOS_CON_ABONO[tipo] ||
        (customer_id !== undefined && customer_id !== null && String(sale.customer_id) !== String(customer_id))
      ) {
        throw new ErrorNegocio(400, 'La venta no es un apartado ni un crédito de este cliente');
      }

      const pendiente = Math.round(sale.pending_balance || 0);
      if (abono > pendiente) throw new ErrorNegocio(400, 'El abono excede el saldo pendiente');

      const { date } = ahoraNegocio();

      await Payment.crearVarios(tx, pagosCentavos.map((p) => ({ ...p, sale_id: sale.id, payment_type: 'abono', date })));

      const newPaid = Math.round(sale.paid || 0) + abono;
      const newPending = pendiente - abono;
      const newStatus = newPending <= 0 ? 'paid' : 'pending';

      await tx.sales.update({
        where: { id: sale.id },
        data: { paid: newPaid, pending_balance: newPending, status: newStatus },
      });

      // Baja la deuda del cliente
      await Customer.moverSaldo(tx, sale.customer_id, -abono, sale.id,
        `Abono a ${TIPOS_CON_ABONO[tipo]} #${sale.id} (${aPesos(abono).toFixed(2)})`);

      return {
        status: 200,
        body: {
          message: 'Abono registrado correctamente',
          newPaid: aPesos(newPaid),
          newPending: aPesos(newPending),
          status: newStatus,
        },
      };
    });

    res.status(status).json(body);
  } catch (err) {
    responderError(res, err, 'Error al registrar abono');
  }
};
