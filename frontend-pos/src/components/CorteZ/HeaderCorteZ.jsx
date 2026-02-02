"use client";

import { DollarSign } from "lucide-react";

export default function HeaderCorteZ({ caja, first, last, hasTickets }) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-2xl font-extrabold text-white mb-2 flex items-center justify-center gap-2">
        <DollarSign size={24} className="text-green-400" />
        Corte Z (Cierre Final)
      </h1>

      <div className="flex flex-wrap justify-center items-center gap-x-3 text-sm text-slate-400">
        <span>
          Caja:{" "}
          <b className="text-cyan-400">
            {caja?.numero || "Sin caja"}
          </b>
        </span>
        <span>|</span>
        <span>
          DESDE:{" "}
          <b className="text-green-300">
            {hasTickets ? first : "-"}
          </b>
        </span>
        <span>|</span>
        <span>
          HASTA:{" "}
          <b className="text-green-300">
            {hasTickets ? last : "-"}
          </b>
        </span>
      </div>
    </div>
  );
}
