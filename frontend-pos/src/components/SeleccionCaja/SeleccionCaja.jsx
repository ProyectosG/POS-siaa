"use client"

import * as React from "react"
import { Eye, EyeOff, CreditCard, Key } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCajaStore } from "@/store/useCajaStore"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export function SeleccionCaja() {
  const router = useRouter()
  const setCaja = useCajaStore((state) => state.setCaja)

  const [showCajaKey, setShowCajaKey] = React.useState(false)
  const [numeroCaja, setNumeroCaja] = React.useState("")
  const [claveCaja, setClaveCaja] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleCajaSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!numeroCaja || !claveCaja) {
      setError("Por favor ingresa número y clave de caja")
      return
    }

    try {
      setLoading(true)

      // 🔥 ABRIR / VALIDAR CAJA (BACKEND)
      const res = await fetch(`${API_URL}/cash-registers/abrir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numero_caja: numeroCaja,
          password: claveCaja,
        }),
      })

      const data = await res.json()
      console.log(data)

      if (!res.ok) {
        throw new Error(data.error || "Error al abrir la caja")
      }

      // 🔐 GUARDAR CAJA VALIDADA (STORE GLOBAL)
      setCaja({
        id: data.id,
        numero: data.numero_caja,
        tipo: data.tipo_caja,
        abiertaEn: data.abierta_en,
      })

      router.replace("/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div
        className={cn(
          "w-full max-w-md mx-4 transition-all",
          loading && "opacity-60 pointer-events-none"
        )}
      >
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-8">
          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Seleccionar Caja
            </h1>
            <p className="text-slate-400">
              Ingresa el número de caja asignado
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleCajaSubmit} className="space-y-6">
            {/* NUMERO CAJA */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Número de Caja
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  value={numeroCaja}
                  onChange={(e) => setNumeroCaja(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="Ej: 001"
                />
              </div>
            </div>

            {/* CLAVE (VISUAL / FUTURA VALIDACIÓN BACKEND) */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Clave de Caja
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showCajaKey ? "text" : "password"}
                  value={claveCaja}
                  onChange={(e) => setClaveCaja(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCajaKey(!showCajaKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showCajaKey ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg"
            >
              {loading ? "Validando caja..." : "Iniciar Sistema"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-slate-500 text-sm">
          Sistema POS v1.0
        </p>
      </div>
    </div>
  )
}
