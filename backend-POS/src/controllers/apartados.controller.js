// src/controllers/apartados.controller.js (o el archivo correspondiente)
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const db = require('../config/database');

exports.getApartadosByCustomer = (req, res) => {
  const { customerId } = req.params;

  db.all(
    `
    SELECT id, date, total, paid, pending_balance, status
    FROM sales
    WHERE customer_id = ?
      AND type = 'APARTADO'
      AND status != 'paid'
    ORDER BY id DESC
    `,
    [customerId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
};

exports.registrarAbono = async (req, res) => {
  const { sale_id, customer_id, amount: totalAmount, pagos } = req.body;

  // Validaciones básicas
  if (!sale_id || !customer_id || !pagos || !Array.isArray(pagos) || pagos.length === 0) {
    return res.status(400).json({ error: 'Datos inválidos: se requiere sale_id, customer_id y un array de pagos' });
  }

  // Validar que haya al menos un pago
  if (pagos.every(p => !p.amount || p.amount <= 0)) {
    return res.status(400).json({ error: 'Al menos un pago debe tener monto positivo' });
  }

  try {
    // 1. Buscar la venta
    const sale = await Sale.findById(sale_id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });

    // 2. Calcular el monto total de los pagos enviados
    const calculatedTotal = pagos.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Validar que la suma de pagos coincida con el monto total enviado
    if (Math.abs(calculatedTotal - Number(totalAmount)) > 0.01) {
      return res.status(400).json({ error: 'La suma de los pagos no coincide con el monto total' });
    }

    // Validar que el abono no exceda el saldo pendiente
    if (calculatedTotal > sale.pending_balance) {
      return res.status(400).json({ error: 'El abono excede el saldo pendiente' });
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().split(' ')[0];

    // 3. Registrar cada pago individualmente → AHORA SÍ GUARDA payment_type
    for (const pago of pagos) {
      const { method, amount, bank, last4, payment_type = 'abono' } = pago; // Default 'abono' por seguridad

      if (!method || !amount || amount <= 0) {
        throw new Error('Cada pago debe tener method y amount positivo');
      }

      // Log para verificar qué llega
      console.log('[DEBUG] Registrando abono:', {
        sale_id,
        method,
        amount: Number(amount),
        payment_type,
        bank,
        last4,
        date
      });

      await Payment.create({
        sale_id,
        method,
        amount: Number(amount),
        payment_type,           // ← ¡AGREGADO! Ahora sí se guarda
        bank: method === 'tarjeta' ? (bank || null) : null,
        last4: method === 'tarjeta' ? (last4 || null) : null,
        date,
      });
    }

    // 4. Actualizar la venta (sumar al paid y restar al pending)
    const newPaid = sale.paid + calculatedTotal;
    const newPending = sale.pending_balance - calculatedTotal;
    const newStatus = newPending <= 0 ? 'paid' : 'pending';

    await new Promise((resolve, reject) => {
      db.run(
        `
        UPDATE sales
        SET paid = ?, pending_balance = ?, status = ?
        WHERE id = ?
        `,
        [newPaid, newPending, newStatus, sale_id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 5. Reducir deuda del cliente (abono = -calculatedTotal)
    await Customer.updateBalance(
      customer_id,
      -calculatedTotal,
      sale_id,
      `Abono mixto a apartado #${sale_id} (${calculatedTotal.toFixed(2)})`
    );

    res.json({
      message: 'Abono registrado correctamente',
      newPaid,
      newPending,
      status: newStatus,
    });
  } catch (err) {
    console.error('Error al registrar abono:', err);
    res.status(500).json({ error: err.message });
  }
};