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

  const caja = useCajaStore((s) => s.caja)
  const cajaHydrated = useCajaStore((s) => s.hydrated)

  useEffect(() => {
    if (!authHydrated || !cajaHydrated) return

    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    if (!caja) {
      router.replace("/seleccion-caja")
      return
    }
  }, [authHydrated, cajaHydrated, isAuthenticated, caja, router])

  if (!authHydrated || !cajaHydrated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-white text-lg">Cargando sesión...</p>
      </div>
    )
  }

  if (!isAuthenticated || !caja) return null

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarMenu />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
