"use client";

import { DollarSign } from "lucide-react";

export default function HeaderCorteZ({ caja, first, last, hasTickets }) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-2xl font-extrabold text-white mb-2 flex items-center justify-center gap-2">
        <DollarSign size={24} className="text-green-400" />
        Corte Z (Cierre Final)
      </h1>

      {/* Combinamos toda la información en una sola línea */}
      <div className="text-sm text-slate-400">
        <span>
          Caja: <b className="text-cyan-400">{caja?.numero || "Sin caja"}</b> |{" "}
          {hasTickets ? (
            <>
              TICKETS: Desde: <b className="text-green-300">{first}</b> | Hasta:{" "}
              <b className="text-green-300">{last}</b>
            </>
          ) : (
            <span className="text-slate-500">Sin tickets nuevos en este período</span>
          )}
        </span>
      </div>
    </div>
  );
}
