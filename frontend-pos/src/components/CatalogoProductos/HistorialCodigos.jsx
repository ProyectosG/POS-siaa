"use client"

import { useEffect, useState } from "react"
import { ChevronDown, History } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// Cambios del código de barras de un producto (quién y cuándo). Los anota el
// servidor al guardar; aquí solo se consultan.
export default function HistorialCodigos({ productId }) {
  const [cambios, setCambios] = useState(null) // null = cargando
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!productId) return
    apiFetch(`/products/${productId}/codigos`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setCambios)
      .catch(() => setCambios([]))
  }, [productId])

  if (!productId) return null

  const codigo = (c) =>
    c ? <span className="font-mono whitespace-nowrap">{c}</span> : <span className="italic text-muted-foreground whitespace-nowrap">sin código</span>

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-primario hover:underline"
        aria-expanded={abierto}
      >
        <History className="hidden sm:block w-4 h-4" />
        Historial de códigos{cambios ? ` (${cambios.length})` : ""}
        <ChevronDown className={`w-4 h-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="mt-1 rounded-lg border bg-muted/40 p-3">
          {cambios === null ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : cambios.length === 0 ? (
            <p className="text-muted-foreground">Sin cambios</p>
          ) : (
            <ul className="space-y-2">
              {cambios.map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {c.date} {c.time?.slice(0, 5)}
                  </span>
                  {/* En celular cada código queda entero en su renglón */}
                  <span>{codigo(c.codigo_anterior)} →</span>
                  <span>{codigo(c.codigo_nuevo)}</span>
                  {c.nickname_user && (
                    <span className="text-muted-foreground">· {c.nickname_user}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
