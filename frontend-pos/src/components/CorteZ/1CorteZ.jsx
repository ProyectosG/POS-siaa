"use client";

import React, { useEffect, useState } from "react";
import { Printer, DollarSign, CheckCircle } from "lucide-react";
import { useCajaStore } from "@/store/useCajaStore";
import toast from "react-hot-toast";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function CorteZ() {
  const { caja } = useCajaStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [corteConfirmado, setCorteConfirmado] = useState(false);

  const fetchCorte = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/cuts/current-z`);
      if (!res.ok) throw new Error("Error al obtener datos del corte Z");
      const json = await res.json();
      setData(json);
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el corte Z 😔");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorte();
  }, []);

  const first = data?.ticketRange?.first_ticket;
  const last = data?.ticketRange?.last_ticket;

  const hasTickets =
    Number.isInteger(first) &&
    Number.isInteger(last) &&
    first > 0 &&
    last > 0 &&
    first <= last;

  const corteVacio =
    !hasTickets &&
    (data?.ventas?.total_ventas ?? 0) === 0 &&
    (data?.total_recibido ?? 0) === 0;

  const handleConfirmarCorteZ = async () => {
    if (confirming) return;

    if (!hasTickets) {
      toast.error("❌ No hay tickets. No se puede realizar el Corte Z");
      return;
    }

    setConfirming(true);

    try {
      const payload = {
        type: "Z",
        date: new Date().toISOString().split("T")[0],
        desde: first,
        hasta: last,
        cash_register: data.cash_register || null,
        user_nickname: data.user_nickname || null,
        total_sales: data.ventas.total_ventas_monto || 0,
        ventas_contado: data.ventas.ventas_contado || 0,
        ventas_credito: data.ventas.ventas_credito || 0,
        ventas_apartado: data.ventas.ventas_apartado || 0,
        total_iva_gravado: data.ventas.total_iva_gravado || 0,
        pago_efectivo: data.pagos.efectivo || 0,
        pago_tarjeta: data.pagos.tarjeta || 0,
        pago_transferencia: data.pagos.transferencia || 0,
        pago_otros: data.pagos.otros || 0,
        total_recibido: data.total_recibido || 0,
        total_anticipos: data.total_anticipos || 0,
        total_abonos: data.total_abonos || 0,
        cash_in_box: data.pagos.efectivo || 0,
        first_ticket: first,
        last_ticket: last,
      };

      const res = await fetch(`${API_URL}/cuts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al registrar corte Z");
      }

      toast.success("¡Corte Z registrado con éxito! 🎉");
      setCorteConfirmado(true);
      await fetchCorte();
    } catch (err) {
      toast.error(err.message || "No se pudo registrar el corte Z 😢");
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
      const res = await fetch(`${API_URL}/cuts/print/current`);
      if (!res.ok) throw new Error("Error al imprimir corte Z");
      toast.success("¡Corte Z impreso correctamente! 🖨️");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-green-500"></div>
        <p className="ml-2 text-sm text-slate-300">
          Calculando el Corte Z... 💰
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-red-400 text-lg">
        No hay datos para mostrar 😔
      </div>
    );
  }

  const totalRecibido = corteVacio
    ? 0
    : Object.values(data.pagos || {}).reduce(
        (sum, amt) => sum + Number(amt || 0),
        0
      );

  const totalContado = corteVacio ? 0 : data.ventas.ventas_contado || 0;
  const totalAnticipos = corteVacio ? 0 : data.total_anticipos || 0;
  const totalAbonos = corteVacio ? 0 : data.total_abonos || 0;

  const pagosConTarjeta = {
    ...data.pagos,
    tarjeta: data.pagos.tarjeta || 0,
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-auto max-h-screen">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-extrabold text-white mb-1 flex items-center justify-center gap-2">
          <DollarSign size={24} className="text-green-400" />
          Corte Z (Cierre Final) 💸
        </h1>
        <p className="text-slate-400 text-sm">
          Caja:{" "}
          <span className="font-bold text-cyan-400">
            {caja?.numero || "Sin caja"}
          </span>{" "}
          | Desde: <span className="font-bold">{first ?? "-"}</span> | Hasta:{" "}
          <span className="font-bold">{last ?? "-"}</span>
        </p>

        {hasTickets ? (
          <p className="text-center mt-1 text-slate-400 text-xs font-medium">
            Del Ticket{" "}
            <span className="text-green-300 font-bold">{first}</span> al{" "}
            <span className="text-green-300 font-bold">{last}</span>
          </p>
        ) : (
          <p className="text-center mt-1 text-slate-500 text-xs italic">
            Sin tickets en este período
          </p>
        )}
      </div>

      {/* VENTAS */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-green-400 mb-3 text-center flex items-center justify-center gap-2">
          <DollarSign size={20} /> Ventas Totales
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center shadow-md">
            <p className="text-slate-300 text-sm">Total Ventas</p>
            <p className="text-xl font-bold text-white">
              ${(data.ventas.total_ventas_monto || 0).toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center shadow-md">
            <p className="text-slate-300 text-sm">Contado</p>
            <p className="text-xl font-bold text-green-300">
              ${(data.ventas.ventas_contado || 0).toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center shadow-md">
            <p className="text-slate-300 text-sm">Crédito</p>
            <p className="text-xl font-bold text-yellow-300">
              ${(data.ventas.ventas_credito || 0).toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center shadow-md">
            <p className="text-slate-300 text-sm">Apartado</p>
            <p className="text-xl font-bold text-blue-300">
              ${(data.ventas.ventas_apartado || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="text-center bg-slate-800/20 p-2 rounded-md border border-green-500/10 shadow-sm max-w-sm mx-auto mt-1">
          <h3 className="text-xs font-normal text-green-400">
            Ventas Gravadas con IVA
          </h3>
          <p className="text-sm text-white">
            ${(data.ventas.total_iva_gravado || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-500">
            (IVA total causado en el período)
          </p>
        </div>
      </section>

      {/* DINERO RECIBIDO */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-green-400 mb-3 text-center flex items-center justify-center gap-2">
          <DollarSign size={20} /> Dinero Recibido
        </h2>

        <div className="text-center bg-gradient-to-r from-green-900/30 to-green-800/30 p-4 rounded-xl border border-green-500/40 shadow-xl max-w-md mx-auto mb-3">
          <h3 className="text-lg font-semibold text-green-400">
            TOTAL RECIBIDO EN CORTE Z
          </h3>
          <p className="text-3xl font-extrabold text-green-300">
            ${totalRecibido.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col justify-center items-center min-h-[150px] space-y-3 bg-slate-800/40 rounded-lg border border-slate-600 p-4">
            <div className="border-b border-slate-600 pb-2 w-full text-center">
              <p className="text-slate-300 text-sm">Total de Contado</p>
              <p className="text-lg font-bold text-green-300">
                ${totalContado.toFixed(2)}
              </p>
            </div>
            <div className="border-b border-slate-600 pb-2 w-full text-center">
              <p className="text-slate-300 text-sm">Total Anticipos</p>
              <p className="text-lg font-bold text-green-300">
                ${totalAnticipos.toFixed(2)}
              </p>
            </div>
            <div className="border-b border-slate-600 pb-2 w-full text-center">
              <p className="text-slate-300 text-sm">Total Abonos</p>
              <p className="text-lg font-bold text-green-300">
                ${totalAbonos.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-lg border border-slate-600 p-4">
            <table className="w-full text-left text-slate-300">
              <tbody>
                {Object.entries(pagosConTarjeta).map(([method, amount]) => (
                  <tr key={method} className="border-b border-slate-600">
                    <td className="py-2 px-3 capitalize">{method}</td>
                    <td className="py-2 px-3 text-right font-bold text-green-300">
                      ${Number(amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
        <button
          onClick={handleConfirmarCorteZ}
          disabled={confirming || !hasTickets}
          className={`px-6 py-3 rounded-lg font-bold text-base flex items-center gap-2 ${
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
          className={`px-6 py-3 rounded-lg font-bold text-base flex items-center gap-2 ${
            !hasTickets && !corteConfirmado
              ? "bg-slate-700 opacity-50 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Printer size={20} />
          Imprimir Corte
        </button>
      </div>
    </div>
  );
}
