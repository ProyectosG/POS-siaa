"use client"

import { useEffect, useRef } from "react"

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function MenuPrecios({
  precios,
  selectedIndex,
  setSelectedIndex,
  onSelect,
  onClose,
}) {
  const ref = useRef(null)

  /* ===== TECLAS ===== */
  useEffect(() => {
    const h = (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((i) =>
            Math.min(i + 1, precios.length - 1)
          )
          break

        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break

        case "Enter":
          e.preventDefault()
          if (precios[selectedIndex]) {
            onSelect(precios[selectedIndex])
          }
          break

        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [precios, selectedIndex, setSelectedIndex, onSelect, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* menú */}
      <div
        ref={ref}
        className="relative bg-white rounded-xl shadow-2xl w-[320px] border"
      >
        <div className="px-4 py-3 border-b font-semibold text-sm text-muted-foreground">
          Seleccionar precio (P)
        </div>

        <ul className="divide-y">
          {precios.map((p, i) => (
            <li
              key={p.tipo}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => onSelect(p)}
              className={`flex justify-between px-4 py-3 cursor-pointer text-sm
                ${
                  i === selectedIndex
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-emerald-50"
                }`}
            >
              <span className="capitalize">{p.label}</span>
              <span className="font-semibold">${fmt(p.valor)}</span>
            </li>
          ))}
        </ul>

        <div className="px-4 py-2 text-xs text-muted-foreground border-t">
          ↑ ↓ navegar · Enter aceptar · Esc cerrar
        </div>
      </div>
    </div>
  )
}
