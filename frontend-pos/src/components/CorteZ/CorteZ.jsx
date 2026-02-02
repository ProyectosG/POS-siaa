"use client";

import React, { useEffect, useState } from "react";
import { useCajaStore } from "@/store/useCajaStore";
import toast from "react-hot-toast";

import HeaderCorteZ from "./HeaderCorteZ";
import CardsVentas from "./CardsVentas";
import ResumenIVA from "./ResumenIVA";
import ResumenTotales from "./ResumenTotales";
import TablaPagos from "./TablaPagos";
import AccionesCorteZ from "./AccionesCorteZ";

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
      setData(await res.json());
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el corte Z 😔");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorte();
  }, []);

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

  const first = data.ticketRange?.first_ticket;
  const last = data.ticketRange?.last_ticket;

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

  const totalRecibido = corteVacio
    ? 0
    : Object.values(data.pagos || {}).reduce(
        (sum, amt) => sum + Number(amt || 0),
        0
      );

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-auto max-h-screen">
      <HeaderCorteZ
        caja={caja}
        first={first}
        last={last}
        hasTickets={hasTickets}
      />

      <section className="mb-6">
        <CardsVentas ventas={data.ventas} />
        <ResumenIVA totalIVA={data.ventas.total_iva_gravado || 0} />
      </section>

<section className="mb-6">
  {/* Total Recibido centrado y limpio arriba */}
    <div className="text-center bg-gradient-to-r from-green-900/30 to-green-800/30 p-4 rounded-xl border border-green-500/40 shadow-xl max-w-md mx-auto mb-3 animate-glow">
    <h3 className="text-lg font-semibold text-green-400 uppercase">
      Total Recibido en Corte
    </h3>
    <p className="text-3xl font-extrabold text-green-300">
      ${totalRecibido.toFixed(2)}
    </p>
    <p className="text-xs text-slate-400">(Efectivo + Tarjeta + Otros)</p>
  </div>

  {/* Dos columnas debajo: Izquierda los 3 totales, derecha la tabla de pagos */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <ResumenTotales
      totalContado={data.ventas.ventas_contado || 0}
      totalAnticipos={data.total_anticipos || 0}
      totalAbonos={data.total_abonos || 0}
    />
    <TablaPagos pagos={data.pagos} />
  </div>
</section>



      <AccionesCorteZ
        hasTickets={hasTickets}
        confirming={confirming}
        corteConfirmado={corteConfirmado}
        setConfirming={setConfirming}
        setCorteConfirmado={setCorteConfirmado}
        data={data}
        first={first}
        last={last}
        fetchCorte={fetchCorte}
      />
    </div>
  );
}
