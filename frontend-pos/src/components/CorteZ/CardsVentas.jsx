"use client";

export default function CardsVentas({ ventas }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md">
        <p className="text-muted-foreground text-sm">Total Ventas</p>
        <p className="text-xl font-bold text-foreground">
          ${(ventas.total_ventas_monto || 0).toFixed(2)}
        </p>
      </div>

      <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md">
        <p className="text-muted-foreground text-sm">Contado</p>
        <p className="text-xl font-bold text-exito">
          ${(ventas.ventas_contado || 0).toFixed(2)}
        </p>
      </div>

      <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md">
        <p className="text-muted-foreground text-sm">Crédito</p>
        <p className="text-xl font-bold text-aviso">
          ${(ventas.ventas_credito || 0).toFixed(2)}
        </p>
      </div>

      <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md">
        <p className="text-muted-foreground text-sm">Apartado</p>
        <p className="text-xl font-bold text-primario">
          ${(ventas.ventas_apartado || 0).toFixed(2)}
        </p>
      </div>
    </div>
  );
}
