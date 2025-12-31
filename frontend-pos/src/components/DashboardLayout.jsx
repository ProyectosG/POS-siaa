"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import SidebarMenu from "@/components/SidebarMenu/SidebarMenu"
import { useAuthStore } from "@/store/useAuthStore"

export default function DashboardLayout({ children }) {
  const router = useRouter()

  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  useEffect(() => {
    if (!hydrated) return

    if (!user) {
      router.replace("/login")
    }
  }, [hydrated, user, router])

  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-white text-lg">Cargando sesión...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarMenu />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
