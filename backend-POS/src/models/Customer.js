// src/models/Customer.js
// Alta, consulta, edición, baja y búsqueda con Prisma. moverSaldo va dentro de
// la transacción de ventas y abonos.
const { prisma } = require('../config/prisma');
const { filaAPesos, filasAPesos } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');

// Campos que se pueden modificar con update(). current_balance NO está: el
// saldo solo cambia con moverSaldo, que deja historial.
const CAMPOS_EDITABLES = [
  'first_name', 'last_name_paternal', 'last_name_maternal',
  'phone', 'email', 'address', 'rfc', 'postal_code', 'city',
];

// Texto o null (SQLite guardaba lo que llegara; Prisma exige texto)
const texto = (v) => (v === undefined || v === null || v === '' ? null : String(v));

class Customer {
  // Un cliente nuevo empieza sin saldo: el saldo solo cambia con moverSaldo
  static async create(data) {
    const datos = {};
    for (const campo of CAMPOS_EDITABLES) datos[campo] = texto(data[campo]);
    const cliente = await prisma.customers.create({ data: { ...datos, current_balance: 0 } });
    return cliente.id;
  }

  static async findAll() {
    return filasAPesos(await prisma.customers.findMany({ orderBy: { id: 'asc' } }), 'customers');
  }

  static async findById(id) {
    return filaAPesos(await prisma.customers.findUnique({ where: { id } }), 'customers');
  }

  // Solo campos de la lista fija; lo demás (incluido current_balance) se ignora.
  // Devuelve false si no existe.
  static async update(id, data) {
    const cambios = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (data[campo] !== undefined) cambios[campo] = data[campo] === null ? null : String(data[campo]);
    }
    if (Object.keys(cambios).length === 0) {
      return (await prisma.customers.count({ where: { id } })) > 0;
    }
    const { count } = await prisma.customers.updateMany({ where: { id }, data: cambios });
    return count > 0;
  }

  // Mueve el saldo (lo que el cliente debe) y deja historial. Va DENTRO de una
  // transacción (tx de Prisma). centavos > 0 aumenta la deuda, < 0 la reduce.
  // Devuelve el saldo nuevo en centavos.
  static async moverSaldo(tx, id, centavos, saleId, description) {
    const row = await tx.customers.findUnique({ where: { id }, select: { current_balance: true } });
    if (!row) throw new Error('Cliente no encontrado');

    const previousBalance = Math.round(row.current_balance || 0);
    const newBalance = previousBalance + centavos;
    const { date, time } = ahoraNegocio();

    await tx.customers.update({ where: { id }, data: { current_balance: newBalance } });
    await tx.customer_balance_history.create({
      data: {
        customer_id: id,
        date,
        time,
        sale_id: saleId ?? null,
        previous_balance: previousBalance,
        amount: centavos,
        new_balance: newBalance,
        description,
      },
    });
    return newBalance;
  }


  // Devuelve false si no existe. Si tiene ventas o historial de saldo, SQLite
  // rechaza el borrado (llave foránea) y Prisma lanza el error P2003.
  static async delete(id) {
    const { count } = await prisma.customers.deleteMany({ where: { id } });
    return count > 0;
  }

  // Busca por nombre, apellidos o teléfono (máximo 20)
  static async search(q) {
    const filas = await prisma.customers.findMany({
      where: {
        OR: [
          { first_name: { contains: q } },
          { last_name_paternal: { contains: q } },
          { last_name_maternal: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      select: {
        id: true, first_name: true, last_name_paternal: true, last_name_maternal: true,
        phone: true, current_balance: true,
      },
      take: 20,
    });
    return filasAPesos(filas, 'customers');
  }
}

module.exports = Customer;
