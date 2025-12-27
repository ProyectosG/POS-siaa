"use client"

import * as React from "react"
import { Eye, EyeOff, CreditCard, Key } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCajaStore } from "@/store/useCajaStore"
import { cn } from "@/lib/utils"

export function SeleccionCaja() {
  const router = useRouter()
  const setCaja = useCajaStore((state) => state.setCaja)

  const [showCajaKey, setShowCajaKey] = React.useState(false)
  const [numeroCaja, setNumeroCaja] = React.useState("")
  const [claveCaja, setClaveCaja] = React.useState("")
  const [error, setError] = React.useState("")
  const [isAnimating, setIsAnimating] = React.useState(false)

  const handleCajaSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!numeroCaja || !claveCaja) {
      setError("Por favor ingresa número y clave de caja")
      return
    }

    try {
      setIsAnimating(true)

      // 🔥 Aquí luego validas contra backend
      setCaja({
        numero: numeroCaja,
        abiertaEn: new Date().toISOString(),
      })

      router.replace("/dashboard")

    } catch (err) {
      setError("Error al abrir la caja")
    } finally {
      setIsAnimating(false)
    }
  }

  return (

    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Caja Selection Card */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md mx-4 transition-all duration-500 ease-out",
          isAnimating && "scale-95 opacity-50",
        )}
      >
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 p-8 transition-all duration-700 ease-out hover:border-blue-500/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4 animate-in zoom-in-50 duration-500">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              Seleccionar Caja
            </h1>
            <p className="text-slate-400 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              Configura tu punto de venta
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-2 duration-300">
              {error}
            </div>
          )}

          {/* Caja Selection Form */}
          <form onSubmit={handleCajaSubmit} className="space-y-6">
            {/* Numero de Caja Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">Número de Caja</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors duration-300" />
                <input
                  type="text"
                  value={numeroCaja}
                  onChange={(e) => setNumeroCaja(e.target.value)}
                  placeholder="Ej: 001, 002, 003"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-500 ease-out hover:border-blue-500/50 hover:bg-slate-800"
                />
              </div>
            </div>

            {/* Clave de Caja Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">Clave de Caja</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors duration-300" />
                <input
                  type={showCajaKey ? "text" : "password"}
                  value={claveCaja}
                  onChange={(e) => setClaveCaja(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-500 ease-out hover:border-blue-500/50 hover:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowCajaKey(!showCajaKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors duration-300"
                >
                  {showCajaKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all duration-300 ease-out hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-95"
            >
              Iniciar Sistema
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-slate-500 text-sm">Sistema POS v1.0 - © 2025</p>
      </div>
    </div>
  )
}
