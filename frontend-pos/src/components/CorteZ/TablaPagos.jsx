"use client";
import { pesos } from "@/lib/formato"

export default function TablaPagos({ pagos }) {
  const pagosNormalizados = {
    ...pagos,
    tarjeta: pagos?.tarjeta || 0,
  };

  return (
    <div className="tabla-desplazable bg-card rounded-lg border border-border p-4 mt-4 overflow-x-auto">
      <table className="w-full text-left text-muted-foreground">
        <tbody>
          {Object.entries(pagosNormalizados).map(([method, amount]) => (
            <tr key={method} className="border-b border-border">
              <td className="py-2 px-3 capitalize">{method}</td>
              <td className="py-2 px-3 text-right font-bold text-exito">
                {pesos(Number(amount || 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
