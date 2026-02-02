"use client";

export default function CardsVentas({ ventas }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center shadow-md">
        <p className="text-slate-300 text-sm">Total Ventas</p>
        <p className="text-xl font-bold text-white">
          ${(ventas.total_ventas_monto || 0).toFixed(2)}
        </p>
      </div>

      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center shadow-md">
        <p className="text-slate-300 text-sm">Contado</p>
        <p className="text-xl font-bold text-green-300">
          ${(ventas.ventas_contado || 0).toFixed(2)}
        </p>
      </div>

      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center shadow-md">
        <p className="text-slate-300 text-sm">Crédito</p>
        <p className="text-xl font-bold text-yellow-300">
          ${(ventas.ventas_credito || 0).toFixed(2)}
        </p>
      </div>

      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center shadow-md">
        <p className="text-slate-300 text-sm">Apartado</p>
        <p className="text-xl font-bold text-blue-300">
          ${(ventas.ventas_apartado || 0).toFixed(2)}
        </p>
      </div>
    </div>
  );
}
