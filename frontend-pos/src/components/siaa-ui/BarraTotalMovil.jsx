"use client"

import { ArrowDown } from "lucide-react"
import { pesos } from "@/lib/formato"

// Celular (menos de 768 px): el total de la venta siempre a la vista, abajo,
// con un botón que lleva al pago. En tablet y escritorio no se muestra.
export default function BarraTotalMovil({ total, etiqueta = "Total", destino = "pago-venta", textoBoton = "Ir a cobrar" }) {
  const irAlPago = () => document.getElementById(destino)?.scrollIntoView({ behavior: "smooth", block: "start" })

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t bg-card px-4 py-2 shadow-[0_-2px_8px_oklch(0_0_0/0.08)] md:hidden">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        <p className="monto text-left text-2xl font-bold text-foreground">{pesos(total)}</p>
      </div>
      <button
        type="button"
        onClick={irAlPago}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primario px-4 font-semibold text-white"
      >
        {textoBoton} <ArrowDown className="size-4" />
      </button>
    </div>
  )
}
