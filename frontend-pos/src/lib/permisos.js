// Qué pantallas ve cada rol. Solo decide qué se MUESTRA: los permisos reales
// los revisa el backend (requireLevel en cada archivo de rutas). Si cambias un
// nivel aquí, revisa que coincida con el del servidor.

export const NIVELES = { CAJERO: 1, SUPERVISOR: 50, GERENTE: 90, ADMIN: 99 }

// Valor especial: pantalla exclusiva del SuperDeveloper
export const SOLO_SUPERDEV = "superdev"

// Nivel mínimo por pantalla (la ruta exacta o cualquier subruta)
const PERMISOS_RUTAS = {
  "/dashboard/ventas/contado": NIVELES.CAJERO,
  "/dashboard/ventas/apartado": NIVELES.CAJERO,
  "/dashboard/ventas/credito": NIVELES.CAJERO,
  "/dashboard/cortes/cortesx": NIVELES.CAJERO,
  "/dashboard/cortes/cortesz": NIVELES.GERENTE,
  "/dashboard/cxc/registroAbonosApartados": NIVELES.CAJERO,
  "/dashboard/cxc/estadodecuenta": NIVELES.CAJERO,
  "/dashboard/catalogos/familias": NIVELES.GERENTE,
  "/dashboard/catalogos/productos": NIVELES.GERENTE,
  "/dashboard/catalogos/clientes": NIVELES.GERENTE,
  "/dashboard/catalogos/cajas": NIVELES.GERENTE,
  "/dashboard/catalogos/usuarios": NIVELES.ADMIN,
  "/dashboard/inventario/entradas": NIVELES.GERENTE,
  "/dashboard/inventario/salidas": NIVELES.GERENTE,
  "/dashboard/inventario/kardex": NIVELES.GERENTE,
  "/dashboard/reportes": NIVELES.GERENTE,
  "/dashboard/tools/systemSettings": NIVELES.ADMIN,
  "/dashboard/tools/resetDatos": SOLO_SUPERDEV,
}

// Nivel que pide una ruta. El inicio (/dashboard) es para todos; una pantalla
// del dashboard que no esté en la lista queda solo para el Administrador, para
// que una pantalla nueva no quede abierta por olvido.
export function nivelRequerido(ruta) {
  const limpia = (ruta || "").replace(/\/+$/, "")
  if (limpia === "/dashboard") return NIVELES.CAJERO

  const coincidencia = Object.keys(PERMISOS_RUTAS)
    .filter((r) => limpia === r || limpia.startsWith(r + "/"))
    .sort((a, b) => b.length - a.length)[0]

  if (coincidencia) return PERMISOS_RUTAS[coincidencia]
  return limpia.startsWith("/dashboard") ? NIVELES.ADMIN : NIVELES.CAJERO
}

// El costo de los productos solo lo ve y lo captura el Administrador (el
// servidor lo quita de las respuestas y rechaza el cambio a los demás)
export function veCosto(user) {
  return Boolean(user && (user.isSuperDev || Number(user.accessLevel) >= NIVELES.ADMIN))
}

export function puedeVer(user, ruta) {
  if (!user) return false
  if (user.isSuperDev) return true

  const requerido = nivelRequerido(ruta)
  if (requerido === SOLO_SUPERDEV) return false
  return Number(user.accessLevel) >= requerido
}
