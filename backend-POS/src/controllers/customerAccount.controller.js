const { prisma } = require('../config/prisma');
const { aPesos, filasAPesos } = require('../utils/dinero');
const { leerId } = require('../utils/peticion');

// GET /api/customers/:id/estado-cuenta → saldo actual y movimientos (el más reciente primero)
exports.getEstadoCuenta = async (req, res) => {
  const id = leerId(req);

  try {
    const customer = id && (await prisma.customers.findUnique({ where: { id }, select: { current_balance: true } }));
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

    const movimientos = await prisma.customer_balance_history.findMany({
      where: { customer_id: id },
      select: {
        date: true, time: true, sale_id: true,
        previous_balance: true, amount: true, new_balance: true, description: true,
      },
      orderBy: { id: 'desc' },
    });

    res.json({
      current_balance: aPesos(customer.current_balance),
      movements: filasAPesos(movimientos, 'customer_balance_history'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
