// models/SaleDetail.js

class SaleDetail {
  // Va DENTRO de una transacción (tx de Prisma); los montos ya vienen en centavos
  static async crear(tx, d) {
    const renglon = await tx.sale_details.create({
      data: {
        sale_id: d.sale_id,
        product_id: d.product_id,
        articulo: d.articulo || null,
        quantity: d.quantity,
        base_price: d.base_price,
        price: d.price,
        discount_pct: d.discount_pct,
        discount_amount: d.discount_amount,
        subtotal: d.subtotal,
        tax_rate: d.tax_rate,
        tax_amount: d.tax_amount,
        tax_type: d.tax_type,
        precio_libre: d.precio_libre ? 1 : 0,
        costo_unitario: d.costo_unitario ?? null,
      },
      select: { id: true },
    });
    return renglon.id;
  }

  // Todos los renglones de una venta en una sola inserción (mismo orden)
  static async crearVarios(tx, renglones) {
    await tx.sale_details.createMany({
      data: renglones.map((d) => ({
        sale_id: d.sale_id,
        product_id: d.product_id,
        articulo: d.articulo || null,
        quantity: d.quantity,
        base_price: d.base_price,
        price: d.price,
        discount_pct: d.discount_pct,
        discount_amount: d.discount_amount,
        subtotal: d.subtotal,
        tax_rate: d.tax_rate,
        tax_amount: d.tax_amount,
        tax_type: d.tax_type,
        precio_libre: d.precio_libre ? 1 : 0,
        costo_unitario: d.costo_unitario ?? null,
      })),
    });
  }
}

module.exports = SaleDetail;
