import VentasApartado from "@/components/VentasApartado/VentasApartado"
import DashboardLayout from "@/components/DashboardLayout"

// Venta a crédito: la pantalla de apartado con el anticipo opcional
export default function Page() {
  return (
    <DashboardLayout>
      <VentasApartado tipo="credito" />
    </DashboardLayout>
  )
}
