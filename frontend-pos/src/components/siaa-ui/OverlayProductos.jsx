"use client"

import { useEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/store/useSettingsStore"

const normalizarProducto = (p) => ({
  ...p,
  codigo_barras: p.codigo_barras || p.codigo || "-",
  articulo: p.articulo || p.name || "-",
  presentacion: p.presentacion || p.presentation || "-",
  stock: Number(p.stock ?? p.quantity ?? 0),
})

export default function OverlayProductos({
  resultados = [],
  columns = [],
  selectedIndex = 0,
  setSelectedIndex,
  onSelect,
  onClose,
  selectedColor,
}) {
  const settings = useSettingsStore((s) => s.settings)
  const containerRef = useRef(null)

  const productosFiltrados = useMemo(() => {
    const permiteNegativos = !!settings?.allow_negative_balance
    if (permiteNegativos) return resultados
    return resultados.filter((p) => Number(p.stock ?? p.quantity ?? 0) > 0)
  }, [resultados, settings])

  useEffect(() => {
    if (containerRef.current) containerRef.current.focus()

    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        onClose()
        return
      }

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, productosFiltrados.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const seleccionado = productosFiltrados[selectedIndex]
        if (seleccionado) onSelect(normalizarProducto(seleccionado))
      }
    }

    document.addEventListener("keydown", handler, true)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handler, true)
      document.body.style.overflow = ""
    }
  }, [productosFiltrados, selectedIndex, onClose, onSelect, setSelectedIndex])

  return (
    <>
      {/* BACKDROP CON BLUR SUTIL */}
      <div 
        className="fixed inset-0 bg-black/40 z-[9998] backdrop-blur-[2px]" 
        onClick={onClose} 
      />

      {/* MODAL REFINADO */}
      <div 
        ref={containerRef}
        tabIndex={-1} 
        className={cn(
          "fixed top-24 left-1/2 -translate-x-1/2 outline-none",
          "w-[850px] max-h-[500px] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[9999] overflow-hidden flex flex-col border border-slate-200"
        )}
      >
        {/* CABECERA MÁS LIMPIA */}
        <div className="px-6 py-4 border-b bg-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="font-extrabold text-slate-900 text-base tracking-tight">
              PRODUCTOS ENCONTRADOS
              <span className="ml-2 text-slate-400 font-medium">({productosFiltrados.length})</span>
            </h2>
            {!settings?.allow_negative_balance && (
              <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded shadow-sm font-bold animate-pulse">
                SÓLO EXISTENCIAS
              </span>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="group flex items-center gap-2 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <span className="text-[10px] font-bold border border-slate-200 px-1.5 py-0.5 rounded group-hover:border-rose-200">ESC</span>
            <span className="text-xs font-bold uppercase tracking-widest">Cerrar</span>
          </button>
        </div>

        {/* CUERPO DE TABLA CON MEJOR CONTRASTE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-20 shadow-sm">
              <tr>
                {columns.map((col) => (
                  <th 
                    key={col.key} 
                    className={cn(
                      "px-6 py-3 text-left text-[11px] text-slate-900 font-black uppercase tracking-wider border-b border-slate-200", 
                      col.align === "right" && "text-right"
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productosFiltrados.map((p, i) => {
                const seleccionado = i === selectedIndex
                const prod = normalizarProducto(p)
                return (
                  <tr 
                    key={i} 
                    onClick={() => onSelect(prod)}
                    className={cn(
                      "cursor-pointer transition-all duration-75", 
                      seleccionado 
                        ? "bg-emerald-50 ring-2 ring-inset ring-emerald-500/50 shadow-inner" 
                        : "hover:bg-slate-50/80"
                    )}
                  >
                    {columns.map((col) => (
                      <td 
                        key={col.key} 
                        className={cn(
                          "px-6 py-4 text-slate-700 font-medium", 
                          col.align === "right" && "text-right", 
                          col.key === "stock" && "font-bold text-emerald-700",
                          col.key === "codigo_barras" && "font-mono text-xs text-slate-500",
                          seleccionado && "text-emerald-900"
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
          
          {productosFiltrados.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-slate-400 text-sm font-medium">No se encontraron productos disponibles.</p>
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA (MARGEN INFERIOR Y ATAJOS) */}
        <div className="px-6 py-3 border-t bg-slate-50 flex justify-between items-center">
          <div className="flex gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <span className="bg-white border border-slate-300 px-1 rounded text-slate-900">↑↓</span> Navegar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-white border border-slate-300 px-1 rounded text-slate-900">ENTER</span> Seleccionar
            </span>
          </div>
          <div className="text-[10px] font-black text-slate-400 italic">
            MODO: {settings?.allow_negative_balance ? "VENTA LIBRE" : "CONTROL DE STOCK"}
          </div>
        </div>
      </div>
    </>
  )
}