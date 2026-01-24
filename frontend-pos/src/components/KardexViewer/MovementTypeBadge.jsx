"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Package } from "lucide-react"

/* ===== DETECTAR TOUCH ===== */
const isTouchDevice = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none)").matches

/* ===== META DEL KARDEX (DESCRIPCIÓN, NO EL TITULAR) ===== */
const MOVEMENT_META = {
  VENTA_CONTADO: { description: "Venta de contado", impact: "SALIDA" },
  VENTA_CREDITO: { description: "Venta a crédito", impact: "SALIDA" },
  VENTA_APARTADO: { description: "Venta en apartado", impact: "SALIDA" },
  TRASPASO_SUCURSAL: { description: "Traspaso a sucursal", impact: "SALIDA" },
  MERMA: { description: "Merma o producto dañado", impact: "SALIDA" },
  AJUSTE_NEGATIVO: { description: "Ajuste negativo de inventario", impact: "SALIDA" },

  COMPRA_PROVEEDOR: { description: "Compra a proveedor", impact: "ENTRADA" },
  DEVOLUCION_CLIENTE: { description: "Devolución de cliente", impact: "ENTRADA" },
  TRASPASO_ENTRADA: { description: "Entrada por traspaso", impact: "ENTRADA" },
  AJUSTE_POSITIVO: { description: "Ajuste positivo de inventario", impact: "ENTRADA" },

  INVENTARIO_FISICO: { description: "Inventario físico", impact: "INVENTARIO" },

  CAMBIO_NOMBRE: { description: "Cambio de nombre", impact: "CAMBIO" },
  CAMBIO_PRECIO: { description: "Cambio de precio", impact: "CAMBIO" },

  ALTA_PRODUCTO: { description: "Alta de producto", impact: "ALTA" },
  BAJA_PRODUCTO: { description: "Baja de producto", impact: "BAJA" },
}

/* ===== ESTILO EXACTO SEGÚN TU TABLA ===== */
const impactStyles = {
  ENTRADA: {
    className: "bg-emerald-100 text-emerald-700 border border-emerald-300",
    icon: "↗",
  },
  SALIDA: {
    className: "bg-rose-100 text-rose-700 border border-rose-300",
    icon: "↘",
  },
  ALTA: {
    className: "bg-emerald-100 text-emerald-700 border border-emerald-300",
    icon: "↗",
  },
  BAJA: {
    className: "bg-rose-100 text-rose-700 border border-rose-300",
    icon: "↘",
  },
  INVENTARIO: {
    className: "bg-muted text-muted-foreground border border-border",
    icon: "📦",
  },
  CAMBIO: {
    className: "bg-muted text-muted-foreground border border-border",
    icon: "📦",
  },
}


export default function MovementTypeBadge({ movementType }) {
  const meta = MOVEMENT_META[movementType]
  const impactKey = meta?.impact ?? "INVENTARIO"
  const impact = impactStyles[impactKey]
  const isTouch = isTouchDevice()

  /* ===== BADGE TAL CUAL EL KARDEX ORIGINAL ===== */
  const badge = (
<Badge className={`${impact.className} flex items-center gap-1 w-fit`}>
  <span>{impact.icon}</span>
  {impactKey}
</Badge>

  )

  /* 📱 TOUCH */
  if (isTouch && meta) {
    return (
      <div className="flex flex-col">
        {badge}
        <span className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          {meta.description}
        </span>
      </div>
    )
  }

  /* 🖥️ DESKTOP */
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <div className="max-w-xs">
          <p className="font-semibold">{meta?.description}</p>
          <p className="text-xs text-muted-foreground">
            Tipo: {movementType}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Impacto: {impactKey}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
