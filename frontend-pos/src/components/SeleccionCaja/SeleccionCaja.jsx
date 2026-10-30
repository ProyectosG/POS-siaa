"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { useCajaStore } from "@/store/useCajaStore"
import { Eye, EyeOff, CreditCard, Key } from "lucide-react"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import Cookies from 'js-cookie';  
import { apiFetch } from "@/lib/apiFetch"
import { ES_DEMO } from "@/lib/demo"
import DatosDemo from "@/components/ui/datos-demo"


export function SeleccionCaja() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setCaja = useCajaStore((state) => state.setCaja)

  // Si es SUPERdeveloper → saltar directamente al dashboard
  useEffect(() => {
    if (user?.isSuperDev) {
      toast.success("SUPERdeveloper detectado → Acceso directo al dashboard")
      router.replace("/dashboard")
    }
  }, [user, router])

  // ─────────────────────────────────────────────────────────────
  //  Si NO es superdev → mostrar pantalla normal de selección de caja
  // ─────────────────────────────────────────────────────────────
  const [showCajaKey, setShowCajaKey] = React.useState(false)
  const [numeroCaja, setNumeroCaja] = React.useState("")
  const [claveCaja, setClaveCaja] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)



const handleCajaSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!numeroCaja || !claveCaja) {
    setError("Por favor ingresa número y clave de caja");
    return;
  }

  try {
    setLoading(true);

    const res = await apiFetch(`/cash-registers/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero_caja: numeroCaja,
        password: claveCaja,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error al abrir la caja");
    }

    // Guardar en Zustand store
    setCaja({
      id: data.id,
      numero: data.numero_caja,
      tipo: data.tipo_caja,
      abiertaEn: data.abierta_en,
    });

    // ← ¡ESTO ES LO QUE FALTABA! Middleware lo necesita
    Cookies.set('caja-id', data.id.toString(), { 
      expires: 1, 
      path: '/', 
      sameSite: 'strict' 
    });

    toast.success(`Caja ${data.numero_caja} abierta`);
    router.replace("/dashboard");
  } catch (err) {
    setError(err.message || "Error desconocido al abrir caja");
  } finally {
    setLoading(false);
  }
};

  // Si es superdev, no renderizamos nada (ya se redirigió)
  if (user?.isSuperDev) {
    return null // o un loader muy breve
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-10">
      <div
        className={cn(
          "w-full max-w-sm transition-opacity",
          loading && "opacity-60 pointer-events-none"
        )}
      >
        {/* MARCA */}
        <div className="mb-8 text-center">
          <p className="text-2xl font-black tracking-tight text-foreground">
            POS<span className="text-primario">.</span>SIAA
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.nickname ? <>Hola, <b className="text-foreground">{user.nickname}</b></> : "Punto de venta"}
          </p>
        </div>

        <div className="rounded-tarjeta border border-border bg-card p-6 sm:p-8 shadow-suave">
          {/* ENCABEZADO */}
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primario-suave">
              <CreditCard className="w-5 h-5 text-primario" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Abrir caja</h1>
              <p className="mt-1 text-sm text-muted-foreground">Número de caja asignado y su clave</p>
            </div>
          </div>

          {ES_DEMO && (
            <DatosDemo
              datos={[["Caja", "1"], ["Clave", "demo"]]}
              onUsar={() => { setNumeroCaja("1"); setClaveCaja("demo"); setError("") }}
            />
          )}

          {error && (
            <div role="alert" className="mb-5 rounded-lg border border-error/30 bg-error-suave p-3 text-sm text-error">
              {error}
            </div>
          )}

          <form onSubmit={handleCajaSubmit} className="space-y-5">
            {/* NÚMERO DE CAJA */}
            <div>
              <label htmlFor="caja-numero" className="mb-1.5 block text-sm font-medium text-foreground">
                Número de caja
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="caja-numero"
                  value={numeroCaja}
                  onChange={(e) => setNumeroCaja(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-card pl-11 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primario/40 focus:border-primario"
                  placeholder="Ej: 001"
                  autoFocus
                />
              </div>
            </div>

            {/* CLAVE */}
            <div>
              <label htmlFor="caja-clave" className="mb-1.5 block text-sm font-medium text-foreground">
                Clave de caja
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="caja-clave"
                  type={showCajaKey ? "text" : "password"}
                  value={claveCaja}
                  onChange={(e) => setClaveCaja(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-card pl-11 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-primario/40 focus:border-primario"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCajaKey(!showCajaKey)}
                  aria-label={showCajaKey ? "Ocultar clave" : "Mostrar clave"}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showCajaKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="h-11 w-full rounded-lg bg-primario font-semibold text-white shadow-suave transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Validando caja..." : "Iniciar sistema"}
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
