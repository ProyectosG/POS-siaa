import { cn } from "@/lib/utils"

// Bloque gris que late mientras cargan los datos
export function Esqueleto({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />
}

// Varias filas de esqueleto, para tablas y listas
export function EsqueletoFilas({ filas = 5, className }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <Esqueleto key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
