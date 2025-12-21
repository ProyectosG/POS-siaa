import { SidebarMenu } from "@/components/SidebarMenu/SidebarMenu"
import { VentasContado } from "@/components/ventasContado/VentasContado"

export default function VentasContadoPage() {
  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <main className="flex-1 lg:ml-72 xl:ml-80 p-8">
        <div className="max-w-[1600px] mx-auto">
          <VentasContado />
        </div>
      </main>
    </div>
  )
}