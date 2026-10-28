// src/controllers/apartados.controller.js
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const db = require('../config/database');
const { ErrorNegocio } = require('../config/transaccion');
const { aCentavos, aPesos, filasAPesos } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');
const { leerPagos } = require('../utils/precios');
const { operacionIdempotente, responderError } = require('../utils/idempotencia');

exports.getApartadosByCustomer = (req, res) => {
  const { customerId } = req.params;

  db.all(
    `
    SELECT id, date, total, paid, pending_balance, status
    FROM sales
    WHERE customer_id = ?
      AND LOWER(type) = 'apartado'
      AND status != 'paid'
      AND pending_balance > 0
    ORDER BY id DESC
    `,
    [customerId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(filasAPesos(rows, 'sales'));
    }
  );
};

/**
 * POST /api/apartados/abono
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
      const sale = await tx.get('SELECT * FROM sales WHERE id = ?', [sale_id]);
      if (!sale) throw new ErrorNegocio(404, 'Venta no encontrada');

      // El abono solo aplica a un apartado de ese mismo cliente
      if (
        String(sale.type).toLowerCase() !== 'apartado' ||
        (customer_id !== undefined && customer_id !== null && String(sale.customer_id) !== String(customer_id))
      ) {
        throw new ErrorNegocio(400, 'La venta no es un apartado de este cliente');
      }

      const pendiente = Math.round(sale.pending_balance || 0);
      if (abono > pendiente) throw new ErrorNegocio(400, 'El abono excede el saldo pendiente');

      const { date } = ahoraNegocio();

      for (const p of pagosCentavos) {
        await Payment.crear(tx, { ...p, sale_id, payment_type: 'abono', date });
      }

      const newPaid = Math.round(sale.paid || 0) + abono;
      const newPending = pendiente - abono;
      const newStatus = newPending <= 0 ? 'paid' : 'pending';

      await tx.run(
        'UPDATE sales SET paid = ?, pending_balance = ?, status = ? WHERE id = ?',
        [newPaid, newPending, newStatus, sale_id]
      );

      // Baja la deuda del cliente
      await Customer.moverSaldo(tx, sale.customer_id, -abono, sale.id,
        `Abono a apartado #${sale.id} (${aPesos(abono).toFixed(2)})`);

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
