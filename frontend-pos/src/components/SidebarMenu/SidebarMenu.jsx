"use client"
import Link from "next/link";


import * as React from "react"
import { ChevronDown, Menu, X, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { ShoppingCart, ShoppingBag, Package, CreditCard, FolderOpen, FileText, Wrench, Receipt } from "lucide-react"

const menuItems = [
  {
    label: "VENTAS",
    icon: <ShoppingCart className="w-5 h-5" />,
    iconColor: "text-emerald-500",
    subItems: [
      { label: "Ventas Contado", href: "/dashboard/ventas/contado" }
      // { label: "Ventas a Crédito", href: "/dashboard/ventas/credito" },
      // { label: "Ventas Apartados", href: "/dashboard/ventas/apartados" },
    ],
  },
  {
    label: "COMPRAS",
    icon: <ShoppingBag className="w-5 h-5" />,
    iconColor: "text-blue-500",
    subItems: [],
  },
  {
    label: "CORTES",
    icon: <Receipt className="w-5 h-5" />,
    iconColor: "text-amber-500",
    subItems: [
      { label: "Cortes X", href: "/dashboard/cortes/x" },
      { label: "Cortes Z", href: "/dashboard/cortes/z" },
    ],
  },
  {
    label: "INVENTARIO",
    icon: <Package className="w-5 h-5" />,
    iconColor: "text-violet-500",
    subItems: [
      { label: "Registro de Entradas", href: "/dashboard/inventario/entradas" },
      { label: "Registro de Salidas", href: "/dashboard/inventario/salidas" },
    ],
  },
  {
    label: "CXC",
    icon: <CreditCard className="w-5 h-5" />,
    iconColor: "text-rose-500",
    subItems: [
      { label: "Registro de Abonos", href: "/dashboard/cxc/abonos" },
      { label: "Estados de Cuenta", href: "/dashboard/cxc/estados" },
    ],
  },
  {
    label: "CATÁLOGOS",
    icon: <FolderOpen className="w-5 h-5" />,
    iconColor: "text-cyan-500",
    subItems: [
      { label: "Familias", href: "/dashboard/catalogos/familias" },
      { label: "Productos", href: "/dashboard/catalogos/productos" },
      { label: "Clientes", href: "/dashboard/catalogos/clientes" },
      { label: "Proveedores", href: "/dashboard/catalogos/proveedores" },
      { label: "Usuarios", href: "/dashboard/catalogos/usuarios" },
      { label: "Cajas", href: "/dashboard/catalogos/cajas" },
    ],
  },
  {
    label: "REPORTES",
    icon: <FileText className="w-5 h-5" />,
    iconColor: "text-orange-500",
    subItems: [],
  },
  {
    label: "TOOLS",
    icon: <Wrench className="w-5 h-5" />,
    iconColor: "text-indigo-500",
    subItems: [
      { label: "Tickets", href: "/dashboard/tools/tickets" },
      { label: "Seguridad", href: "/dashboard/tools/seguridad" },
    ],
  },
];


export default function SidebarMenu() {
  const [openItems, setOpenItems] = React.useState([])
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  const toggleItem = (label) => {
    setOpenItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  const closeMobile = () => {
    setIsMobileOpen(false)
  }

  const handleLogout = () => {
    console.log("Logout clicked")
    // Aquí puedes agregar tu lógica de logout
  }

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-sidebar text-sidebar-foreground p-2 rounded-md shadow-lg"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-500 ease-out"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-all duration-500 ease-out",
          "w-72 md:w-80",
          isMobileOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h2 className="text-xl font-semibold text-sidebar-foreground tracking-tight">Sistema POS</h2>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Panel de Control</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <div key={item.label}>
                <button
                  onClick={() => item.subItems && item.subItems.length > 0 && toggleItem(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200",
                    "text-sidebar-foreground hover:bg-sidebar-hover",
                    "group"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("transition-colors", item.iconColor)}>{item.icon}</div>
                    <span className="font-medium text-sm tracking-wide">{item.label}</span>
                  </div>
                  {item.subItems && item.subItems.length > 0 && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-sidebar-foreground/60 transition-transform duration-200",
                        openItems.includes(item.label) && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {item.subItems && item.subItems.length > 0 && openItems.includes(item.label) && (
                  <div className="mt-1 ml-4 space-y-1 animate-in fade-in-0 slide-in-from-top-2 duration-400 ease-out">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.label}
                        href={subItem.href}
                        onClick={closeMobile}
                        className={cn(
                          "block px-4 py-2.5 pl-12 rounded-md text-sm transition-all duration-300 ease-out",
                          "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sidebar-primary to-accent overflow-hidden ring-2 ring-sidebar-border">
                <img src="/cashier.png" alt="Cajero" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-sidebar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">María González</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Cajera Principal</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-sidebar-hover text-sidebar-foreground/60 hover:text-red-500 transition-all duration-200"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}