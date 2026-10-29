"use client";

import { Printer, CheckCircle } from "lucide-react";
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
}) {
  const handleConfirmarCorteZ = async () => {
    if (!hasTickets || confirming) return;

    setConfirming(true);

    try {
      const payload = {
        type: "Z",
        date: new Date().toISOString().split("T")[0],
        desde: first,
        hasta: last,
        total_sales: data.ventas.total_ventas_monto || 0,
        total_iva_gravado: data.ventas.total_iva_gravado || 0,
        total_recibido: data.total_recibido || 0,
        first_ticket: first,
        last_ticket: last,
      };

      const res = await apiFetch(`/cuts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al registrar corte Z");

      toast.success("¡Corte Z registrado con éxito! 🎉");
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
        {confirming ? "Confirmando..." : "Confirmar Corte Z"}
      </button>

      <button
        onClick={handlePrint}
        disabled={!hasTickets && !corteConfirmado}
        className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 ${
          !hasTickets && !corteConfirmado
            ? "bg-muted text-muted-foreground opacity-70 cursor-not-allowed"
            : "bg-primario text-white hover:opacity-90"
        }`}
      >
        <Printer size={20} />
        Imprimir Corte
      </button>
    </div>
  );
}
