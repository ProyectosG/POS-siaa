import { SidebarMenu } from "@/components/SidebarMenu/SidebarMenu"
import {CatalogoProductos} from "@/components/CatalogoProductos/CatalogoProductos"

export default function ProductosPage() {
  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <main className="flex-1 lg:ml-72 xl:ml-80 p-8">
        <div className="max-w-7xl mx-auto">
          <CatalogoProductos />
        </div>
      </main>
    </div>
  )
}