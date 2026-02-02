"use client";

import { Printer, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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

      const res = await fetch(`${API_URL}/cuts`, {
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
      await fetch(`${API_URL}/cuts/print/current`);
      toast.success("¡Corte Z impreso correctamente! 🖨️");
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
            ? "bg-slate-700 opacity-50 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
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
            ? "bg-slate-700 opacity-50 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        <Printer size={20} />
        Imprimir Corte
      </button>
    </div>
  );
}
