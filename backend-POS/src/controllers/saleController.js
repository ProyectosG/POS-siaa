// src/controllers/saleController.js
const db = require('../config/database');
const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');
const Payment = require('../models/Payment');


const getProduct = (id) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) reject(err);
    resolve(row);
  });
});

const updateProductStock = (id, stock) => new Promise((resolve, reject) => {
  db.run('UPDATE products SET stock = ? WHERE id = ?', [stock, id], (err) => {
    if (err) reject(err);
    resolve();
  });
});

const createKardex = ({ product_id, movement_type, previous_stock, moved_quantity, new_stock, date, time, related_folio }) => new Promise((resolve, reject) => {
  db.run(
    `INSERT INTO kardex (product_id, movement_type, previous_stock, moved_quantity, new_stock, date, time, related_folio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [product_id, movement_type, previous_stock, moved_quantity, new_stock, date, time, related_folio],
    function (err) {
      if (err) reject(err);
      resolve(this.lastID);
    }
  );
});

const updateCustomerBalance = (id, amount) => new Promise((resolve, reject) => {
  db.run('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?', [amount, id], (err) => {
    if (err) reject(err);
    resolve();
  });
});

const createPayment = ({ sale_id, amount, date }) => new Promise((resolve, reject) => {
  db.run('INSERT INTO payments (sale_id, amount, date) VALUES (?, ?, ?)', [sale_id, amount, date], (err) => {
    if (err) reject(err);
    resolve();
  });
});

exports.getAll = async (req, res) => {
  try {
    const sales = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM sales', [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    const details = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM sale_details WHERE sale_id = ?', [req.params.id], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    res.json({ ...sale, details });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const {
    date,
    type,
    customer_id,
    total,
    paid,
    status,
    details,
    payments = []
  } = req.body;
  
  const pending_balance = total - paid;
  
  try {
    await new Promise((resolve, reject) =>
      db.run('BEGIN TRANSACTION', err => err ? reject(err) : resolve())
  );
  
  /* =========================
  1️⃣ CREAR VENTA
  ========================= */
  const saleId = await Sale.create({
    date,
    type,
    customer_id,
    total,
    paid,
    pending_balance,
    status
  });
  
  /* =========================
  2️⃣ DETALLE DE VENTA
    ========================= */
  await SaleDetail.createMany(
    details.map(d => ({
      sale_id: saleId,
      product_id: d.product_id,
      quantity: d.quantity,
      price: d.price,              // precio final
      subtotal: d.subtotal,
      base_price: d.base_price ?? d.price,
      discount_pct: d.discount_pct ?? 0,
      discount_amount: d.discount_amount ?? 0
    }))
  );
  
  console.log("DESPUES DE DETALLEW DE LA VENTA LINE 123",req.body);

    /* =========================
       3️⃣ INVENTARIO + KARDEX
    ========================= */
    for (const d of details) {
      const product = await getProduct(d.product_id);

       if (product.stock < d.quantity) {
         throw new Error(`Stock insuficiente para producto ${d.product_id}`);
       }

      const newStock = product.stock - d.quantity;
      await updateProductStock(d.product_id, newStock);

      const now = new Date();
      await createKardex({
        product_id: d.product_id,
        movement_type: 'venta',
        previous_stock: product.stock,
        moved_quantity: -d.quantity,
        new_stock: newStock,
        date: now.toISOString().split('T')[0],
        time: now.toISOString().split('T')[1].slice(0, 8),
        related_folio: `Venta ${saleId}`
      });
    }

    /* =========================
       4️⃣ CUENTA CLIENTE (CRÉDITO)
    ========================= */
    if (type === 'credito' && customer_id) {
      await updateCustomerBalance(customer_id, pending_balance);
    }

    /* =========================
       5️⃣ PAGOS (EFECTIVO / TARJETA / MIXTO)
    ========================= */
   if (payments.length > 0) {
  const totalPayments = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  if (totalPayments !== paid) {
    throw new Error('La suma de los pagos no coincide con el monto pagado');
  }

  for (const p of payments) {
    console.log('INSERT PAYMENT =>', {
      sale_id: saleId,
      method: p.method,
      amount: p.amount,
      bank: p.bank,
      last4: p.last4,
      reference: p.reference,
      date
    });

    await Payment.create({
      sale_id: saleId,
      method: p.method,          // ✅ YA NO SE PIERDE
      amount: p.amount,
      bank: p.bank || null,
      last4: p.last4 || null,
      reference: p.reference || null,
      date
    });
  }
}


    await new Promise((resolve, reject) =>
      db.run('COMMIT', err => err ? reject(err) : resolve())
    );

    res.status(201).json({
      id: saleId,
      message: 'Venta creada correctamente'
    });
} catch (err) {
  console.error('❌ ERROR AL CREAR VENTA:', err);
  await new Promise(resolve => db.run('ROLLBACK', () => resolve()));
  res.status(500).json({
    error: err.message,
    stack: err.stack
  });
}

 
};
