// src/controllers/reportes.controller.js
const { prisma } = require('../config/prisma');
const { aPesos } = require('../utils/dinero');
const { FECHA, rangoPeriodo, calcularUtilidad } = require('../utils/utilidad');

// Montos del reporte → pesos (los demás campos se quedan igual)
const MONTOS = ['venta_sin_iva', 'costo', 'utilidad', 'importe', 'monto'];
function enPesos(obj) {
  const copia = { ...obj };
  for (const campo of MONTOS) if (campo in copia) copia[campo] = aPesos(copia[campo]);
  return copia;
}

// GET /api/reportes/utilidad?periodo=hoy|semana|mes  ó  ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
exports.utilidad = async (req, res) => {
  try {
    const { periodo, desde, hasta } = req.query;
    let rango;
    if (periodo) {
      rango = rangoPeriodo(String(periodo));
      if (!rango) return res.status(400).json({ error: 'periodo debe ser hoy, semana o mes' });
    } else {
      if (!FECHA.test(String(desde || '')) || !FECHA.test(String(hasta || ''))) {
        return res.status(400).json({ error: 'Indica periodo, o desde y hasta (AAAA-MM-DD)' });
      }
      if (desde > hasta) return res.status(400).json({ error: 'desde no puede ser posterior a hasta' });
      rango = { desde: String(desde), hasta: String(hasta) };
    }

    const ventas = await prisma.sales.findMany({
      where: {
        date: { gte: rango.desde, lte: rango.hasta },
        // (las de estado vacío también cuentan; NOT de Prisma las dejaría fuera)
        OR: [{ status: null }, { status: { not: 'cancelled' } }],
      },
      select: {
        id: true, date: true, type: true, pending_balance: true,
        sale_details: {
          select: {
            product_id: true, articulo: true, quantity: true, subtotal: true,
            tax_amount: true, tax_rate: true, costo_unitario: true,
            products: { select: { articulo: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Nombre: el guardado al vender; si un renglón viejo no lo tiene, el del catálogo
    for (const v of ventas) {
      v.sale_details = v.sale_details.map(({ products, ...d }) => ({ ...d, articulo: d.articulo || products?.articulo || null }));
    }

    const r = calcularUtilidad(ventas);
    res.json({
      ...rango,
      totales: enPesos(r.totales),
      productos: r.productos.map(enPesos),
      dias: r.dias.map(enPesos),
      sin_costo: enPesos(r.sin_costo),
      pendiente: enPesos(r.pendiente),
    });
  } catch (err) {
    console.error('Error en reporte de utilidad:', err);
    res.status(500).json({ error: 'Error al calcular la utilidad' });
  }
};
