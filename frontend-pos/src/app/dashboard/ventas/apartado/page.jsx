import SidebarMenu from "@/components/SidebarMenu/SidebarMenu"
import VentasApartado from "@/components/VentasApartado/VentasApartado"
import DashboardLayout from "@/components/DashboardLayout"

export default function Page() {
  return (
      <DashboardLayout>
          <VentasApartado />
      </DashboardLayout>

  )
}
