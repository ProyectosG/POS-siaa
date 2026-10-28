"use client"

import { useEffect, useRef, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// Opción al final de la lista: cobrar un precio distinto con la clave de precios
const OPCION_LIBRE = { tipo: "libre", label: "Precio libre (con clave)" }

export default function MenuPrecios({
  precios,
  selectedIndex,
  setSelectedIndex,
  onSelect,
  onClose,
  productId, // con productId aparece la opción de precio libre
}) {
  const ref = useRef(null)
  const opciones = productId ? [...precios, OPCION_LIBRE] : precios

  // Captura del precio libre: el servidor valida la clave y entrega la autorización
  const [modoLibre, setModoLibre] = useState(false)
  const [precioLibre, setPrecioLibre] = useState("")
  const [clave, setClave] = useState("")
  const [error, setError] = useState("")
  const [enviando, setEnviando] = useState(false)

  const elegir = (p) => {
    if (p.tipo === "libre") {
      setModoLibre(true)
      setError("")
      return
    }
    onSelect(p)
  }

  const autorizar = async (e) => {
    e.preventDefault()
    const precio = Number(precioLibre)
    if (!Number.isFinite(precio) || precio <= 0) return setError("Escribe un precio mayor a cero")
    if (!clave) return setError("Escribe la clave de autorización")

    setEnviando(true)
    setError("")
    try {
      const res = await apiFetch(`/settings/validar-clave-precio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave, product_id: productId, precio }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(data.error || "No se pudo validar la clave")
      if (!data.valida) throw new Error("Clave incorrecta")

      onSelect({ tipo: "libre", label: "Libre", valor: precio, autorizacion: data.autorizacion })
    } catch (err) {
      setError(err.message)
      setClave("")
    } finally {
      setEnviando(false)
    }
  }

  /* ===== TECLAS ===== */
  useEffect(() => {
    const h = (e) => {
      // En la captura del precio libre las teclas son del formulario (salvo Esc)
      if (modoLibre) {
        if (e.key === "Escape") {
          e.preventDefault()
          onClose()
        }
        return
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((i) =>
            Math.min(i + 1, opciones.length - 1)
          )
          break

        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break

        case "Enter":
          e.preventDefault()
          if (opciones[selectedIndex]) {
            elegir(opciones[selectedIndex])
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
  })

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
          {modoLibre ? "Precio libre" : "Seleccionar precio (P)"}
        </div>

        {!modoLibre && (
          <ul className="divide-y">
            {opciones.map((p, i) => (
              <li
                key={p.tipo}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => elegir(p)}
                className={`flex justify-between px-4 py-3 cursor-pointer text-sm
                  ${
                    i === selectedIndex
                      ? "bg-emerald-600 text-white"
                      : "hover:bg-emerald-50"
                  }`}
              >
                <span className="capitalize">{p.label}</span>
                {p.valor !== undefined && <span className="font-semibold">${fmt(p.valor)}</span>}
              </li>
            ))}
          </ul>
        )}

        {modoLibre && (
          <form onSubmit={autorizar} className="px-4 py-4 space-y-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">Precio unitario</span>
              <input
                autoFocus
                inputMode="decimal"
                value={precioLibre}
                onChange={(e) => setPrecioLibre(e.target.value.replace(/[^0-9.]/g, ""))}
                className="mt-1 w-full border rounded-md px-3 py-2 text-right font-mono"
                placeholder="0.00"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Clave de autorización</span>
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="w-full py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {enviando ? "Validando..." : "Autorizar precio"}
            </button>
          </form>
        )}

        <div className="px-4 py-2 text-xs text-muted-foreground border-t">
          {modoLibre ? "Enter autorizar · Esc cerrar" : "↑ ↓ navegar · Enter aceptar · Esc cerrar"}
        </div>
      </div>
    </div>
  )
}
