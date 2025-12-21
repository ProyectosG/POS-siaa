import * as React from "react"
import { SidebarMenu } from "@/components/SidebarMenu/SidebarMenu"
import { Login } from "@/components/Login/Login"
import { SeleccionCaja } from "@/components/SeleccionCaja/SeleccionCaja"

export default function Home() {
   // 🚀 Cambiar el estado inicial para saltar login
  const [authStep, setAuthStep] = React.useState("caja") // directamente a SeleccionCaja
  const [userData, setUserData] = React.useState({ nickname: "DemoUser" }) // usuario simulado
  
    const handleLoginSuccess = (data) => {
    setUserData({ ...data })
    setAuthStep("caja")
  }

  const handleCajaSuccess = (cajaData) => {
    setUserData((prev) => ({ ...prev, ...cajaData }))
    setAuthStep("authenticated")
  }

  // --- Render condicional ---
  if (authStep === "login") {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  if (authStep === "caja") {
    return <SeleccionCaja onCajaSuccess={handleCajaSuccess} />
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 xl:ml-80 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Bienvenido al Sistema POS</h1>
          <p className="text-muted-foreground text-lg">Selecciona una opción del menú lateral para comenzar.</p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Ventas del Día", value: "$12,450", change: "+12%" },
              { title: "Productos en Stock", value: "1,234", change: "-3%" },
              { title: "Clientes Activos", value: "89", change: "+5%" },
            ].map((stat) => (
              <div key={stat.title} className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                <p className="text-sm text-accent mt-1">{stat.change}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
