"use client";

import { DollarSign } from "lucide-react";
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla";

export default function HeaderCorteZ({ caja, first, last, hasTickets }) {
  return (
    <EncabezadoPantalla
      titulo="Corte Z (cierre final)"
      icono={DollarSign}
      subtitulo={
        <>
          Caja <b className="text-foreground">{caja?.numero || "sin caja"}</b> ·{" "}
          {hasTickets
            ? <>tickets del <b className="tabular text-foreground">{first}</b> al <b className="tabular text-foreground">{last}</b></>
            : "sin tickets nuevos en este período"}
        </>
      }
    />
  );
}
