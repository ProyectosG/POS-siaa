"use client"

import {
  DollarSign,
  CreditCard,
  Wallet,
  ShoppingCart,
} from "lucide-react"
import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

export default function PagoVenta({
  mode = "contado", // "contado" | "apartado"
  focusArea,

  formaPago,
  setFormaPago,

  efectivo,
  setEfectivo,

  tarjeta,
  setTarjeta,

  bancoTarjeta,
  setBancoTarjeta,

  ultimos4Tarjeta,
  setUltimos4Tarjeta,

  total,
  anticipoRequerido = 0,

  onProcesar,
}) {
  const efectivoRef = useRef(null)
  const procesarRef = useRef(null)
  const tarjetaRef = useRef(null)  // Referencia para el input de tarjeta

  /* ===================== CÁLCULOS ===================== */

  const montoMinimo = mode === "apartado" ? anticipoRequerido : total
  const pagoActual = Number(efectivo || 0) + Number(tarjeta || 0)
  const montoEfectivoPendiente = Math.max(0, montoMinimo - Number(tarjeta || 0))
  const efectivoSuficiente = Number(efectivo || 0) >= montoEfectivoPendiente
  const tarjetaCompleta =
    Number(tarjeta || 0) > 0 &&
    bancoTarjeta &&
    /^\d{4}$/.test(ultimos4Tarjeta)
  const pagoCumpleRequisito = pagoActual >= montoMinimo

  // ✅ Validación: solo habilitar si hay ventas y pago válido
  const puedeProcesar =
    total > 0 && // debe haber ventas
    pagoCumpleRequisito &&
    (formaPago === "efectivo" ? efectivoSuficiente : tarjetaCompleta)

  /* ===================== FOCUS ===================== */
  useEffect(() => {
    if (focusArea === "pago") {
      setFormaPago("efectivo")
      requestAnimationFrame(() => {
        efectivoRef.current?.focus()
        efectivoRef.current?.select()
      })
    }
  }, [focusArea])

  /* ===================== FUNCIONES DE VALIDACIÓN ===================== */

  const handleTarjetaChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, "") // Solo números y punto

    // Si el valor comienza con "0" y tiene más de un carácter, lo eliminamos
    if (val.startsWith("0") && val.length > 1) {
      val = val.slice(1)
    }

    // Limitar a 6 caracteres (sin contar el punto decimal)
    if (val.includes(".")) {
      const parts = val.split(".")
      val = parts[0].slice(0, 5) + "." + (parts[1] ? parts[1].slice(0, 2) : "")
    } else {
      val = val.slice(0, 6)
    }

    setTarjeta(val)
  }

  /* ===================== MÁXIMA FUNCIONALIDAD ===================== */
  
  const handleTarjetaFocus = () => {
    // Seleccionamos todo el contenido cuando el input recibe el foco
    tarjetaRef.current?.select()
  }

  /* ===================== UI ===================== */
  return (
    <div className="relative rounded-md p-5 border transition-all">
      <h3 className="flex items-center gap-2 font-semibold mb-4">
        <DollarSign className="w-5 h-5" />
        {mode === "apartado" ? "Pago de Anticipo" : "Pago"}
      </h3>

      {/* ======= ANTICIPO REQUERIDO ======= */}
      {mode === "apartado" && (
        <div className="mb-5 p-4 bg-emerald-50 rounded-lg border text-center">
          <p className="text-sm font-medium text-emerald-800">Anticipo requerido</p>
          <p className="text-3xl font-bold text-emerald-700">${fmt(anticipoRequerido)}</p>
        </div>
      )}

      {/* ======= FORMA DE PAGO ======= */}
      <div className="flex gap-2 mb-5">
        <div className="flex-1 space-y-2">
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
            className="text-center font-semibold bg-emerald-100"
          />
        </div>

        <div className="flex-1 space-y-2">
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
            className="text-center font-semibold"
          />
        </div>
      </div>

      {/* ======= EFECTIVO ======= */}
      {formaPago === "efectivo" && (
        <div className="space-y-4">
          <div>
            <Label>Efectivo recibido</Label>
            <Input
              ref={efectivoRef}
              inputMode="decimal"
              value={efectivo}
              onChange={(e) =>
                setEfectivo(e.target.value.replace(/[^0-9.]/g, ""))
              }
              className="text-2xl h-12"
            />
          </div>

          <div className="text-center text-3xl font-bold bg-gray-100 rounded-md py-4 border">
            Cambio: $
            {Number(efectivo || 0) > montoEfectivoPendiente
              ? fmt(Number(efectivo) - montoEfectivoPendiente)
              : "0.00"}
          </div>
        </div>
      )}

      {/* ======= TARJETA ======= */}
      {formaPago === "tarjeta" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap min-w-[60px]">Banco</Label>
            <Select value={bancoTarjeta} onValueChange={setBancoTarjeta}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                {BANCOS_MEXICO.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Label className="whitespace-nowrap min-w-[60px]">Últimos 4 dígitos</Label>
            <div className="flex gap-2 items-center">
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
            </div>
          </div>

          <div>
            <Label className="text-center block">Monto con tarjeta</Label>
            <Input
              ref={tarjetaRef}  // Referencia agregada
              inputMode="decimal"
              value={tarjeta}
              onChange={handleTarjetaChange} // Usamos la nueva función para manejar el cambio
              placeholder="0.00"
              onFocus={handleTarjetaFocus} // Al hacer focus, seleccionamos todo
              className="text-right font-mono text-3xl h-12"
            />
          </div>
        </div>
      )}

      {/* ======= PROCESAR ======= */}
      <Button
        ref={procesarRef}
        className={`w-full mt-6 py-6 text-lg font-semibold transition-colors
          ${puedeProcesar
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        disabled={!puedeProcesar}
        onClick={() =>
          onProcesar({ formaPago, efectivo, tarjeta, bancoTarjeta, ultimos4Tarjeta })
        }
      >
        <ShoppingCart className="w-5 h-5 mr-2" />
        {mode === "apartado" ? "Procesar Anticipo" : "Procesar Venta"}
      </Button>

      {/* ======= FEEDBACK ======= */}
      {pagoActual > 0 && (
        <p className={`text-center mt-3 text-sm font-medium ${pagoCumpleRequisito ? "text-emerald-600" : "text-amber-600"}`}>
          {pagoCumpleRequisito
            ? "Pago suficiente ✓"
            : `Faltan $${fmt(montoMinimo - pagoActual)}`}
        </p>
      )}
    </div>
  )
}
