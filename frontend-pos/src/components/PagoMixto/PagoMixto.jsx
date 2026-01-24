"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const API = process.env.NEXT_PUBLIC_API_URL // ← Asegúrate de tenerlo definido en .env

/* =====================================================
   BANCOS DISPONIBLES (MX)
===================================================== */
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

export default function PagoMixto({
  monto,
  onChangeMonto,
  liquidar,
  pendingBalance,
  ticketId,                // ← Necesario para sale_id
  venta,                   // ← Necesario para customer_id
  onAbonoRegistrado,       // ← Callback del padre para toast y recargar
}) {
  const [efectivo, setEfectivo] = useState("")
  const [tarjeta, setTarjeta] = useState("")
  const [banco, setBanco] = useState("")
  const [last4, setLast4] = useState("")

  /* =====================================================
     RESET CUANDO SE LIMPIA EL MONTO
  ===================================================== */
  useEffect(() => {
    if (!monto) {
      setEfectivo("")
      setTarjeta("")
      setBanco("")
      setLast4("")
    }
  }, [monto])

  /* =====================================================
     TOTAL DE PAGOS
  ===================================================== */
  const totalPagos = useMemo(() => {
    return Number(efectivo || 0) + Number(tarjeta || 0)
  }, [efectivo, tarjeta])

  /* =====================================================
     VALIDACIÓN COMPLETA PARA HABILITAR BOTÓN
  ===================================================== */
  const isValid = useMemo(() => {
    const montoNum = Number(monto)
    const efectivoNum = Number(efectivo)
    const tarjetaNum = Number(tarjeta)

    if (isNaN(montoNum) || montoNum <= 0) return false
    if (totalPagos <= 0) return false
    if (efectivoNum < 0 || tarjetaNum < 0) return false
    if (totalPagos > montoNum) return false
    if (liquidar && totalPagos !== montoNum) return false
    if (tarjetaNum > 0 && (!banco || last4.length !== 4)) return false
    if (pendingBalance && montoNum > Number(pendingBalance)) return false

    return true
  }, [monto, efectivo, tarjeta, banco, last4, liquidar, totalPagos, pendingBalance])

  /* =====================================================
     PROCESAR ABONO - CAMBIO AQUÍ PARA ENVIAR 'abono'
  ===================================================== */
  const procesarAbono = async () => {
    if (!isValid) {
      toast.error("Completa monto y forma de pago válidos")
      return
    }

    // Construir pagos como array y forzar payment_type: "abono" en TODOS
    const pagos = []

    if (efectivo) {
      pagos.push({
        method: "efectivo",
        amount: Number(efectivo),
        payment_type: "abono",    // ← ¡Aquí! Siempre 'abono' para este componente
      })
    }

    if (tarjeta) {
      pagos.push({
        method: "tarjeta",
        amount: Number(tarjeta),
        bank: banco,
        last4,
        payment_type: "abono",    // ← ¡Aquí también! Siempre 'abono'
      })
    }

    const payload = {
      sale_id: ticketId,
      customer_id: venta?.customer_id || null,
      amount: Number(monto), // monto total del abono
      pagos,                 // array de pagos (backend debe manejar múltiples)
    }

    try {
      const res = await fetch(`${API}/apartados/abono`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Error al registrar abono")
      }

      const data = await res.json()

      toast.success("Abono registrado correctamente")
      onAbonoRegistrado?.()

      // Limpiar campos
      setEfectivo("")
      setTarjeta("")
      setBanco("")
      setLast4("")

    } catch (err) {
      toast.error(err.message || "Error al procesar el abono")
    }
  }

  return (
    <div className="space-y-8">

      {/* MONTO PRINCIPAL */}
      <Card className="p-6 border-2 border-blue-400 bg-blue-50 transition-all duration-200 hover:shadow-md hover:border-blue-500">
        <div className="space-y-3 text-center">
          <p className="text-2xl font-bold text-blue-700">
            Nueva cantidad a abonar
          </p>
          <Input
            type="number"
            value={monto}
            onChange={(e) => {
              const val = e.target.value
              if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                onChangeMonto(val)
              }
            }}
            min="0"
            step="0.01"
            className="
              h-20 text-4xl text-center font-extrabold text-blue-700
              border-blue-400 transition-all duration-200
              hover:border-blue-500 hover:shadow-sm
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500
            "
          />
        </div>
      </Card>

      {/* EFECTIVO */}
      <div className="space-y-1">
        <label className="text-sm font-semibold">💵 Efectivo</label>
        <Input
          type="number"
          value={efectivo}
          onChange={(e) => {
            const val = e.target.value
            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
              setEfectivo(val)
            }
          }}
          min="0"
          step="0.01"
          placeholder="Monto en efectivo"
          className="
            transition-all duration-200
            hover:border-gray-400 hover:shadow-sm
            focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:border-emerald-500
          "
        />
      </div>

      {/* TARJETA */}
      <div className="space-y-3">
        <label className="text-sm font-semibold">💳 Tarjeta</label>
        <Input
          type="number"
          value={tarjeta}
          onChange={(e) => {
            const val = e.target.value
            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
              setTarjeta(val)
            }
          }}
          min="0"
          step="0.01"
          placeholder="Monto con tarjeta"
          className="
            transition-all duration-200
            hover:border-gray-400 hover:shadow-sm
            focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:border-emerald-500
          "
        />

        {tarjeta && (
          <div className="grid grid-cols-2 gap-3">
            <Select value={banco} onValueChange={setBanco}>
              <SelectTrigger
                className="
                  transition-all duration-200
                  hover:border-gray-400 hover:shadow-sm
                  focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                "
              >
                <SelectValue placeholder="Banco emisor" />
              </SelectTrigger>
              <SelectContent>
                {BANCOS_MEXICO.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2 relative">
              <Label className="text-center block">Últimos 4 dígitos</Label>
              <div className="flex gap-2 justify-center items-center">
                {[0, 1, 2, 3].map((i) => (
                  <Input
                    key={i}
                    maxLength={1}
                    value={last4[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "")
                      if (val || e.target.value === "") {
                        const newDigits = last4.split("")
                        newDigits[i] = val
                        setLast4(newDigits.join("").slice(0, 4))
                        if (val && i < 3) {
                          const inputs = document.querySelectorAll('input[maxlength="1"]')
                          if (inputs[i + 1]) inputs[i + 1].focus()
                        }
                      }
                    }}
                    className="
                      w-12 h-12 text-center text-2xl font-bold
                      transition-all duration-200
                      hover:border-emerald-400 hover:shadow-sm
                      focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus-visible:outline-none
                    "
                    placeholder="-"
                  />
                ))}

                {(last4.length > 0 || tarjeta || banco) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="
                      h-10 w-10 rounded-full
                      transition-all duration-200
                      hover:bg-red-50 hover:text-red-600
                      focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
                    "
                    onClick={() => {
                      setLast4("")
                      setTarjeta("")
                      setBanco("")
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
          </div>
        )}
      </div>

      {/* RESUMEN */}
      {liquidar && (
        <p className="text-center text-sm text-muted-foreground">
          Total asignado: <span className="font-semibold">${totalPagos.toFixed(2)}</span>
        </p>
      )}

      {/* BOTÓN PRINCIPAL */}
      <Button
        onClick={procesarAbono}
        disabled={!isValid}
        className={`
          w-full h-14 text-lg font-semibold
          transition-all duration-200
          ${isValid
            ? "bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg"
            : "bg-gray-400 cursor-not-allowed opacity-70"}
          focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none
        `}
      >
        {isValid ? "Registrar abono" : "Completa monto y forma de pago"}
      </Button>
    </div>
  )
}