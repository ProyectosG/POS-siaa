"use client"

import { Info } from "lucide-react"

// Recuadro con los datos de acceso de la demo y un botón que los llena
export default function DatosDemo({ datos, onUsar }) {
  return (
    <div className="mb-5 rounded-lg border border-aviso/30 bg-aviso-suave p-3 text-sm text-foreground">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-aviso" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Demo: los datos se reinician</p>
          <p className="mt-1 text-muted-foreground">
            {datos.map(([etiqueta, valor], i) => (
              <span key={etiqueta}>
                {i > 0 && " · "}
                {etiqueta}: <b className="font-mono text-foreground">{valor}</b>
              </span>
            ))}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onUsar}
        className="mt-2 w-full rounded-md border border-aviso/40 bg-card font-semibold text-foreground transition hover:bg-aviso-suave"
      >
        Usar estos datos
      </button>
    </div>
  )
}
