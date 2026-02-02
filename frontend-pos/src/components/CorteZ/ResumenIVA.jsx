"use client";

export default function ResumenIVA({ totalIVA }) {
  return (
    <div className="text-center bg-slate-800/20 p-2 rounded-md border border-green-500/10 shadow-sm max-w-sm mx-auto mt-1">
      <h3 className="text-xs font-normal text-green-400">
        Ventas Gravadas con IVA
      </h3>
      <p className="text-sm text-white">
        ${Number(totalIVA).toFixed(2)}
      </p>
      <p className="text-xs text-slate-500">
        (IVA total causado en el período)
      </p>
    </div>
  );
}
