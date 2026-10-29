const Customer = require('../models/Customer');
const db = require('../config/database');
const { filaAPesos, filasAPesos } = require('../utils/dinero');
const { leerId, tieneRelacionados } = require('../utils/peticion');

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
    const id = leerId(req);
    const customer = id && (await Customer.findById(id));
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
    const id = leerId(req);
    // El saldo (current_balance) se ignora aquí: solo lo mueve moverSaldo
    const existe = id && (await Customer.update(id, req.body));
    if (!existe) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = leerId(req);
    const existe = id && (await Customer.delete(id));
    if (!existe) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    if (tieneRelacionados(err)) {
      return res.status(409).json({ error: 'No se puede eliminar: el cliente tiene ventas o movimientos de saldo' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.search = async (req, res) => {
  try {
    const q = String(req.params.q || '').trim();
    if (q.length < 2) return res.json([]);

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
          ...filaAPesos(sale, 'sales'),
          details: filasAPesos(details, 'sale_details'),
          payments: filasAPesos(payments, 'payments'),
          balance_history: filasAPesos(balanceHistory, 'customer_balance_history')
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
      res.json(filasAPesos(rows, 'customer_balance_history'));
    }
  );
};