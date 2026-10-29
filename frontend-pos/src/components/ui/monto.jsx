import { cn } from "@/lib/utils"
import { pesos } from "@/lib/formato"

// Un monto para mostrar: $1,234.50, alineado a la derecha y con números tabulares
export default function Monto({ valor, className, ...props }) {
  return (
    <span className={cn("monto", className)} {...props}>
      {pesos(valor)}
    </span>
  )
}
