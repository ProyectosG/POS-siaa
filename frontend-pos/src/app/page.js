"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { useCajaStore } from "@/store/useCajaStore"

export default function Home() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const caja = useCajaStore((s) => s.caja)

  useEffect(() => {
    if (!user) {
      router.replace("/login")
    } else if (!caja) {
      router.replace("/seleccion-caja")
    } else {
      router.replace("/dashboard")
    }
  }, [user, caja])

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Cargando sistema…
    </div>
  )
}
