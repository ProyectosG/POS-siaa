"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { ShieldX } from "lucide-react"
import SidebarMenu from "@/components/SidebarMenu/SidebarMenu"
import { useAuthStore } from "@/store/useAuthStore"
import { useCajaStore } from "@/store/useCajaStore"
import { puedeVer } from "@/lib/permisos"
import { ES_DEMO } from "@/lib/demo"

// Pantallas que necesitan una caja abierta (los cortes generales no)
const RUTAS_CON_CAJA = [
  "/dashboard/ventas",
  "/dashboard/cortes/cortesx",
  "/dashboard/cortes/cortesz",
  "/dashboard/cxc/registroAbonosApartados",
]

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authHydrated = useAuthStore((s) => s.hydrated)
  const user = useAuthStore((s) => s.user) // ← Necesitamos el user para chequear isSuperDev

  const caja = useCajaStore((s) => s.caja)
  const cajaHydrated = useCajaStore((s) => s.hydrated)

  useEffect(() => {
    // Esperamos a que ambos stores estén hidratados
    if (!authHydrated || !cajaHydrated) return

    // Si no está autenticado → redirigir a login
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    // SUPERdeveloper: permitir acceso sin caja
    if (user?.isSuperDev) {
      return // No redirigir, dejar que renderice
    }

    // Usuarios normales: sin caja, o con una guardada sin token (de antes de los
    // cortes por caja) → redirigir
    if (!caja?.token) {
      router.replace("/seleccion-caja")
      return
    }
  }, [authHydrated, cajaHydrated, isAuthenticated, user, caja, router])

  // Mientras carga → mostrar loader
  if (!authHydrated || !cajaHydrated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <p className="text-white text-lg animate-pulse">Cargando sesión...</p>
      </div>
    )
  }

  // Si no está autenticado o no tiene caja (y no es superdev) → no renderizar nada
  if (!isAuthenticated || (!caja?.token && !user?.isSuperDev)) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarMenu />
      {/* Debajo de 1024 px: espacio para la barra superior; desde 1024 px: para el menú fijo */}
      <main className="min-w-0 pt-14 lg:pt-0 lg:pl-64">
        {/* El SuperDeveloper entra sin caja, pero para cobrar debe elegir una */}
        {user?.isSuperDev && !caja?.token && RUTAS_CON_CAJA.some((r) => pathname.startsWith(r)) && (
          <div className="border-b border-aviso/30 bg-aviso-suave px-4 py-2 text-center text-sm font-medium text-foreground">
            Para cobrar o hacer un corte elige una caja.{" "}
            <Link href="/seleccion-caja?elegir=1" className="font-bold text-primario underline">Elegir caja</Link>
          </div>
        )}
        {/* Franja fija de la demo, debajo de la barra superior (en celular) o arriba (con el menú fijo) */}
        {ES_DEMO && (
          <div className="sticky top-14 lg:top-0 z-30 border-b border-aviso/30 bg-aviso-suave px-4 py-1.5 text-center text-sm font-semibold text-foreground">
            DEMO · los datos se reinician
          </div>
        )}
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
          {/* Si escribió a mano la dirección de una pantalla que no le toca, no se carga la pantalla */}
          {puedeVer(user, pathname) ? children : <SinPermiso />}
        </div>
      </main>
    </div>
  )
}

function SinPermiso() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center">
      <ShieldX className="w-16 h-16 text-rose-500" />
      <h1 className="text-3xl font-bold">No tienes permiso</h1>
      <p className="text-muted-foreground">Esta pantalla no está disponible para tu usuario.</p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex min-h-11 items-center px-5 rounded-md bg-primario text-white font-semibold hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </div>
  )
}