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

export default function Pago({
  focusArea,
  formaPago,
  setFormaPago,
  efectivo,
  setEfectivo,
  cambio,
  total,
  bancoTarjeta,
  setBancoTarjeta,
  ultimos4Tarjeta,
  setUltimos4Tarjeta,
  tarjeta,
  setTarjeta,
  onProcesarVenta,
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

  const montoEfectivo = Math.max(0, total - Number(tarjeta || 0))
  const pagoCompleto = montoEfectivo + Number(tarjeta || 0) === total
  const efectivoSuficiente = Number(efectivo || 0) >= montoEfectivo
  const tarjetaCompleta = Number(tarjeta || 0) > 0 && bancoTarjeta && ultimos4Tarjeta.length === 4 && /^\d{4}$/.test(ultimos4Tarjeta)
  const totalValido = total > 0
  const tarjetaNoExcede = Number(tarjeta || 0) <= total
  const pagosNoExceden = Number(tarjeta || 0) + Number(efectivo || 0) <= total
  const tarjetaExacta = Number(tarjeta || 0) === total

  const puedeProcesar = formaPago === "efectivo"
    ? pagoCompleto && efectivoSuficiente
    : tarjetaCompleta && tarjetaExacta

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
        Pago
      </h3>

      {/* Tabs de forma de pago y montos pendientes */}
      <div className="flex gap-2 mb-4">
        {/* Tab Efectivo */}
        <div className="flex-1 flex flex-col gap-2">
          <Button
            variant={formaPago === "efectivo" ? "default" : "outline"}
            onClick={() => setFormaPago("efectivo")}
            className="w-full"
          >
            <Wallet className="w-4 h-4 mr-1" />
            Efectivo
          </Button>
          {/* Input disabled: Monto pendiente en efectivo (inputSoloEfectivo) */}
          <Input
            id="inputSoloEfectivo"
            disabled
            value={fmt(montoEfectivo)}
            placeholder="0.00"
            className="text-center font-semibold text-lg bg-emerald-100 text-emerald-800 border-emerald-300"
          />
        </div>

        {/* Tab Tarjeta */}
        <div className="flex-1 flex flex-col gap-2">
          <Button
            variant={formaPago === "tarjeta" ? "default" : "outline"}
            onClick={() => setFormaPago("tarjeta")}
            className="w-full"
          >
            <CreditCard className="w-4 h-4 mr-1" />
            Tarjeta
          </Button>
          {/* Input disabled: Monto ingresado en tarjeta */}
          <Input
            disabled
            value={fmt(tarjeta || 0)}
            placeholder="0.00"
            className="text-center font-semibold text-lg"
          />
        </div>
      </div>

      {/* Sección visible solo en tab Efectivo */}
      {formaPago === "efectivo" && (
        <>
          {/* Label: Efectivo recibido */}
          <Label>Efectivo recibido</Label>
          {/* Input editable: Cantidad de efectivo que recibe el cajero */}
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
            className="mb-4 text-2xl"
            autoFocus
          />

          {/* Label: Cambio */}
          <Label className="text-lg font-medium">Cambio</Label>
          {/* Div: Muestra el cambio calculado solo sobre el efectivo necesario */}
          <div className="bg-gray-100 text-gray-800 rounded-md px-4 py-5 text-center text-3xl font-bold border-2 border-gray-200">
            ${Number(efectivo || 0) > montoEfectivo ? fmt(Number(efectivo) - montoEfectivo) : "0.00"}
          </div>
        </>
      )}

      {/* Sección visible solo en tab Tarjeta */}
      {formaPago === "tarjeta" && (
        <div className="space-y-6">
          {/* Banco emisor */}
          <div className="space-y-2">
            <Label className="text-center block">
              <Building2 className="w-4 h-4 inline mr-1" />
              Banco emisor
            </Label>
            <Select value={bancoTarjeta} onValueChange={setBancoTarjeta}>
              <SelectTrigger className="w-full">
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

          {/* Últimos 4 dígitos de la tarjeta */}
          <div className="space-y-2 relative">
            <Label className="text-center block">Últimos 4 dígitos</Label>
            <div className="flex gap-2 justify-center items-center">
              {/* Inputs individuales para cada dígito */}
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

              {/* Botón limpiar datos de tarjeta */}
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

          {/* Monto a cobrar con tarjeta */}
          <div className="space-y-2">
            <Label className="text-center block">Monto a cobrar</Label>
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
              className="text-right font-mono text-3xl"
            />
          </div>
        </div>
      )}

      {/* Botón principal: Procesar Venta */}
      <Button
        ref={procesarRef}
        className="w-full mt-6 text-lg py-6"
        variant={puedeProcesar ? "default" : "secondary"}
        disabled={!puedeProcesar}
        onClick={() => {
          if (puedeProcesar) {
            onProcesarVenta({ formaPago, efectivo, tarjeta, bancoTarjeta, ultimos4Tarjeta });
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
        Procesar Venta
      </Button>
    </div>
  )
}