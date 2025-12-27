import SidebarMenu from "@/components/SidebarMenu/SidebarMenu"
import VentasContado from "@/components/VentasContado/VentasContado"
import DashboardLayout from "@/components/DashboardLayout"

export default function Page() {
  return (
      <DashboardLayout>
          <VentasContado />
      </DashboardLayout>

  )
}
