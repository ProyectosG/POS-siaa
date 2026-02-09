"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"

/**
 * Normaliza los datos de un producto para que siempre tenga los campos básicos
 * Puedes agregar más campos si lo necesitas
 */
const normalizarProducto = (p) => ({
  ...p,
  codigo_barras: p.codigo_barras || p.codigo || "-",
  articulo: p.articulo || p.name || "-",
  presentacion: p.presentacion || p.presentation || "-",
  stock: Number(p.stock ?? p.quantity ?? 0),
})

/**
 * OverlayProductos
 *
 * Componente genérico para mostrar productos en un modal tipo overlay.
 * Recibe:
 * - resultados: array de objetos con datos de productos
 * - columns: array de columnas { key, label, align? }
 * - selectedIndex / setSelectedIndex: para navegación con teclado
 * - onSelect: función que recibe el producto seleccionado
 * - onClose: función para cerrar el overlay
 * - selectedColor: color para el fondo del producto seleccionado (tailwind color, ej. "emerald")
 */
export default function OverlayProductos({
  resultados = [],
  columns = [],
  selectedIndex = 0,
  setSelectedIndex,
  onSelect,
  onClose,
  selectedColor = "emerald",
}) {

  /* ===== TECLADO GLOBAL (↑ ↓ Enter Esc) ===== */
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
        setSelectedIndex((i) => Math.max(i - 0, 0))
      }

      if (e.key === "Enter") {
        e.preventDefault()
        const seleccionado = resultados[selectedIndex]
        if (seleccionado) onSelect(normalizarProducto(seleccionado))
      }

      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    // Bloquea el scroll del fondo mientras el overlay está abierto
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handler)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handler)
    }
  }, [resultados, selectedIndex, setSelectedIndex, onSelect, onClose])

  return (
    <>
      {/* ===== BACKDROP ===== */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* ===== MODAL ===== */}
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
          Buscar producto
        </div>

        {/* LISTA */}
        <div className="max-h-[340px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/30">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "text-left px-3 py-2",
                      col.align === "right" && "text-right"
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {resultados.map((p, i) => {
                const seleccionado = i === selectedIndex
                const prod = normalizarProducto(p)

                return (
                  <tr
                    key={`${prod.id ?? prod.codigo_barras}-${i}`}
                    onClick={() => onSelect(prod)}
                    className={cn(
                      "cursor-pointer",
                      seleccionado
                        ? `bg-${selectedColor}-100 ring-1 ring-${selectedColor}-400`
                        : "hover:bg-muted/40"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-2",
                          col.align === "right" && "text-right",
                          col.key === "codigo_barras" && "font-mono",
                          col.key === "stock" && "font-semibold"
                        )}
                      >
                        {prod[col.key] ?? "-"}
                      </td>
                    ))}
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
