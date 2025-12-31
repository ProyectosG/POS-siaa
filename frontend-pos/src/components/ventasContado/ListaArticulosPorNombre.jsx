"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"

/* ===== NORMALIZAR PRODUCTO ===== */
const normalizarProducto = (p) => ({
  ...p,
  precio_menudeo: Number(p.precio_menudeo) || 0,
  precio_mayoreo: Number(p.precio_mayoreo) || 0,
  precio_especial: Number(p.precio_especial) || 0,
  precio_oferta: Number(p.precio_oferta) || 0,
})

export default function ListaArticulosPorNombre({
  resultados = [],
  selectedIndex = 0,
  setSelectedIndex,
  onSelect,
  onClose,
}) {

  /* ===== TECLADO GLOBAL (MODAL) ===== */
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

    // ⛔ Bloquea teclado del fondo
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handler)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handler)
    }
  }, [resultados, selectedIndex, setSelectedIndex, onSelect, onClose])

  return (
    <>
      {/* ===== BACKDROP (bloquea todo abajo) ===== */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* ===== MODAL ===== */}
      <div
        className={cn(
          "fixed top-32 left-1/2 -translate-x-1/2",
          "w-[780px] max-h-[380px]",
          "bg-white rounded-xl border",
          "shadow-2xl shadow-black/30",
          "z-50 overflow-hidden",
          "pointer-events-auto"
        )}
      >
        {/* HEADER */}
        <div className="px-4 py-2 border-b bg-muted/40 font-semibold text-sm">
          Resultados por nombre
        </div>

        {/* LISTA */}
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/30">
              <tr>
                <th className="text-left px-3 py-2">Código</th>
                <th className="text-left px-3 py-2">Artículo</th>
                <th className="text-left px-3 py-2">Presentación</th>
                <th className="text-right px-3 py-2">Precio</th>
              </tr>
            </thead>

            <tbody>
              {resultados.map((p, i) => {
                const seleccionado = i === selectedIndex
                const prod = normalizarProducto(p)

                return (
                  <tr
                    key={`${prod.codigo_barras}-${i}`}
                    onClick={() => onSelect(prod)}
                    className={cn(
                      "cursor-pointer",
                      seleccionado
                        ? "bg-emerald-100 ring-1 ring-emerald-400"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <td className="px-3 py-2 font-mono">
                      {prod.codigo_barras}
                    </td>
                    <td className="px-3 py-2">
                      {prod.articulo}
                    </td>
                    <td className="px-3 py-2">
                      {prod.presentacion}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      ${prod.precio_menudeo.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          ↑ ↓ navegar · Enter seleccionar · Esc cancelar
        </div>
      </div>
    </>
  )
}
