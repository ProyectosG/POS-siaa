"use client"

import * as React from "react"
import { Eye, EyeOff, User, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/useAuthStore"
import { useRouter } from "next/navigation"

export default function Login() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const [nickname, setNickname] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!nickname || !password) {
      setError("Por favor ingresa usuario y contraseña")
      return
    }

    try {
      setIsLoading(true)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname, password }),
        }
      )

      const data = await res.json()



      if (!res.ok) {
        throw new Error(data?.message || "Credenciales incorrectas")
      }

      // ✅ NORMALIZACIÓN ÚNICA DEL USUARIO
      login({
        user: {
          id: data.user.id,
          nickname: data.user.nickname,
          role: data.user.role ?? data.user.access_level,
          photoUrl: data.user.photo_url, // 👈 AQUÍ ESTABA EL ERROR
        },
        token: data.token ?? null,
      })

      // 🔥 REDIRECCIÓN CORRECTA
      router.replace("/seleccion-caja")
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="w-full max-w-md mx-4">
        <div
          className={cn(
            "bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 p-8 transition-all",
            isLoading && "opacity-70 pointer-events-none"
          )}
        >
          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-slate-400">
              Accede al sistema POS
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            {/* USUARIO */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:opacity-90 transition"
            >
              {isLoading ? "Ingresando..." : "Continuar"}
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
