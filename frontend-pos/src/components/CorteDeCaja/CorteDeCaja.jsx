"use client";

import React, { useEffect, useState, useRef } from "react";
import { Printer, DollarSign, CheckCircle } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useCajaStore } from "@/store/useCajaStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CorteDeCaja() {
  const { caja } = useCajaStore();
  const [data, setData] = useState(null);
  const [ticketRange, setTicketRange] = useState({ firstTicket: null, lastTicket: null });
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  // Cargar datos del corte + rango de tickets
  useEffect(() => {
    const fetchCorte = async () => {
      try {
        // 1. Datos principales del corte
        const corteRes = await fetch(`${API_URL}/cuts/current`);
        if (!corteRes.ok) throw new Error("Error al obtener datos del corte");
        const corteData = await corteRes.json();
        setData(corteData);

        // 2. Rango de tickets
        const rangeRes = await fetch(
          `${API_URL}/sales/range?desde=${corteData.desde}&hasta=${corteData.hasta}`
        );
        if (!rangeRes.ok) throw new Error("Error al obtener rango de tickets");
        const rangeData = await rangeRes.json();
        setTicketRange({
          firstTicket: rangeData.firstTicket,
          lastTicket: rangeData.lastTicket
        });
      } catch (err) {
        toast.error(err.message || "No se pudo cargar el corte 😔");
      } finally {
        setLoading(false);
      }
    };
    fetchCorte();
  }, []);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Corte_X_${new Date().toLocaleDateString('es-MX')}`,
    onAfterPrint: () => toast.success("¡Ticket impreso! 🖨️💸"),
  });

  // HANDLER CONFIRMAR CORTE
  const handleConfirmarCorte = async () => {
    if (!data || !ticketRange) return;

    try {
      const payload = {
        // Tipo de corte
        type: "X",

        // Fechas
        date: new Date().toISOString().split("T")[0],
        desde: data.desde,
        hasta: data.hasta,

        // Identidad
        cash_register: data.cash_register || null,
        user_nickname: data.user_nickname || null,

        // Ventas
        total_sales: data.ventas.total_ventas_monto || 0,
        ventas_contado: data.ventas.ventas_contado || 0,
        ventas_credito: data.ventas.ventas_credito || 0,
        ventas_apartado: data.ventas.ventas_apartado || 0,
        total_iva_gravado: data.ventas.total_iva_gravado || 0,

        // Pagos (desglosados por método)
        pago_efectivo: data.pagos.efectivo || 0,
        pago_tarjeta: data.pagos.tarjeta || 0,
        pago_transferencia: data.pagos.transferencia || 0,
        pago_otros: data.pagos.otros || 0,

        // Totales derivados
        total_recibido: data.total_recibido || 0,
        total_anticipos: data.total_anticipos || 0,
        total_abonos: data.total_abonos || 0,

        // Caja
        cash_in_box: data.pagos.efectivo || 0,

        // Tickets
        first_ticket: ticketRange.firstTicket,
        last_ticket: ticketRange.lastTicket,
      };

      console.log("📦 Payload corte:", payload);

      const res = await fetch(`${API_URL}/cuts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al registrar corte");

      toast.success("¡Corte X registrado con éxito! 🎉");
    } catch (err) {
      console.error("❌ Error corte:", err);
      toast.error("No se pudo registrar el corte 😢");
    }
  };
  // FINALIZA HANDLE-CONFIRMAR-CORTE

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        <p className="ml-4 text-lg text-slate-300">Calculando el corte... 💰</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-red-400 text-xl">No hay datos para mostrar 😔</div>;
  }

  // Cálculos corregidos y seguros
  const totalRecibido = Object.values(data.pagos).reduce((sum, amt) => sum + Number(amt || 0), 0);

  const totalContado = data.ventas.ventas_contado || 0;
  const totalAnticipos = data.total_anticipos || 0;   // Solo anticipos reales (payment_type='anticipo')
  const totalAbonos = data.total_abonos || 0;         // Solo abonos reales (payment_type='abono')

  // Aseguramos que "tarjeta" siempre aparezca (incluso si es 0)
  const pagosConTarjeta = {
    ...data.pagos,
    tarjeta: data.pagos.tarjeta || 0  // Forzamos que exista con 0 si no hay
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
          <DollarSign size={40} className="text-green-400" /> Corte X del Turno 💸
        </h1>
        <p className="text-slate-400">
          Caja: <span className="font-bold text-cyan-400">{caja?.numero || "Sin caja"}</span> | 
          Desde: <span className="font-bold">{data.desde}</span> | Hasta: <span className="font-bold">{data.hasta}</span>
        </p>
        {ticketRange.firstTicket && ticketRange.lastTicket && (
          <div className="text-center mt-2 text-slate-400 text-sm font-medium">
            Del Ticket: <span className="text-green-300 font-bold">{ticketRange.firstTicket}</span> al Ticket: <span className="text-green-300 font-bold">{ticketRange.lastTicket}</span>
          </div>
        )}
      </div>

      {/* SECCIÓN VENTAS TOTALES + IVA */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-green-400 mb-6 text-center flex items-center justify-center gap-3">
          <DollarSign size={28} /> Ventas Totales
        </h2>

        {/* Cards de totales por tipo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="p-5 bg-slate-800/80 rounded-xl border border-slate-700 text-center shadow-lg animate-pulse-slow">
            <p className="text-slate-300 mb-1 text-base">Total Ventas</p>
            <p className="text-3xl font-bold text-white">${data.ventas.total_ventas_monto?.toFixed(2) || "0.00"}</p>
          </div>
          <div className="p-5 bg-slate-800/80 rounded-xl border border-slate-700 text-center shadow-lg animate-pulse-slow">
            <p className="text-slate-300 mb-1 text-base">Contado</p>
            <p className="text-3xl font-bold text-green-300">${data.ventas.ventas_contado?.toFixed(2) || "0.00"}</p>
          </div>
          <div className="p-5 bg-slate-800/80 rounded-xl border border-slate-700 text-center shadow-lg animate-pulse-slow">
            <p className="text-slate-300 mb-1 text-base">Crédito</p>
            <p className="text-3xl font-bold text-yellow-300">${data.ventas.ventas_credito?.toFixed(2) || "0.00"}</p>
          </div>
          <div className="p-5 bg-slate-800/80 rounded-xl border border-slate-700 text-center shadow-lg animate-pulse-slow">
            <p className="text-slate-300 mb-1 text-base">Apartado</p>
            <p className="text-3xl font-bold text-blue-300">${data.ventas.ventas_apartado?.toFixed(2) || "0.00"}</p>
          </div>
        </div>

        {/* IVA Gravado - DISCRETO */}
        <div className="text-center bg-slate-800/20 p-3 rounded-lg border border-yellow-500/10 shadow-sm max-w-xs mx-auto mt-2">
          <h3 className="text-sm font-normal text-yellow-400 mb-0.5">Ventas Gravadas con IVA</h3>
          <p className="text-lg text-white font-normal">
            ${data.ventas.total_iva_gravado?.toFixed(2) || "0.00"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">(IVA total causado en el período)</p>
        </div>
      </section>

      {/* SECCIÓN DINERO RECIBIDO */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-blue-400 mb-6 text-center flex items-center justify-center gap-3">
          <DollarSign size={28} /> Dinero Recibido
        </h2>

        {/* Card verde centrada del TOTAL RECIBIDO EN CORTE - PRIMERO */}
        <div className="text-center bg-gradient-to-r from-green-900/30 to-green-800/30 p-8 rounded-2xl border border-green-500/40 shadow-2xl max-w-lg mx-auto mb-6 animate-glow">
          <h3 className="text-xl font-semibold text-green-400 mb-2">TOTAL RECIBIDO EN CORTE</h3>
          <p className="text-5xl font-extrabold text-green-300 glow-text">
            ${totalRecibido.toFixed(2)}
          </p>
          <p className="text-sm text-slate-400 mt-3">(Efectivo + Tarjeta + Otros)</p>
        </div>

        {/* Dos columnas simétricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna izquierda: Totales específicos */}
          <div className="flex flex-col justify-center items-center min-h-[220px] space-y-6 bg-slate-800/40 rounded-xl border border-slate-600 p-6">
            <div className="border-b border-slate-600 pb-3 w-full text-center">
              <p className="text-slate-300 text-base mb-1">Total de Contado</p>
              <p className="text-2xl font-bold text-green-300">${totalContado.toFixed(2)}</p>
            </div>
            <div className="border-b border-slate-600 pb-3 w-full text-center">
              <p className="text-slate-300 text-base mb-1">Total Anticipos</p>
              <p className="text-2xl font-bold text-blue-300">${totalAnticipos.toFixed(2)}</p>
            </div>
            <div className="border-b border-slate-600 pb-3 w-full text-center">
              <p className="text-slate-300 text-base mb-1">Total Abonos</p>
              <p className="text-2xl font-bold text-purple-300">${totalAbonos.toFixed(2)}</p>
            </div>
          </div>

          {/* Columna derecha: Formas de pago (forzamos "tarjeta" siempre) */}
          <div className="flex flex-col justify-center items-center min-h-[220px] space-y-6 bg-slate-800/40 rounded-xl border border-slate-600 p-6">
            <div className="border-b border-slate-600 pb-3 w-full text-center">
              <p className="text-slate-300 text-base mb-1">Formas de Pago</p>
            </div>
            <div className="w-full">
              <table className="w-full text-left text-slate-300">
                <tbody>
                  {Object.entries(pagosConTarjeta).map(([method, amount]) => (
                    <tr key={method} className="border-b border-slate-600 last:border-b-0">
                      <td className="py-3 px-4 capitalize font-medium text-center">{method}</td>
                      <td className="py-3 px-4 text-right font-bold text-green-300">
                        ${Number(amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(pagosConTarjeta).length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-500">
                        No hay pagos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row justify-center gap-6 mt-12">
        <button
          onClick={handleConfirmarCorte}
          className="px-10 py-5 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold text-lg rounded-xl hover:from-green-700 hover:to-green-600 transition flex items-center justify-center gap-3 shadow-lg"
        >
          <CheckCircle size={24} /> Confirmar Corte X
        </button>
        <button
          onClick={handlePrint}
          className="px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-cyan-600 transition flex items-center justify-center gap-3 shadow-lg"
        >
          <Printer size={24} /> Imprimir Ticket
        </button>
      </div>

      {/* Contenido imprimible oculto */}
      <div ref={printRef} className="hidden print:block p-8 bg-white text-black font-mono text-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">CORTE X DE CAJA</h1>
          <p>Caja: {caja?.numero || "N/A"} | Fecha: {data.hasta}</p>
          <p>Desde: {data.desde} | Hasta: {data.hasta}</p>
          {ticketRange.firstTicket && ticketRange.lastTicket && (
            <p>Del Ticket: {ticketRange.firstTicket} al Ticket: {ticketRange.lastTicket}</p>
          )}
        </div>
        <hr className="my-4 border-black" />

        <h2 className="font-bold text-lg mt-4">VENTAS TOTALES</h2>
        <p>Total Ventas: ${data.ventas.total_ventas_monto?.toFixed(2) || "0.00"}</p>
        <p>Contado: ${data.ventas.ventas_contado?.toFixed(2) || "0.00"}</p>
        <p>Crédito: ${data.ventas.ventas_credito?.toFixed(2) || "0.00"}</p>
        <p>Apartado: ${data.ventas.ventas_apartado?.toFixed(2) || "0.00"}</p>

        <p className="font-bold mt-4">IVA TOTAL GRAVADO: ${data.ventas.total_iva_gravado?.toFixed(2) || "0.00"}</p>

        <hr className="my-4 border-black" />

        <h2 className="font-bold text-lg mt-4">DINERO RECIBIDO</h2>
        <p>Total de Contado: ${totalContado.toFixed(2)}</p>
        <p>Total Anticipos: ${totalAnticipos.toFixed(2)}</p>
        <p>Total Abonos: ${totalAbonos.toFixed(2)}</p>
        {Object.entries(pagosConTarjeta).map(([method, amount]) => (
          <p key={method}>
            {method.toUpperCase()}: ${Number(amount).toFixed(2)}
          </p>
        ))}
        <p className="font-bold mt-2">
          TOTAL RECIBIDO EN CORTE: ${totalRecibido.toFixed(2)}
        </p>

        <hr className="my-4 border-black" />

        <div className="text-center mt-10 text-sm">
          <p>¡Gracias por tu turno! 🎉 Sigue rockeándola 💪</p>
        </div>
      </div>
    </div>
  );
}