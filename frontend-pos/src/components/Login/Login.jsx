"use client"

import * as React from "react"
import { Eye, EyeOff, User, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

export function Login({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const [nickname, setNickname] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setError("")

    if (nickname && password) {
      setIsAnimating(true)
      setTimeout(() => {
        // Llamar al callback para avanzar al siguiente paso
        onLoginSuccess && onLoginSuccess({ nickname })
      }, 500)
    } else {
      setError("Por favor ingresa usuario y contraseña")
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Login Card */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md mx-4 transition-all duration-500 ease-out",
          isAnimating && "scale-95 opacity-50",
        )}
      >
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 p-8 transition-all duration-700 ease-out hover:border-purple-500/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4 animate-in zoom-in-50 duration-500">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              Iniciar Sesión
            </h1>
            <p className="text-slate-400 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              Ingresa tus credenciales
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-2 duration-300">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            {/* Usuario Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors duration-300" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ingresa tu nickname"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-500 ease-out hover:border-purple-500/50 hover:bg-slate-800"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors duration-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-500 ease-out hover:border-purple-500/50 hover:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/30 transition-all duration-300 ease-out hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-95"
            >
              Continuar
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-slate-500 text-sm">Sistema POS v1.0 - © 2025</p>
      </div>
    </div>
  )
}
