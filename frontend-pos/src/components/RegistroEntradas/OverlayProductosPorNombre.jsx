"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"

/* ===== NORMALIZAR PRODUCTO ===== */
const normalizarProducto = (p) => ({
  ...p,
  stock: Number(p.stock) || 0,
})

export default function OverlayProductosPorNombre({
  resultados = [],
  selectedIndex = 0,
  setSelectedIndex,
  onSelect,
  onClose,
}) {

  /* ===== TECLADO GLOBAL ===== */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) =>
          Math.min(i + 1, resultados.length - 1)
        )
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }

      if (e.key === "Enter") {
        e.preventDefault()
        const seleccionado = resultados[selectedIndex]
        if (seleccionado) {
          onSelect(normalizarProducto(seleccionado))
        }
      }

      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handler)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handler)
    }
  }, [resultados, selectedIndex, setSelectedIndex, onSelect, onClose])

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* MODAL */}
      <div
        className={cn(
          "fixed top-28 left-1/2 -translate-x-1/2",
          "w-[820px] max-h-[420px]",
          "bg-white rounded-xl border",
          "shadow-2xl shadow-black/30",
          "z-50 overflow-hidden"
        )}
      >
        {/* HEADER */}
        <div className="px-4 py-2 border-b bg-muted/40 font-semibold text-sm">
          Buscar producto por nombre
        </div>

        {/* LISTA */}
        <div className="max-h-[340px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/30">
              <tr>
                <th className="text-left px-3 py-2">Código</th>
                <th className="text-left px-3 py-2">Artículo</th>
                <th className="text-left px-3 py-2">Presentación</th>
                <th className="text-right px-3 py-2">Stock</th>
              </tr>
            </thead>

            <tbody>
              {resultados.map((p, i) => {
                const seleccionado = i === selectedIndex
                const prod = normalizarProducto(p)

                return (
                  <tr
                    key={`${prod.id}-${i}`}
                    onClick={() => onSelect(prod)}
                    className={cn(
                      "cursor-pointer",
                      seleccionado
                        ? "bg-emerald-100 ring-1 ring-emerald-400"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <td className="px-3 py-2 font-mono">
                      {prod.codigo_barras || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {prod.articulo}
                    </td>
                    <td className="px-3 py-2">
                      {prod.presentacion}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {prod.stock}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          ↑ ↓ navegar · [Enter] seleccionar · [Esc] cerrar
        </div>
      </div>
    </>
  )
}
