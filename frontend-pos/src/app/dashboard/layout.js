"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import SidebarMenu from "@/components/SidebarMenu/SidebarMenu"
import { useAuthStore } from "@/store/useAuthStore"
import { useCajaStore } from "@/store/useCajaStore"

export default function DashboardLayout({ children }) {
  const router = useRouter()

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

    // Usuarios normales: si no tienen caja seleccionada → redirigir
    if (!caja) {
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
  if (!isAuthenticated || (!caja && !user?.isSuperDev)) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarMenu />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}