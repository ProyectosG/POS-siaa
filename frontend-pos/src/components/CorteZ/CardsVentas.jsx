"use client";
import { pesos } from "@/lib/formato"

export default function CardsVentas({ ventas }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md">
        <p className="text-muted-foreground text-sm">Total Ventas</p>
        <p className="text-xl font-bold text-foreground">
          {pesos((ventas.total_ventas_monto || 0))}
        </p>
      </div>

      <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md">
        <p className="text-muted-foreground text-sm">Contado</p>
        <p className="text-xl font-bold text-exito">
          {pesos((ventas.ventas_contado || 0))}
        </p>
      </div>

      <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md">
        <p className="text-muted-foreground text-sm">Crédito</p>
        <p className="text-xl font-bold text-aviso">
          {pesos((ventas.ventas_credito || 0))}
        </p>
      </div>

      <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md">
        <p className="text-muted-foreground text-sm">Apartado</p>
        <p className="text-xl font-bold text-primario">
          {pesos((ventas.ventas_apartado || 0))}
        </p>
      </div>
    </div>
  );
}
