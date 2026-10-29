"use client";

export default function ResumenIVA({ totalIVA }) {
  return (
    <div className="text-center bg-muted/40 p-2 rounded-md border border-green-500/10 shadow-sm max-w-sm mx-auto mt-1">
      <h3 className="text-xs font-normal text-exito">
        Ventas Gravadas con IVA
      </h3>
      <p className="text-sm text-foreground">
        ${Number(totalIVA).toFixed(2)}
      </p>
      <p className="text-xs text-muted-foreground">
        (IVA total causado en el período)
      </p>
    </div>
  );
}
