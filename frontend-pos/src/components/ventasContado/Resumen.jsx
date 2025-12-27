"use client"

import { Receipt } from "lucide-react"

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function Resumen({
  subtotal,
  ivaTotal,
  descuentoTotal,
  granTotal,
}) {
  return (
    <div className="border rounded-md p-5">
      <h3 className="flex items-center gap-2 font-semibold mb-3">
        <Receipt className="w-5 h-5" />
        Resumen
      </h3>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${fmt(subtotal)}</span>
        </div>

        <div className="flex justify-between">
          <span>IVA</span>
          <span>${fmt(ivaTotal)}</span>
        </div>

        <div className="flex justify-between text-blue-600">
          <span>Descuento</span>
          <span>- ${fmt(descuentoTotal)}</span>
        </div>

        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Total</span>
          <span>${fmt(granTotal)}</span>
        </div>
      </div>
    </div>
  )
}
