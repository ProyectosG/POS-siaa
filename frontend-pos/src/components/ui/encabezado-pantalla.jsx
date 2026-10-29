import { cn } from "@/lib/utils"

// Título y subtítulo de cada pantalla, con acciones opcionales a la derecha
// (abajo en pantallas angostas)
export default function EncabezadoPantalla({ titulo, subtitulo, icono: Icono, acciones, className }) {
  return (
    <header className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {Icono && <Icono className="size-7 shrink-0 text-primario" aria-hidden />}
          <span className="min-w-0 break-words">{titulo}</span>
        </h1>
        {subtitulo && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  )
}
