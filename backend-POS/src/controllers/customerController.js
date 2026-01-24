const Customer = require('../models/Customer');
const db = require('../config/database'); // 

exports.getAll = async (req, res) => {
  try {
    const customers = await Customer.findAll();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = req.body;
    if (!data.first_name) return res.status(400).json({ error: 'first_name requerido' });

    const id = await Customer.create(data);
    res.status(201).json({ id, message: 'Cliente creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    await Customer.update(req.params.id, req.body);
    res.json({ message: 'Cliente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Customer.delete(req.params.id);
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.search = async (req, res) => {
  try {
    const q = req.params.q;
    if (!q || q.length < 2) return res.json([]);

    const customers = await Customer.search(q);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



//...........................GET STATEMENT...........................//
exports.getStatement = async (req, res) => {
  const customerId = req.params.id;

  try {
    // 1. Obtener todas las ventas del cliente
    const sales = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT 
          s.*,
          u.nickname AS nickname_user
        FROM sales s
        LEFT JOIN users u ON s.id_user = u.id
        WHERE s.customer_id = ?
        ORDER BY s.date DESC, s.id DESC
        `,
        [customerId],
        (err, rows) => {
          if (err) {
            console.error('Error consultando ventas:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });

    if (sales.length === 0) {
      return res.json([]); // Cliente sin ventas
    }

    // 2. Enriquecer cada venta con detalles y pagos
    const statement = await Promise.all(
      sales.map(async (sale) => {
        // Detalles de productos
        const details = await new Promise((resolve, reject) => {
          db.all(
            `SELECT * FROM sale_details WHERE sale_id = ?`,
            [sale.id],
            (err, rows) => (err ? reject(err) : resolve(rows || []))
          );
        });

        // Pagos
        const payments = await new Promise((resolve, reject) => {
          db.all(
            `SELECT * FROM payments WHERE sale_id = ?`,
            [sale.id],
            (err, rows) => (err ? reject(err) : resolve(rows || []))
          );
        });

        // Opcional: historial de balance para auditoría
        const balanceHistory = await new Promise((resolve, reject) => {
          db.all(
            `SELECT * FROM customer_balance_history WHERE sale_id = ? ORDER BY date DESC, time DESC`,
            [sale.id],
            (err, rows) => (err ? reject(err) : resolve(rows || []))
          );
        });

        return {
          ...sale,
          details,
          payments,
          balance_history: balanceHistory
        };
      })
    );

    res.json(statement);
  } catch (err) {
    console.error('Error en getStatement:', err.message);
    res.status(500).json({ error: 'Error al cargar el estado de cuenta' });
  }
};

// customerController.js

exports.getBalanceHistory = (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT 
      cbh.id,
      cbh.date,
      cbh.time,
      cbh.sale_id,
      cbh.previous_balance,
      cbh.amount,
      cbh.new_balance,
      cbh.description,
      CASE 
        WHEN cbh.amount > 0 THEN 'Venta / Cargo'
        WHEN cbh.amount < 0 THEN 'Abono / Pago'
        ELSE 'Ajuste'
      END AS movement_type
    FROM customer_balance_history cbh
    WHERE cbh.customer_id = ?
    ORDER BY cbh.date ASC, cbh.time ASC  -- ← ¡Aquí está el cambio! ASC para cronológico ascendente
    `,
    [id],
    (err, rows) => {
      if (err) {
        console.error('Error al obtener historial de balance:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
};