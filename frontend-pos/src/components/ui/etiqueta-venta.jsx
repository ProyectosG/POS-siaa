import { cn } from "@/lib/utils"

const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"

// Tipo de venta: contado (azul), apartado (ámbar), crédito (gris)
const TIPOS = {
  contado: { texto: "Contado", clase: "bg-primario-suave text-primario" },
  apartado: { texto: "Apartado", clase: "bg-aviso-suave text-aviso" },
  credito: { texto: "Crédito", clase: "bg-muted text-foreground" },
}

// Estado: pagado o completado (verde), pendiente (ámbar), cancelado (rojo)
const ESTADOS = {
  paid: { texto: "Pagado", clase: "bg-exito-suave text-exito" },
  completed: { texto: "Pagado", clase: "bg-exito-suave text-exito" },
  pending: { texto: "Pendiente", clase: "bg-aviso-suave text-aviso" },
  cancelled: { texto: "Cancelado", clase: "bg-error-suave text-error" },
}

export function EtiquetaTipoVenta({ tipo, className }) {
  const t = TIPOS[String(tipo || "").toLowerCase()] || { texto: tipo || "—", clase: "bg-muted text-muted-foreground" }
  return <span className={cn(base, t.clase, className)}>{t.texto}</span>
}

export function EtiquetaEstadoVenta({ estado, className }) {
  const e = ESTADOS[String(estado || "").toLowerCase()] || { texto: estado || "—", clase: "bg-muted text-muted-foreground" }
  return <span className={cn(base, e.clase, className)}>{e.texto}</span>
}
