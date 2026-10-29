const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { prisma } = require('../config/prisma');
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
// Ventas del cliente (la más reciente primero), cada una con sus renglones,
// pagos e historial de saldo. Antes eran 3 consultas por venta.
exports.getStatement = async (req, res) => {
  const customerId = leerId(req);
  if (!customerId) return res.json([]);

  try {
    const sales = await prisma.sales.findMany({
      where: { customer_id: customerId },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: {
        payments: { orderBy: { id: 'asc' } },
        customer_balance_history: { orderBy: [{ date: 'desc' }, { time: 'desc' }] },
      },
    });
    if (sales.length === 0) return res.json([]); // Cliente sin ventas

    // Cajero de cada venta (users no tiene relación con sales en el esquema)
    const idsUsuarios = [...new Set(sales.map((s) => s.id_user).filter(Boolean))];
    const usuarios = await prisma.users.findMany({ where: { id: { in: idsUsuarios } }, select: { id: true, nickname: true } });
    const nickname = new Map(usuarios.map((u) => [u.id, u.nickname]));

    const statement = await Promise.all(
      sales.map(async ({ payments, customer_balance_history, ...sale }) => ({
        ...filaAPesos({ ...sale, nickname_user: nickname.get(sale.id_user) ?? null }, 'sales'),
        details: await Sale.renglones(sale.id),
        payments: filasAPesos(payments, 'payments'),
        balance_history: filasAPesos(customer_balance_history, 'customer_balance_history'),
      }))
    );

    res.json(statement);
  } catch (err) {
    console.error('Error en getStatement:', err.message);
    res.status(500).json({ error: 'Error al cargar el estado de cuenta' });
  }
};

// Movimientos de saldo del cliente en orden cronológico
exports.getBalanceHistory = async (req, res) => {
  const id = leerId(req);
  if (!id) return res.json([]);

  try {
    const filas = await prisma.customer_balance_history.findMany({
      where: { customer_id: id },
      select: {
        id: true, date: true, time: true, sale_id: true,
        previous_balance: true, amount: true, new_balance: true, description: true,
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }, { id: 'asc' }],
    });
    const conTipo = filas.map((m) => ({
      ...m,
      movement_type: m.amount > 0 ? 'Venta / Cargo' : m.amount < 0 ? 'Abono / Pago' : 'Ajuste',
    }));
    res.json(filasAPesos(conTipo, 'customer_balance_history'));
  } catch (err) {
    console.error('Error al obtener historial de balance:', err);
    res.status(500).json({ error: err.message });
  }
};
