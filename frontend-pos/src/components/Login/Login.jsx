"use client"

import * as React from "react"
import { Eye, EyeOff, User, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/useAuthStore"
import { useCajaStore } from "@/store/useCajaStore"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Cookies from 'js-cookie'
import { apiFetch } from "@/lib/apiFetch"

export default function Login() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const [nickname, setNickname] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [modoSuperDev, setModoSuperDev] = React.useState(false)

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!nickname || !password) {
      setError("Por favor ingresa usuario y contraseña")
      return
    }

    try {
      setIsLoading(true)

      // ─────────────────────────────────────────────────────────────
      //  SUPERDEVELOPER: credenciales validadas en el servidor
      // ─────────────────────────────────────────────────────────────
      if (modoSuperDev) {
        const res = await apiFetch(`/superdev/entrar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname, password }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(data?.error || "Credenciales incorrectas")
        }

        login({
          user: {
            id: 0,
            nickname: data.user.nickname,
            role: data.user.access_level,
            accessLevel: data.user.access_level,
            photoUrl: null,
            isSuperDev: true,
          },
          token: data.token,
        })

        // La cookie solo sirve para las redirecciones del middleware de Next (dura lo que el token: 45 min)
        Cookies.set('auth-token', data.token, { expires: 45 / (24 * 60), path: '/' })
        useCajaStore.getState().clearCaja();  // ← Limpia estado persistido
        Cookies.remove('caja-id') // Aseguramos que no haya caja seleccionada

        toast.success("¡Bienvenido SUPERdeveloper!")

        // Saltamos selección de caja y vamos directo al dashboard
        router.replace("/dashboard")
        return
      }

      // ─────────────────────────────────────────────────────────────
      //  LOGIN NORMAL (usuarios de la base de datos)
      // ─────────────────────────────────────────────────────────────
      const res = await apiFetch(
        `/users/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname, password }),
        }
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error || "Credenciales incorrectas")
      }

      login({
        user: {
          id: data.user.id,
          nickname: data.user.nickname,
          role: data.user.access_level,
          accessLevel: data.user.access_level,
          photoUrl: data.user.photo_url,
          isSuperDev: false,
        },
        token: data.token,
      })

      // La cookie solo sirve para las redirecciones del middleware de Next (dura lo que el token: 12 h)
      Cookies.set('auth-token', data.token, { expires: 0.5, path: '/' })

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
                  autoFocus
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
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Ingresando..." : modoSuperDev ? "Entrar como SuperDeveloper" : "Continuar"}
            </button>

            {/* Cambia entre login normal y SuperDeveloper (el servidor valida las credenciales) */}
            <button
              type="button"
              onClick={() => { setModoSuperDev(!modoSuperDev); setError("") }}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition"
            >
              {modoSuperDev ? "Volver al inicio de sesión normal" : "Acceso SuperDeveloper"}
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