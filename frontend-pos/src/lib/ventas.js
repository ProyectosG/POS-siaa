"use client"

import { enviarOperacion } from "@/lib/apiFetch"

// Redondea a centavos, igual que el servidor
export const aCentavosPesos = (n) => Math.round(Number(n || 0) * 100) / 100

/**
 * Renglones de la venta para el servidor. Solo van producto, cantidad, cuál de
 * los precios del catálogo, % de descuento y, si hay precio libre, su
 * autorización: los montos los calcula el servidor.
 */
export function armarRenglones(items) {
  return items
    .filter((i) => i.productId)
    .map((i) => ({
      product_id: i.productId,
      quantity: i.cantidad,
      tipo_precio: i.tipoPrecio === "libre" ? undefined : i.tipoPrecio || "menudeo",
      discount_pct: i.descuentoPct || 0,
      autorizacion_precio: i.tipoPrecio === "libre" ? i.autorizacionPrecio : undefined,
    }))
}

/**
 * Envía la venta con su Idempotency-Key (ver enviarOperacion en apiFetch.js).
 * Devuelve { ok, data, mensaje }.
 */
export async function enviarVenta(saleData, claveRef) {
  const { ok, status, data } = await enviarOperacion(`/sales`, saleData, claveRef)
  if (ok) return { ok: true, data }

  // 409 con total_servidor: los precios cambiaron entre la pantalla y el servidor
  if (status === 409 && data.total_servidor !== undefined) {
    return {
      ok: false,
      data,
      mensaje: `${data.error}. Total en pantalla $${Number(data.total_esperado).toFixed(2)}, total real $${Number(data.total_servidor).toFixed(2)}`,
    }
  }
  return { ok: false, data, mensaje: data.error || "Error al guardar venta" }
}
