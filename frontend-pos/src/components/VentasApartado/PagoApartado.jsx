"use client"

import {
  DollarSign,
  CreditCard,
  Wallet,
  ShoppingCart,
  Building2,
} from "lucide-react"
import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const BANCOS_MEXICO = [
  "BBVA",
  "Banorte",
  "Santander",
  "Citibanamex",
  "HSBC",
  "Banregio",
  "Scotiabank",
  "Inbursa",
  "Ban Bajío",
  "Afirme",
]

export default function PagoApartado({
  focusArea,
  formaPago,
  setFormaPago,
  efectivo,
  setEfectivo,
  cambio,
  total,                    // total completo de la venta
  bancoTarjeta,
  setBancoTarjeta,
  ultimos4Tarjeta,
  setUltimos4Tarjeta,
  tarjeta,
  setTarjeta,
  onProcesarVenta,
  pagoInicialRequerido,     // ← NUEVA PROP: monto mínimo que debe cubrirse
}) {
  const efectivoRef = useRef(null)
  const procesarRef = useRef(null)

  useEffect(() => {
    if (focusArea === "pago" && formaPago === "efectivo") {
      requestAnimationFrame(() => {
        efectivoRef.current?.focus()
        efectivoRef.current?.select()
      })
    }
  }, [focusArea, formaPago])

  useEffect(() => {
    if (focusArea === "pago") {
      setFormaPago("efectivo")
    }
  }, [focusArea])

  // Monto pendiente en efectivo para cubrir el anticipo (no el total)
  const montoEfectivoPendiente = Math.max(0, pagoInicialRequerido - Number(tarjeta || 0))
  
  const pagoActual = Number(efectivo || 0) + Number(tarjeta || 0)

  const efectivoSuficiente = Number(efectivo || 0) >= montoEfectivoPendiente
  const tarjetaCompleta = Number(tarjeta || 0) > 0 && bancoTarjeta && ultimos4Tarjeta.length === 4 && /^\d{4}$/.test(ultimos4Tarjeta)

  // Puede procesar si se cubre al menos el anticipo requerido
  const pagoCumpleRequisito = pagoActual >= pagoInicialRequerido

  const puedeProcesar = pagoCumpleRequisito &&
    (formaPago === "efectivo"
      ? efectivoSuficiente
      : tarjetaCompleta)

  return (
    <div
      className={`
        relative rounded-md p-5 transition-all duration-300
        ${focusArea === "pago"
          ? `
            border-2 border-emerald-500
            ring-4 ring-emerald-400/30
            shadow-[0_0_0_3px_rgba(16,185,129,0.25),0_10px_25px_-5px_rgba(0,0,0,0.4)]
            `
          : "border"}
      `}
    >
      <h3 className="flex items-center gap-2 font-semibold mb-4">
        <DollarSign className="w-5 h-5" />
        Pago de Anticipo
      </h3>

      {/* Indicador claro del monto mínimo */}
      <div className="mb-5 p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
        <p className="text-sm text-emerald-800 font-medium">Anticipo requerido</p>
        <p className="text-3xl font-bold text-emerald-700">
          ${fmt(pagoInicialRequerido)}
        </p>
      </div>

      {/* Tabs de forma de pago */}
      <div className="flex gap-2 mb-5">
        <div className="flex-1 flex flex-col gap-2">
          <Button
            variant={formaPago === "efectivo" ? "default" : "outline"}
            onClick={() => setFormaPago("efectivo")}
            className="w-full h-10"
          >
            <Wallet className="w-4 h-4 mr-1" />
            Efectivo
          </Button>
          <Input
            disabled
            value={fmt(montoEfectivoPendiente)}
            placeholder="0.00"
            className="text-center font-semibold text-lg bg-emerald-100 text-emerald-800 border-emerald-300 h-10"
          />
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <Button
            variant={formaPago === "tarjeta" ? "default" : "outline"}
            onClick={() => setFormaPago("tarjeta")}
            className="w-full h-10"
          >
            <CreditCard className="w-4 h-4 mr-1" />
            Tarjeta
          </Button>
          <Input
            disabled
            value={fmt(tarjeta || 0)}
            placeholder="0.00"
            className="text-center font-semibold text-lg h-10"
          />
        </div>
      </div>

      {/* Efectivo recibido y cambio (respecto al anticipo) */}
      {formaPago === "efectivo" && (
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Efectivo recibido</Label>
            <Input
              ref={efectivoRef}
              inputMode="decimal"
              value={efectivo}
              onChange={(e) => setEfectivo(e.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "ArrowDown") {
                  procesarRef.current?.focus()
                } else if (e.key === "ArrowUp") {
                  e.preventDefault()
                  procesarRef.current?.focus()
                }
              }}
              placeholder="0.00"
              className="text-2xl h-12"
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-lg font-medium">Cambio</Label>
            <div className="bg-gray-100 text-gray-800 rounded-md px-4 py-6 text-center text-3xl font-bold border-2 border-gray-200">
              ${Number(efectivo || 0) > montoEfectivoPendiente
                ? fmt(Number(efectivo) - montoEfectivoPendiente)
                : "0.00"}
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta */}
      {formaPago === "tarjeta" && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-center block">
              <Building2 className="w-4 h-4 inline mr-1" />
              Banco emisor
            </Label>
            <Select value={bancoTarjeta} onValueChange={setBancoTarjeta}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Selecciona el banco" />
              </SelectTrigger>
              <SelectContent>
                {BANCOS_MEXICO.map((banco) => (
                  <SelectItem key={banco} value={banco}>
                    {banco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-center block">Últimos 4 dígitos</Label>
            <div className="flex gap-2 justify-center items-center">
              {[0, 1, 2, 3].map((i) => (
                <Input
                  key={i}
                  maxLength={1}
                  value={ultimos4Tarjeta[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "")
                    if (val || e.target.value === "") {
                      const newDigits = [...ultimos4Tarjeta]
                      newDigits[i] = val
                      setUltimos4Tarjeta(newDigits.join("").slice(0, 4))
                      if (val && i < 3) {
                        document.querySelectorAll('input[maxlength="1"]')[i + 1]?.focus()
                      }
                    }
                  }}
                  className="w-12 h-12 text-center text-2xl font-bold focus:ring-2 focus:ring-emerald-500"
                  placeholder="-"
                />
              ))}

              {(ultimos4Tarjeta.length > 0 || tarjeta || bancoTarjeta) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => {
                    setUltimos4Tarjeta("")
                    setTarjeta("")
                    setBancoTarjeta("")
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-center block">Monto con tarjeta</Label>
            <Input
              inputMode="decimal"
              value={tarjeta}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9.]/g, "")
                if (val.includes(".")) {
                  const parts = val.split(".")
                  val = parts[0].slice(0, 5) + "." + parts[1].slice(0, 2)
                } else {
                  val = val.slice(0, 6)
                }
                setTarjeta(val)
              }}
              placeholder="0.00"
              className="text-right font-mono text-3xl h-12"
            />
          </div>
        </div>
      )}

      <Button
        ref={procesarRef}
        className="w-full mt-6 text-lg py-6"
        variant={puedeProcesar ? "default" : "secondary"}
        disabled={!puedeProcesar}
        onClick={() => {
          if (puedeProcesar) {
            onProcesarVenta({
              formaPago,
              efectivo,
              tarjeta,
              bancoTarjeta,
              ultimos4Tarjeta,
            })
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault()
            efectivoRef.current?.focus()
          }
        }}
        style={{ backgroundColor: puedeProcesar ? "#059669" : undefined }}
      >
        <ShoppingCart className="w-5 h-5 mr-2" />
        Procesar Anticipo
      </Button>

      {/* Feedback visual del cumplimiento */}
      {pagoActual > 0 && (
        <p className={`text-center mt-3 text-sm font-medium ${
          pagoCumpleRequisito ? "text-emerald-600" : "text-amber-600"
        }`}>
          {pagoCumpleRequisito
            ? "¡Anticipo cubierto! ✓"
            : `Faltan $${fmt(pagoInicialRequerido - pagoActual)} para procesar`}
        </p>
      )}
    </div>
  )
}