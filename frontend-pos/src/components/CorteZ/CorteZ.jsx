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
import { apiFetch } from "@/lib/apiFetch"
import { pesos } from "@/lib/formato"
import DesgloseGeneral from "@/components/CorteDeCaja/DesgloseGeneral"


// alcance="general": Corte Z General (consolida los Z de las cajas, solo
// Administrador). Mismo formato; en lugar de la caja dice "Todas las cajas".
export default function CorteZ({ alcance = "caja" }) {
  const esGeneral = alcance === "general";
  const { caja } = useCajaStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [corteConfirmado, setCorteConfirmado] = useState(false);
  const [avisoRespaldo, setAvisoRespaldo] = useState(null);

  const fetchCorte = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(esGeneral ? `/cuts/general/current?tipo=Z` : `/cuts/current-z`);
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
        <p className="ml-2 text-sm text-muted-foreground">
          Calculando el Corte Z... 💰
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-error text-lg">
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

  // El total lo calcula el servidor en centavos (no se suman pesos con decimales)
  const totalRecibido = corteVacio ? 0 : data.total_recibido || 0;

  return (
    <div className="superficie-corte max-w-2xl mx-auto p-4 rounded-tarjeta border border-border">
      <HeaderCorteZ
        caja={caja}
        first={first}
        last={last}
        hasTickets={hasTickets}
        general={esGeneral ? data : null}
      />

      <section className="mb-6">
        <CardsVentas ventas={data.ventas} />
        <ResumenIVA totalIVA={data.ventas.total_iva_gravado || 0} />
      </section>

<section className="mb-6">
  {/* Total Recibido centrado y limpio arriba */}
    <div className="text-center bg-gradient-to-r from-exito-suave to-exito-suave p-4 rounded-xl border border-green-500/40 shadow-xl max-w-md mx-auto mb-3 animate-glow">
    <h3 className="text-lg font-semibold text-exito uppercase">
      Total Recibido en Corte
    </h3>
    <p className="text-3xl font-extrabold text-exito">
      {pesos(totalRecibido)}
    </p>
    <p className="text-xs text-muted-foreground">(Efectivo + Tarjeta + Otros)</p>
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



      {esGeneral && <DesgloseGeneral data={data} />}

      {avisoRespaldo && (
        <p role="alert" className="mb-4 rounded-lg border border-aviso/40 bg-aviso-suave px-3 py-2 text-sm font-medium text-foreground">
          El corte quedó guardado, pero el respaldo automático falló: {avisoRespaldo}. Revísalo en Configuración.
        </p>
      )}

      <AccionesCorteZ
        // También con solo cobros (abonos a ventas anteriores) hay corte que confirmar
        hasTickets={esGeneral ? Boolean(data.incluidos) : hasTickets || Boolean(data.hay_movimientos)}
        general={esGeneral}
        setAvisoRespaldo={setAvisoRespaldo}
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
