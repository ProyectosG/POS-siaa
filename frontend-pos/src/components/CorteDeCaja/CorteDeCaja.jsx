"use client";

import React, { useEffect, useState } from "react";
import { Printer, DollarSign, CheckCircle } from "lucide-react";
import { useCajaStore } from "@/store/useCajaStore";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/apiFetch"
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla"
import { pesos } from "@/lib/formato"



export default function CorteDeCaja() {
  const { caja } = useCajaStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const fetchCorte = async () => {
    try {
      setLoading(true);
      const corteRes = await apiFetch(`/cuts/current`);
      if (!corteRes.ok) throw new Error("Error al obtener datos del corte");
      const corteData = await corteRes.json();
      setData(corteData);
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el corte 😔");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorte();
  }, []);

  const handlePrint = async () => {
    try {
      const res = await apiFetch(`/cuts/print/current?tipo=X&caja=${encodeURIComponent(caja?.numero || "")}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status} al imprimir corte`);
      }
      // El servidor dice si imprimió o si no encontró impresora (modo prueba)
      toast.success(data.message || "Corte X impreso 🖨️");
    } catch (err) {
      toast.error("No se pudo imprimir el corte: " + err.message);
    }
  };

  const handleConfirmarCorte = async () => {
    if (!data || confirming) return;

    setConfirming(true);

    try {
      const payload = {
        type: "X",
        date: new Date().toISOString().split("T")[0],
        desde: data.desde,
        hasta: data.hasta,
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
        first_ticket: data.ticketRange?.first_ticket ?? null,
        last_ticket: data.ticketRange?.last_ticket ?? null,
      };

      const res = await apiFetch(`/cuts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al registrar corte");
      }

      toast.success("¡Corte X registrado con éxito! 🎉");
      await fetchCorte();
    } catch (err) {
      console.error("❌ Error al registrar corte:", err);
      toast.error("No se pudo registrar el corte 😢");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-blue-500"></div>
        <p className="ml-2 text-sm text-muted-foreground">Calculando el corte... 💰</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-error text-lg">No hay datos para mostrar 😔</div>;
  }

  const totalRecibido = Object.values(data.pagos).reduce(
    (sum, amt) => sum + Number(amt || 0),
    0
  );

  const totalContado = data.ventas.ventas_contado || 0;
  const totalAnticipos = data.total_anticipos || 0;
  const totalAbonos = data.total_abonos || 0;

  const pagosConTarjeta = {
    ...data.pagos,
    tarjeta: data.pagos.tarjeta || 0,
  };

  const first = data.ticketRange?.first_ticket;
  const last = data.ticketRange?.last_ticket;

  const hasTickets =
    Number.isInteger(first) &&
    Number.isInteger(last) &&
    first <= last;
    
  return (
    <div className="max-w-3xl mx-auto">
      <EncabezadoPantalla
        titulo="Corte X del turno"
        icono={DollarSign}
        subtitulo={
          <>
            Caja <b className="text-foreground">{caja?.numero || "sin caja"}</b> ·{" "}
            {hasTickets ? <>tickets del <b className="tabular text-foreground">{first}</b> al <b className="tabular text-foreground">{last}</b></> : "sin tickets nuevos en este período"}
          </>
        }
      />
      <div className="rounded-tarjeta border bg-card p-4 shadow-suave sm:p-6">


      {/* SECCIÓN VENTAS TOTALES + IVA */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-exito mb-3 text-center flex items-center justify-center gap-2">
          <DollarSign size={20} /> Ventas Totales
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md animate-pulse-slow">
            <p className="text-muted-foreground mb-0.5 text-sm">Total Ventas</p>
            <p className="text-xl font-bold text-foreground">{pesos(data.ventas.total_ventas_monto)}</p>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md animate-pulse-slow">
            <p className="text-muted-foreground mb-0.5 text-sm">Contado</p>
            <p className="text-xl font-bold text-exito">{pesos(data.ventas.ventas_contado)}</p>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md animate-pulse-slow">
            <p className="text-muted-foreground mb-0.5 text-sm">Crédito</p>
            <p className="text-xl font-bold text-aviso">{pesos(data.ventas.ventas_credito)}</p>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border text-center shadow-md animate-pulse-slow">
            <p className="text-muted-foreground mb-0.5 text-sm">Apartado</p>
            <p className="text-xl font-bold text-primario">{pesos(data.ventas.ventas_apartado)}</p>
          </div>
        </div>

        <div className="text-center bg-muted/40 p-2 rounded-md border border-yellow-500/10 shadow-sm max-w-sm mx-auto mt-1">
          <h3 className="text-xs font-normal text-aviso mb-0">Ventas Gravadas con IVA</h3>
          <p className="text-sm text-foreground font-normal">
            {pesos(data.ventas.total_iva_gravado)}
          </p>
          <p className="text-xs text-muted-foreground mt-0">(IVA total causado en el período)</p>
        </div>
      </section>

      {/* SECCIÓN DINERO RECIBIDO */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-primario mb-3 text-center flex items-center justify-center gap-2">
          <DollarSign size={20} /> Dinero Recibido
        </h2>

        <div className="text-center bg-gradient-to-r from-exito-suave to-exito-suave p-4 rounded-xl border border-green-500/40 shadow-xl max-w-md mx-auto mb-3 animate-glow">
          <h3 className="text-lg font-semibold text-exito mb-1">TOTAL RECIBIDO EN CORTE</h3>
          <p className="text-3xl font-extrabold text-exito glow-text">
            {pesos(totalRecibido)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">(Efectivo + Tarjeta + Otros)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col justify-center items-center min-h-[150px] space-y-3 bg-card rounded-lg border border-border p-4">
            <div className="border-b border-border pb-2 w-full text-center">
              <p className="text-muted-foreground text-sm mb-0.5">Total de Contado</p>
              <p className="text-lg font-bold text-exito">{pesos(totalContado)}</p>
            </div>
            <div className="border-b border-border pb-2 w-full text-center">
              <p className="text-muted-foreground text-sm mb-0.5">Total Anticipos</p>
              <p className="text-lg font-bold text-primario">{pesos(totalAnticipos)}</p>
            </div>
            <div className="border-b border-border pb-2 w-full text-center">
              <p className="text-muted-foreground text-sm mb-0.5">Total Abonos</p>
              <p className="text-lg font-bold text-violet-700">{pesos(totalAbonos)}</p>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center min-h-[150px] space-y-3 bg-card rounded-lg border border-border p-4">
            <div className="border-b border-border pb-2 w-full text-center">
              <p className="text-muted-foreground text-sm mb-0.5">Formas de Pago</p>
            </div>
            <div className="w-full">
              <table className="w-full text-left text-muted-foreground">
                <tbody>
                  {Object.entries(pagosConTarjeta).map(([method, amount]) => (
                    <tr key={method} className="border-b border-border last:border-b-0">
                      <td className="py-2 px-3 capitalize font-medium text-center">{method}</td>
                      <td className="py-2 px-3 text-right font-bold text-exito">
                        {pesos(Number(amount))}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(pagosConTarjeta).length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-3 text-center text-muted-foreground">
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
      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
        <button
          onClick={handleConfirmarCorte}
          disabled={confirming || loading}
          className={`px-6 py-3 bg-exito text-white font-bold text-base rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 shadow-suave ${
            confirming || loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <CheckCircle size={20} />
          {confirming ? 'Confirmando...' : 'Confirmar Corte X'}
        </button>

        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-primario text-white font-bold text-base rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 shadow-suave"
        >
          <Printer size={20} /> Imprimir Corte (Térmica)
        </button>
      </div>
      </div>
    </div>
  );
}