"use client"
import { useAuthStore } from "@/store/useAuthStore"

export default function DashboardHome() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Bienvenido al Sistema POS</h1>

      <p className="text-muted-foreground text-lg">
        Usuario: <span className="font-semibold">{user?.nickname}</span>
      </p>

      <p className="text-muted-foreground text-lg mb-8">
        Selecciona una opción del menú lateral para comenzar.
      </p>
    </div>
  )
}
