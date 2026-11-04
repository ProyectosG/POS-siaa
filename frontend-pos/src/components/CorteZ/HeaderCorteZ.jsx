"use client";

import { DollarSign } from "lucide-react";
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla";

export default function HeaderCorteZ({ caja, first, last, hasTickets, general }) {
  return (
    <EncabezadoPantalla
      titulo={general ? "Corte Z General" : "Corte Z (cierre final)"}
      icono={DollarSign}
      subtitulo={general ? (
        <><b className="text-foreground">Todas las cajas</b> · {general.incluidos} {general.incluidos === 1 ? "corte Z por consolidar" : "cortes Z por consolidar"}</>
      ) : (
        <>
          Caja <b className="text-foreground">{caja?.numero || "sin caja"}</b> ·{" "}
          {hasTickets
            ? <>tickets del <b className="tabular text-foreground">{first}</b> al <b className="tabular text-foreground">{last}</b></>
            : "sin tickets nuevos en este período"}
        </>
      )}
    />
  );
}
