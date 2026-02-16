"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  Menu,
  X,
  LogOut,
  ShoppingCart,
  ShoppingBag,
  Package,
  CreditCard,
  FolderOpen,
  FileText,
  Wrench,
  Receipt,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/useAuthStore"
import { useCajaStore } from "@/store/useCajaStore"

const menuItems = [
  {
    label: "VENTAS",
    icon: <ShoppingCart className="w-5 h-5" />,
    iconColor: "text-emerald-500",
    subItems: [
      { label: "Ventas Contado", href: "/dashboard/ventas/contado" },
      { label: "Ventas Apartado", href: "/dashboard/ventas/apartado" }
    ],
  },
  {
    label: "CORTES",
    icon: <Receipt className="w-5 h-5" />,
    iconColor: "text-amber-500",
    subItems: [
      { label: "Cortes X", href: "/dashboard/cortes/cortesx" },
      { label: "Cortes Z", href: "/dashboard/cortes/cortesz" },
    ],
  },
  {
    label: "CXC",
    icon: <CreditCard className="w-5 h-5" />,
    iconColor: "text-rose-500",
    subItems: [
      { label: "Registro de Abonos", href: "/dashboard/cxc/registroAbonosApartados" },
      { label: "Estados de Cuenta", href: "/dashboard/cxc/estadodecuenta" },
      
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
    label: "INVENTARIO",
    icon: <Package className="w-5 h-5" />,
    iconColor: "text-violet-500",
    subItems: [
      { label: "Registro de Entradas", href: "/dashboard/inventario/entradas" },
      { label: "Registro de Salidas", href: "/dashboard/inventario/salidas" },
    ],
  },
  {
    label: "COMPRAS",
    icon: <ShoppingBag className="w-5 h-5" />,
    iconColor: "text-blue-500",
    subItems: [],
  },
  {
    label: "REPORTES",
    icon: <FileText className="w-5 h-5" />,
    iconColor: "text-orange-500",
    subItems: [
         { label: "ListarTodosProductos", href: "/dashboard/reportes/listarTodosProductos" },
         { label: "Kardex", href: "/dashboard/inventario/kardex" },
         { label: "Lista de Ventas", href: "/dashboard/reportes/listaVentas" },  
         { label: "Reporte de Cortes", href: "/dashboard/reportes/reportecortes" },   
         {label: "Reporte de Entradas", href: "/dashboard/reportes/reporteentradas"  },
         {label: "Reporte de Salidas", href: "/dashboard/reportes/reportesalidas"  }, 
    ],
  },
  {
    label: "TOOLS",
    icon: <Wrench className="w-5 h-5" />,
    iconColor: "text-indigo-500",
    subItems: [
      { label: "Tickets", href: "/dashboard/tools/tickets" },
      { label: "Seguridad", href: "/dashboard/tools/seguridad" },
      { label: "Resetear Datos", href: "/dashboard/tools/resetDatos" },
      { label: "Configuración del Sistema", href: "/dashboard/tools/systemSettings" },
    ],
  },
]

export default function SidebarMenu() {
  const router = useRouter()

  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const clearCaja = useCajaStore((s) => s.clearCaja)

  const [openItems, setOpenItems] = React.useState([])
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  const toggleItem = (label) => {
    setOpenItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    )
  }

  const closeMobile = () => setIsMobileOpen(false)

  const handleLogout = () => {
    clearCaja()
    logout()
    router.replace("/login")
  }

  const hasPhoto =
    typeof user?.photoUrl === "string" &&
    user.photoUrl.trim() !== ""

  return (
    <>
      {/* BOTÓN HAMBURGUESA (SIEMPRE VISIBLE) */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 bg-sidebar text-sidebar-foreground p-2 rounded-md shadow-lg"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* OVERLAY */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeMobile}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-all duration-500",
          "w-72 md:w-80",
          isMobileOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0"
        )}
      >
{/* HEADER DEL SIDEBAR - VERSIÓN ULTRA ELEGANTE */}
<div className="relative p-8 border-b border-sidebar-border/40 overflow-hidden group">
  {/* Efecto de luz ambiental en el fondo */}
  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-700" />
  
  <div className="relative z-10 flex flex-col gap-1">


    {/* Título con contraste de pesos */}
    <h2 className="mx-3 mt-7 text-2xl tracking-tighter text-sidebar-foreground leading-none flex flex-col">
 
      <span className="font-black">
        POS<span className="text-emerald-500 mx-0.5">.</span>SIAA
      </span>
    </h2>

    {/* Indicador de estado dinámico */}
    <div className="flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-sidebar-accent/30 border border-sidebar-border/50 w-fit backdrop-blur-sm">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </span>
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-sidebar-foreground/50">
        Panel de Control
      </p>
    </div>
  </div>
</div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <div key={item.label}>
                <button
                  onClick={() =>
                    item.subItems.length > 0 && toggleItem(item.label)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className={item.iconColor}>{item.icon}</div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.subItems.length > 0 && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-sidebar-foreground/60 transition-transform",
                        openItems.includes(item.label) && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {item.subItems.length > 0 &&
                  openItems.includes(item.label) && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.label}
                          href={subItem.href}
                          onClick={closeMobile}
                          className="block px-4 py-2.5 pl-12 rounded-md text-sm transition-all text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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

        {/* FOOTER USUARIO */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            {hasPhoto ? (
              <img
                src={user.photoUrl}
                alt="Avatar de usuario"
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-sidebar-foreground/80">
                  {user?.nickname?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user?.nickname ?? "Usuario"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.role ?? ""}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-md text-sidebar-foreground/70 hover:text-red-400 hover:bg-sidebar-accent transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
