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
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        {/* MARCA */}
        <div className="mb-8 text-center">
          <p className="text-2xl font-black tracking-tight text-foreground">
            POS<span className="text-primario">.</span>SIAA
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Punto de venta</p>
        </div>

        <div
          className={cn(
            "rounded-tarjeta border border-border bg-card p-6 sm:p-8 shadow-suave transition-opacity",
            isLoading && "opacity-70 pointer-events-none"
          )}
        >
          {/* ENCABEZADO */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">
              {modoSuperDev ? "Acceso SuperDeveloper" : "Iniciar sesión"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {modoSuperDev ? "Credenciales de mantenimiento" : "Escribe tu usuario y contraseña"}
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div role="alert" className="mb-5 rounded-lg border border-error/30 bg-error-suave p-3 text-sm text-error">
              {error}
            </div>
          )}

          {/* FORMULARIO */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* USUARIO */}
            <div>
              <label htmlFor="login-usuario" className="mb-1.5 block text-sm font-medium text-foreground">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="login-usuario"
                  autoComplete="username"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-card pl-11 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primario/40 focus:border-primario"
                  autoFocus
                />
              </div>
            </div>

            {/* CONTRASEÑA */}
            <div>
              <label htmlFor="login-clave" className="mb-1.5 block text-sm font-medium text-foreground">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="login-clave"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-card pl-11 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-primario/40 focus:border-primario"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* ENTRAR */}
            <button
              type="submit"
              className="h-11 w-full rounded-lg bg-primario font-semibold text-white shadow-suave transition hover:opacity-90 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Ingresando..." : modoSuperDev ? "Entrar como SuperDeveloper" : "Continuar"}
            </button>

            {/* Cambia entre login normal y SuperDeveloper (el servidor valida las credenciales) */}
            <button
              type="button"
              onClick={() => { setModoSuperDev(!modoSuperDev); setError("") }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition"
            >
              {modoSuperDev ? "Volver al inicio de sesión normal" : "Acceso SuperDeveloper"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sistema POS v1.0
        </p>
      </div>
    </div>
  )
}
