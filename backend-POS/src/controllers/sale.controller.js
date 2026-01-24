// src/controllers/sale.controller.js
const db = require('../config/database');
const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');
const Payment = require('../models/Payment');

/* =========================
   HELPERS
========================= */

const getProduct = (id) =>
  new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM products WHERE id = ?',
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

const updateProductStock = (id, stock) =>
  new Promise((resolve, reject) => {
    db.run(
      'UPDATE products SET stock = ? WHERE id = ?',
      [stock, id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

const createKardex = ({
  product_id,
  id_user,
  nickname_user,
  movement_type,
  movement_reason,
  previous_stock,
  moved_quantity,
  new_stock,
  date,
  time,
  related_folio,
}) =>
  new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO kardex (
        product_id,
        id_user,
        nickname_user,
        movement_type,
        movement_reason,
        previous_stock,
        moved_quantity,
        new_stock,
        date,
        time,
        related_folio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product_id,
        id_user,
        nickname_user,
        movement_type,
        movement_reason,
        previous_stock,
        moved_quantity,
        new_stock,
        date,
        time,
        related_folio,
      ],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });

const updateCustomerBalance = (id, amount, saleId, description) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT current_balance FROM customers WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error('Cliente no encontrado'));

      const previousBalance = row.current_balance;
      const newBalance = previousBalance + amount;

      db.run(`UPDATE customers SET current_balance = ? WHERE id = ?`, [newBalance, id], err => {
        if (err) return reject(err);

        const now = new Date();
        const date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const time = now.toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        db.run(`INSERT INTO customer_balance_history (customer_id, date, time, sale_id, previous_balance, amount, new_balance, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, date, time, saleId, previousBalance, amount, newBalance, description],
          err => {
            if (err) return reject(err);
            resolve(newBalance);
          }
        );
      });
    });
  });

/* =========================
   CONTROLLERS
========================= */

exports.getAll = async (req, res) => {
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM sales ORDER BY date DESC, id DESC', [], (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const details = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT sd.*, 
               p.articulo AS articulo
        FROM sale_details sd
        LEFT JOIN products p ON sd.product_id = p.id
        WHERE sd.sale_id = ?
        `,
        [req.params.id],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    const payments = await Payment.findBySaleId(req.params.id);

    let client = null;
    if (sale.customer_id) {
      client = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id, first_name, last_name_paternal, last_name_maternal, phone FROM customers WHERE id = ?',
          [sale.customer_id],
          (err, row) => (err ? reject(err) : resolve(row))
        );
      });
    }

    let user = null;
    if (sale.id_user) {
      user = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id, nickname AS name FROM users WHERE id = ?',
          [sale.id_user],
          (err, row) => (err ? reject(err) : resolve(row))
        );
      });
    }

    res.json({
      ...sale,
      details: details || [],
      payments: payments || [],
      client: client || null,
      user: user || { name: 'admin' },
    });
  } catch (err) {
    console.error('Error al obtener venta por ID:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  console.log('[DEBUG] Body recibido en /sales:', JSON.stringify(req.body, null, 2));

  const {
    date,
    time,
    type,
    movement_reason,
    customer_id,
    subtotal,
    tax_total,
    discount_total,
    total,
    paid,
    pending_balance,
    status,
    details = [],
    payments = [],
    id_user,
    nickname_user,
    efectivo_recibido,
    cambio
  } = req.body;

  // === CONSOLES PARA DEBUG ===
  console.log('[DEBUG] Tipo de venta recibida:', type);
  console.log('[DEBUG] Pagos recibidos desde frontend:', JSON.stringify(payments, null, 2));
  console.log('[DEBUG] paid:', paid);
  console.log('[DEBUG] pending_balance:', pending_balance);

  if (!id_user || !nickname_user) {
    return res.status(400).json({ error: 'Usuario no válido' });
  }

  if (!details.length) {
    return res.status(400).json({ error: 'Venta sin productos' });
  }

  const calculated_subtotal = subtotal ?? details.reduce(
    (sum, d) => sum + Number(d.subtotal || 0),
    0
  );

  const calculated_tax_total = tax_total ?? details.reduce(
    (sum, d) => sum + Number(d.tax_amount || 0),
    0
  );

  const calculated_discount_total = discount_total ?? details.reduce(
    (sum, d) => sum + Number(d.discount_amount || 0),
    0
  );

  let final_total;
  if (total && total > 0 && Math.abs(total - (calculated_subtotal + calculated_tax_total - calculated_discount_total)) < 1) {
    final_total = total;
  } else {
    final_total = calculated_subtotal + calculated_tax_total - calculated_discount_total;
  }

  const final_paid = paid ?? 0;
  const final_pending_balance = pending_balance ?? Math.max(final_total - final_paid, 0);

  const final_efectivo_recibido = Number(efectivo_recibido) || 0;
  const final_cambio = Number(cambio) || 0;

  const now = new Date();
  let saleDate = date || now.toISOString().split('T')[0];

  saleDate = saleDate.replace(/\//g, '-').replace(/\s+/g, '').trim();

  if (!saleDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.warn('[WARNING] Formato de date inválido, usando fecha actual:', saleDate);
    saleDate = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  }

  let saleTime = time || now.toTimeString().split(' ')[0];

  saleTime = saleTime.replace(/\s+/g, '').trim();
  if (!saleTime.match(/^\d{2}:\d{2}:\d{2}$/)) {
    console.warn('[WARNING] Formato de time inválido, usando fallback:', saleTime);
    saleTime = now.toTimeString().split(' ')[0];
  }

  console.log('[DEBUG] Valores finales antes de insertar:', {
    saleDate,
    saleTime,
    type,
    movement_reason,
    nickname_user,
    final_paid,
    final_efectivo_recibido,
    final_cambio
  });

  try {
    await new Promise((resolve, reject) =>
      db.run('BEGIN TRANSACTION', (err) =>
        err ? reject(err) : resolve()
      )
    );

    let saleId;
    try {
      saleId = await Sale.create({
        date: saleDate,
        time: saleTime,
        type,
        movement_reason: movement_reason || null,
        customer_id: customer_id ?? null,
        subtotal: calculated_subtotal,
        tax_total: calculated_tax_total,
        discount_total: calculated_discount_total,
        total: final_total,
        paid: final_paid,
        efectivo_recibido: final_efectivo_recibido,
        cambio: final_cambio,
        pending_balance: final_pending_balance,
        status: status || (final_pending_balance > 0 ? 'pending' : 'completed'),
        id_user,
        nickname_user,
      });
    } catch (insertErr) {
      console.error('[CRITICAL] Error específico en INSERT de sales:', insertErr);
      throw insertErr;
    }

    console.log('[DEBUG] Venta creada con ID:', saleId);

    await SaleDetail.createMany(
      details.map((d) => ({
        sale_id: saleId,
        product_id: d.product_id,
        quantity: d.quantity,
        price: d.price,
        subtotal: d.subtotal,
        base_price: d.base_price,
        discount_pct: d.discount_pct ?? 0,
        discount_amount: d.discount_amount ?? 0,
        tax_rate: d.tax_rate ?? 0,
        tax_amount: d.tax_amount ?? 0,
        tax_type: d.tax_type ?? 'EXENTO',
      }))
    );

    for (const d of details) {
      const product = await getProduct(d.product_id);

      if (!product) {
        throw new Error(`Producto no encontrado: ${d.product_id}`);
      }

      if (product.stock < d.quantity) {
        throw new Error(`Stock insuficiente para producto ${d.product_id}`);
      }

      const newStock = product.stock - d.quantity;

      await updateProductStock(d.product_id, newStock);

      await createKardex({
        product_id: d.product_id,
        id_user,
        nickname_user,
        movement_type: 'SALIDA',
        movement_reason: movement_reason || 'VENTA',
        previous_stock: product.stock,
        moved_quantity: d.quantity,
        new_stock: newStock,
        date: saleDate,
        time: saleTime,
        related_folio: String(saleId),
      });
    }

    if (customer_id) {
      if (type === 'credito' && final_pending_balance > 0) {
        await updateCustomerBalance(customer_id, final_pending_balance, saleId, `Deuda por venta crédito #${saleId}`);
      } else if (type === 'apartado' && final_paid > 0) {
        await updateCustomerBalance(customer_id, final_paid, saleId, `Anticipo por venta apartado #${saleId}`);
      }
    }

    const totalPayments = payments.reduce((a, p) => a + Number(p.amount || 0), 0);

    if (Math.abs(totalPayments - final_paid) > 0.01) {
      throw new Error('Los pagos no coinciden con el total pagado');
    }

    // === CONSOLE CLAVE: Qué payment_type se está guardando realmente ===
    console.log('[DEBUG] Pagos que se van a guardar en BD:');
    for (const p of payments) {
      console.log(`   - Método: ${p.method}, Monto: ${p.amount}, payment_type: ${p.payment_type || 'normal (por default)'}`);
      await Payment.create({
        sale_id: saleId,
        method: p.method,
        amount: p.amount,
        payment_type: p.payment_type || 'normal',  // ← Aquí se guarda lo que llegue o 'normal'
        bank: p.bank || null,
        last4: p.last4 || null,
        reference: p.reference || null,
        date: saleDate,
      });
    }

    await new Promise((resolve, reject) =>
      db.run('COMMIT', (err) =>
        err ? reject(err) : resolve()
      )
    );

    res.status(201).json({
      id: saleId,
      message: 'Venta creada correctamente',
    });
  } catch (err) {
    console.error('❌ ERROR AL CREAR VENTA:', err);

    await new Promise((resolve) =>
      db.run('ROLLBACK', () => resolve())
    );

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.getTicketRange = (req, res) => {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Faltan parámetros desde/hasta' });
  }

  const query = `
    SELECT MIN(id) AS firstTicket, MAX(id) AS lastTicket
    FROM sales
    WHERE date >= ? AND date <= ?
  `;

  db.get(query, [desde, hasta], (err, row) => {
    if (err) {
      console.error('Error al obtener rango de tickets:', err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }

    res.json({
      firstTicket: row.firstTicket || null,
      lastTicket: row.lastTicket || null
    });
  });
};