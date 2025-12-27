"use client"

import {
  DollarSign,
  CreditCard,
  Wallet,
  ShoppingCart,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function Pago({
  focusArea,
  formaPago,
  setFormaPago,
  efectivo,
  setEfectivo,
  tarjeta,
  setTarjeta,
  cambio,
}) {
  return (
    <div
      className={`border rounded-md p-5 ${
        focusArea === "pago" ? "ring-2 ring-emerald-500" : ""
      }`}
    >
      <h3 className="flex items-center gap-2 font-semibold mb-3">
        <DollarSign className="w-5 h-5" />
        Pago
      </h3>

      <div className="flex gap-2 mb-3">
        <Button
          variant={formaPago === "efectivo" ? "default" : "outline"}
          onClick={() => setFormaPago("efectivo")}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          <Wallet className="w-4 h-4 mr-1" />
          Efectivo
        </Button>

        <Button
          variant={formaPago === "tarjeta" ? "default" : "outline"}
          onClick={() => setFormaPago("tarjeta")}
          className="flex-1"
        >
          <CreditCard className="w-4 h-4 mr-1" />
          Tarjeta
        </Button>
      </div>

      {formaPago !== "tarjeta" && (
        <>
          <Label>Efectivo</Label>
          <Input
            inputMode="decimal"
            value={efectivo}
            onChange={(e) =>
              setEfectivo(Number(e.target.value) || 0)
            }
          />

          <div className="mt-2 bg-emerald-100 text-emerald-700 rounded p-2">
            Cambio: <strong>${fmt(cambio)}</strong>
          </div>
        </>
      )}

      {formaPago === "tarjeta" && (
        <>
          <Label>Tarjeta</Label>
          <Input
            inputMode="decimal"
            value={tarjeta}
            onChange={(e) =>
              setTarjeta(Number(e.target.value) || 0)
            }
          />
        </>
      )}

      <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
        <ShoppingCart className="w-4 h-4 mr-2" />
        Procesar Venta
      </Button>
    </div>
  )
}
