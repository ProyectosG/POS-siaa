"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  ChevronDown,
  Menu,
  X,
  LogOut,
  ShoppingCart,
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
import { puedeVer } from "@/lib/permisos"

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
         { label: "Reporte de Utilidad", href: "/dashboard/reportes/utilidad" },
    ],
  },
  {
    label: "TOOLS",
    icon: <Wrench className="w-5 h-5" />,
    iconColor: "text-indigo-500",
    subItems: [
      { label: "Resetear Datos", href: "/dashboard/tools/resetDatos" },
      { label: "Configuración del Sistema", href: "/dashboard/tools/systemSettings" },
    ],
  },
]

// Nombre del rol para mostrar (el usuario trae el nivel numérico)
function nombreRol(user) {
  if (user?.isSuperDev) return "SuperDeveloper"
  const nivel = Number(user?.access_level ?? user?.role)
  if (nivel >= 99) return "Administrador"
  if (nivel >= 90) return "Gerente"
  if (nivel >= 50) return "Supervisor"
  if (nivel >= 1) return "Cajero"
  return ""
}

export default function SidebarMenu() {
  const router = useRouter()
  const pathname = usePathname()

  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const clearCaja = useCajaStore((s) => s.clearCaja)

  // Solo las opciones que el rol del usuario puede usar; los grupos vacíos no se muestran
  const menuVisible = menuItems
    .map((item) => ({ ...item, subItems: item.subItems.filter((s) => puedeVer(user, s.href)) }))
    .filter((item) => item.subItems.length > 0)

  // Pantalla actual: su grupo empieza abierto y su nombre va en la barra del celular
  const actual = menuVisible.flatMap((i) => i.subItems.map((s) => ({ ...s, grupo: i.label }))).find((s) => s.href === pathname)

  const [openItems, setOpenItems] = React.useState(actual ? [actual.grupo] : [])
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  const toggleItem = (label) => {
    setOpenItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    )
  }

  const closeMobile = () => setIsMobileOpen(false)

  // Esc cierra el menú en el celular
  React.useEffect(() => {
    if (!isMobileOpen) return
    const alPresionar = (e) => e.key === "Escape" && closeMobile()
    window.addEventListener("keydown", alPresionar)
    return () => window.removeEventListener("keydown", alPresionar)
  }, [isMobileOpen])

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
      {/* BARRA SUPERIOR (solo debajo de 1024 px): botón del menú y pantalla actual */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-2 text-sidebar-foreground lg:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex size-11 items-center justify-center rounded-md hover:bg-sidebar-hover"
          aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMobileOpen}
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="font-black tracking-tight">
          POS<span className="text-emerald-500 mx-0.5">.</span>SIAA
        </span>
        {actual && <span className="min-w-0 truncate text-sm text-sidebar-foreground/70">· {actual.label}</span>}
      </header>

      {/* FONDO OSCURO DETRÁS DEL MENÚ ABIERTO (solo debajo de 1024 px) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* MENÚ: fijo desde 1024 px; cajón que entra desde la izquierda debajo de 1024 px */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-transform duration-300",
          "w-72 lg:w-64 lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-sidebar-border/40 px-5 py-5">
          <div>
            <p className="text-2xl font-black tracking-tighter text-sidebar-foreground leading-none">
              POS<span className="text-emerald-500 mx-0.5">.</span>SIAA
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] font-semibold text-sidebar-foreground/50">
              Panel de control
            </p>
          </div>
          <button
            onClick={closeMobile}
            className="flex size-11 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-hover lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {menuVisible.map((item) => (
              <div key={item.label}>
                <button
                  onClick={() =>
                    item.subItems.length > 0 && toggleItem(item.label)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-hover"
                  aria-expanded={openItems.includes(item.label)}
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
                          aria-current={subItem.href === pathname ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center px-4 pl-12 rounded-md text-sm transition-colors",
                            subItem.href === pathname
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                              : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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

        {/* FOOTER USUARIO */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            {hasPhoto ? (
              <img
                src={user.photoUrl}
                alt="Avatar de usuario"
                className="w-11 h-11 rounded-full object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-sidebar-accent flex items-center justify-center">
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
                {nombreRol(user)}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex size-11 items-center justify-center rounded-md text-sidebar-foreground/70 hover:text-red-400 hover:bg-sidebar-accent transition-colors"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
