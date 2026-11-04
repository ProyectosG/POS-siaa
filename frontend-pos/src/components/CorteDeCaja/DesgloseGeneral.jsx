"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import { pesos } from "@/lib/formato";

const COLUMNAS = [
  ["ventas", "Ventas"],
  ["iva", "IVA"],
  ["recibido", "Recibido"],
  ["efectivo", "Efectivo"],
  ["tarjeta", "Tarjeta"],
  ["transferencia", "Transf."],
  ["otros", "Otros"],
];

// Debajo del formato de siempre, en los cortes generales: si cuadra (lo decide el
// servidor, en centavos), lo que queda fuera y la tabla por caja. Los folios no son
// consecutivos entre cajas: el rango es por caja.
export default function DesgloseGeneral({ data }) {
  const filas = data.por_caja || [];
  const total = data.total_por_caja;

  return (
    <section className="mb-6 space-y-3">
      <h2 className="text-center text-xl font-bold text-primario">Desglose por caja</h2>

      {data.cuadra ? (
        <p className="flex items-center justify-center gap-2 rounded-lg bg-exito-suave px-3 py-2 text-sm font-semibold text-foreground">
          <CheckCircle className="size-4 shrink-0 text-exito" /> Cuadra con las ventas y los pagos
        </p>
      ) : (
        <p role="alert" className="flex items-center justify-center gap-2 rounded-lg border border-aviso/40 bg-aviso-suave px-3 py-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="size-4 shrink-0 text-aviso" />
          No cuadra: diferencia de {pesos((data.diferencia_centavos || 0) / 100)} contra las ventas y los pagos
        </p>
      )}

      {(data.fuera || []).map((f) => (
        <p key={f.caja} className="flex items-start gap-2 rounded-lg border border-aviso/40 bg-aviso-suave px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-aviso" /> {f.texto}
        </p>
      ))}

      <div className="tabla-desplazable overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Caja</th>
              <th className="px-3 py-2">Tickets</th>
              {COLUMNAS.map(([campo, titulo]) => (
                <th key={campo} className="px-3 py-2 text-right">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.caja} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 font-semibold text-foreground">{f.caja}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular text-muted-foreground">
                  {f.primer_ticket == null ? "—" : `${f.primer_ticket} al ${f.ultimo_ticket}`}
                </td>
                {COLUMNAS.map(([campo]) => (
                  <td key={campo} className="monto px-3 py-2 text-foreground">{pesos(f[campo])}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {total && (
            <tfoot>
              <tr className="border-t-2 border-border font-bold text-foreground">
                <td className="px-3 py-2" colSpan={2}>Total</td>
                {COLUMNAS.map(([campo]) => (
                  <td key={campo} className="monto px-3 py-2">{pesos(total[campo])}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
