"use client"

import { Receipt, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function ResumenApartado({
  subtotal,
  ivaTotal,
  descuentoTotal,
  granTotal,
  mostrarDescuento,
  porcentajeApartado,
  setPorcentajeApartado,
  tipoRequisito,
  setTipoRequisito,
  montoFijo,
  setMontoFijo,
  pagoInicialRequerido,
}) {
  const montoRequerido = pagoInicialRequerido || 0
  const esMontoPositivo = montoRequerido > 0

  return (
    <div className="border rounded-xl p-6 space-y-8 bg-white shadow-sm">
      {/* Sección Resumen de totales */}
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
          <Receipt className="w-5 h-5 text-gray-700" />
          Resumen
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${fmt(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA</span>
            <span>${fmt(ivaTotal)}</span>
          </div>

          {mostrarDescuento && descuentoTotal > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>Ahorro</span>
              <span>- ${fmt(descuentoTotal)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-200">
            <span>Total</span>
            <span className="text-xl">${fmt(granTotal)}</span>
          </div>
        </div>
      </div>

      {/* Sección Anticipo requerido – con mayor separación */}
  <div className="space-y-4 pt-6 border-t-2 border-gray-200">
  <div className="flex items-center justify-between">
    <h4 className="flex items-center gap-2 font-semibold text-lg text-gray-800">
      <DollarSign className="w-5 h-5 text-emerald-600" />
      Anticipo requerido
    </h4>

    {/* Toggle compacto con palomitas */}
    <div className="flex items-center gap-3 bg-gray-100 rounded-full p-1">
      <button
        onClick={() => setTipoRequisito("porcentaje")}
        className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
          tipoRequisito === "porcentaje"
            ? "bg-white shadow-sm text-emerald-700"
            : "text-gray-600 hover:text-gray-800"
        }`}
      >
        % Porcentaje
      </button>
      <button
        onClick={() => setTipoRequisito("fijo")}
        className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
          tipoRequisito === "fijo"
            ? "bg-white shadow-sm text-emerald-700"
            : "text-gray-600 hover:text-gray-800"
        }`}
      >
        $ Fijo
      </button>
    </div>
  </div>

  {/* Input + monto destacado */}
    <div className="flex items-end gap-4">
      {tipoRequisito === "porcentaje" ? (
        <div className="flex-1">
          <Label className="text-sm text-gray-600 mb-1 block">Porcentaje</Label>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={100}
              value={porcentajeApartado}
              onChange={(e) => setPorcentajeApartado(Number(e.target.value))}
              className="pl-10 pr-12 text-center h-12 text-xl font-bold border-emerald-300 focus:border-emerald-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-600">%</span>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <Label className="text-sm text-gray-600 mb-1 block">Monto fijo</Label>
          <div className="relative">
            <Input
              type="number"
              min={0}
              step={0.01}
              value={montoFijo}
              onChange={(e) => setMontoFijo(Number(e.target.value))}
              className="pl-10 text-center h-12 text-xl font-bold border-emerald-300 focus:border-emerald-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-600">$</span>
          </div>
        </div>
      )}

      {/* Monto final grande y con palomita si es válido */}
        <div className="min-w-[180px] text-center">
          <p className="text-xs text-gray-500 mb-1">Requerido</p>
          <div className={`text-3xl font-extrabold ${esMontoPositivo ? 'text-emerald-700' : 'text-gray-400'}`}>
            ${fmt(pagoInicialRequerido)}
          </div>
          {esMontoPositivo && (
            <div className="text-emerald-600 text-sm mt-1 flex items-center justify-center gap-1">
              ✓ Listo para cobrar
            </div>
          )}
        </div>
    </div>
  </div>
    </div>
  )
}