"use client";

import { useState } from "react";
import { Printer, CheckCircle } from "lucide-react";
import VistaPreviaTicket from "@/components/siaa-ui/VistaPreviaTicket";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/apiFetch"


export default function AccionesCorteZ({
  hasTickets,
  confirming,
  corteConfirmado,
  setConfirming,
  setCorteConfirmado,
  data,
  first,
  last,
  fetchCorte,
  general = false,
}) {
  const [verTicket, setVerTicket] = useState(false);

  const handleConfirmarCorteZ = async () => {
    if (!hasTickets || confirming) return;

    setConfirming(true);

    try {
      // Montos, fecha, usuario y caja los pone el servidor
      const res = await apiFetch(general ? `/cuts/general` : `/cuts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "Z" }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Error al registrar corte Z");
      }

      toast.success(general ? "¡Corte Z General registrado!" : "¡Corte Z registrado con éxito! 🎉");
      setCorteConfirmado(true);
      fetchCorte();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handlePrint = async () => {
    if (!hasTickets && !corteConfirmado) {
      toast.error("❌ No hay corte para imprimir");
      return;
    }

    try {
      const res = await apiFetch(`/cuts/print/current?tipo=Z`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || "¡Corte Z impreso correctamente! 🖨️");
    } catch (err) {
      toast.error("Error al imprimir");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
      <button
        onClick={handleConfirmarCorteZ}
        disabled={confirming || !hasTickets}
        className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 ${
          confirming || !hasTickets
            ? "bg-muted text-muted-foreground opacity-70 cursor-not-allowed"
            : "bg-exito text-white hover:opacity-90"
        }`}
      >
        <CheckCircle size={20} />
        {confirming ? "Confirmando..." : general ? "Confirmar Corte Z General" : "Confirmar Corte Z"}
      </button>

      <button
        onClick={general ? () => setVerTicket(true) : handlePrint}
        disabled={!general && !hasTickets && !corteConfirmado}
        className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 ${
          !general && !hasTickets && !corteConfirmado
            ? "bg-muted text-muted-foreground opacity-70 cursor-not-allowed"
            : "bg-primario text-white hover:opacity-90"
        }`}
      >
        <Printer size={20} />
        {general ? "Vista previa e impresión" : "Imprimir Corte"}
      </button>

      {general && (
        <VistaPreviaTicket
          rutaTexto={verTicket ? `/cuts/general/text?tipo=Z` : null}
          rutaImprimir={`/cuts/general/print?tipo=Z`}
          titulo="Corte Z General"
          onClose={() => setVerTicket(false)}
        />
      )}
    </div>
  );
}
