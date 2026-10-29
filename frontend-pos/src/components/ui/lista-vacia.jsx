import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

// Mensaje para una lista o tabla sin registros
export default function ListaVacia({ titulo = "No hay registros", mensaje, icono: Icono = Inbox, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-tarjeta border border-dashed bg-card px-6 py-10 text-center", className)}>
      <Icono className="size-10 text-muted-foreground" aria-hidden />
      <p className="font-semibold text-foreground">{titulo}</p>
      {mensaje && <p className="max-w-sm text-sm text-muted-foreground">{mensaje}</p>}
    </div>
  )
}
