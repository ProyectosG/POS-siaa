"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

import PagoMixto from "@/components/PagoMixto/PagoMixto"

const API = process.env.NEXT_PUBLIC_API_URL

export default function AbonosApartados() {
  const [ticketId, setTicketId] = useState("")
  const [venta, setVenta] = useState(null)
  const [detalle, setDetalle] = useState([])

  const [liquidar, setLiquidar] = useState(false)
  const [montoAbono, setMontoAbono] = useState("")

  /* =====================================================
     BUSCAR TICKET
  ===================================================== */
  const buscarTicket = async () => {
    setVenta(null)
    setDetalle([])
    setMontoAbono("")
    setLiquidar(false)

    try {
      const res = await fetch(`${API}/sales/${ticketId}`)
      if (!res.ok) throw new Error("Ticket no encontrado")

      const data = await res.json()

      if (data.type !== "apartado") {
        throw new Error("Este ticket no es un apartado")
      }

      setVenta(data)
      setDetalle(data.details || [])
    } catch (err) {
      toast.error(err.message)
    }
  }

  /* =====================================================
     LIQUIDAR → COLOCA SALDO EN NUEVO ABONO
  ===================================================== */
  useEffect(() => {
    if (liquidar && venta) {
      setMontoAbono(venta.pending_balance.toFixed(2))
    }
    if (!liquidar) {
      setMontoAbono("")
    }
  }, [liquidar, venta])

  return (
    <div className="mt-[60px] space-y-10">

      {/* =====================================================
         FILA SUPERIOR – KPIs
      ===================================================== */}
      <div className="flex justify-center">
        <div className="flex flex-wrap gap-4 items-stretch">

          {/* TICKET */}
          <Card className="shadow-md">
            <CardContent className="p-5 flex flex-col items-center gap-3">
              <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground font-semibold">
                Ticket Apartado
              </span>

              <Input
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarTicket()}
                autoFocus
                inputMode="numeric"
                placeholder="—"
                className="
                  w-[170px]
                  h-[88px]
                  text-center
                  text-[48px]
                  leading-none
                  font-mono
                  tracking-widest
                  px-0
                "
              />

              {venta && (
                <Badge className="bg-blue-100 text-blue-700">
                  APARTADO
                </Badge>
              )}
            </CardContent>
          </Card>

          {venta && (
            <>
              {/* Tarjetas de Totales */}
              <Card className="w-[180px] shadow-sm flex flex-col justify-center items-center min-h-[120px]">
                <CardContent className="p-4 text-center flex flex-col justify-center h-full">
                  <p className="text-sm text-muted-foreground mb-2">Total venta</p>
                  <p className="text-3xl font-bold">
                    ${venta.total.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="w-[180px] shadow-sm flex flex-col justify-center items-center min-h-[120px]">
                <CardContent className="p-4 text-center flex flex-col justify-center h-full">
                  <p className="text-sm text-muted-foreground mb-2">Total abonado</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${venta.paid.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="w-[180px] shadow-sm border border-red-200 flex flex-col justify-center items-center min-h-[120px]">
                <CardContent className="p-4 text-center flex flex-col justify-center h-full">
                  <p className="text-sm text-muted-foreground mb-2">Saldo pendiente</p>
                  <p className="text-3xl font-bold text-red-600">
                    ${venta.pending_balance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </div>

      {/* =====================================================
         FILA INFERIOR
      ===================================================== */}
      {venta && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">

          {/* ===================== PREVIEW DEL TICKET */}
          <Card className="shadow-lg">
            <CardContent className="p-6 space-y-6">

              {/* ENCABEZADO */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">
                    🧾 Ticket Apartado #{venta.id}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(venta.created_at).toLocaleDateString("es-MX")} •{" "}
                    {new Date(venta.created_at).toLocaleTimeString("es-MX")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cajero: {venta.user?.name || "admin"}
                  </p>
                </div>

                <Badge className="bg-blue-100 text-blue-700">
                  APARTADO
                </Badge>
              </div>

              {/* CLIENTE */}
                <div className="bg-muted/40 rounded-lg p-4">
                  <p className="font-semibold">
                    Cliente: {venta.client ? 
                      `${venta.client.first_name} ${venta.client.last_name_paternal} ${venta.client.last_name_maternal || ''}`.trim() 
                      : "PÚBLICO GENERAL"}
                  </p>
                  {venta.client?.phone && (
                    <p className="text-sm text-muted-foreground">
                      Tel: {venta.client.phone}
                    </p>
                  )}
                </div>

              {/* DETALLE */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-xs font-semibold text-muted-foreground border-b pb-2">
                  <span className="col-span-2 text-center">Cant</span>
                  <span className="col-span-7">Artículo</span>
                  <span className="col-span-3 text-right">Importe</span>
                </div>

                {detalle.map((d) => (
                  <div key={d.id} className="grid grid-cols-12 text-sm py-1">
                    <span className="col-span-2 text-center">{d.quantity}</span>
                    <span className="col-span-7 truncate">
                      {d.articulo || `Producto #${d.product_id}`}
                    </span>
                    <span className="col-span-3 text-right font-medium">
                      ${d.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* ===================== RESUMEN FINANCIERO */}
              <div className="border-t pt-6 space-y-3 text-base">

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${(venta.total / 1.16).toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA 16%</span>
                  <span>${(venta.total - venta.total / 1.16).toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-3">
                  <span>Total</span>
                  <span>${venta.total.toFixed(2)}</span>
                </div>

                {/* PAGADO Y PENDIENTE */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span className="flex items-center gap-2 text-emerald-600">
                      <span className="text-xl">●</span> Pagado
                    </span>
                    <span className="text-emerald-600">
                      ${venta.paid.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span className="flex items-center gap-2 text-red-600">
                      <span className="text-xl">●</span> Pendiente
                    </span>
                    <span className="text-red-600">
                      ${venta.pending_balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* ===================== NUEVO ABONO */}
          <Card className="shadow-xl">
            <CardContent className="p-8 space-y-6">

              <h2 className="text-2xl font-bold text-center">
                💳 NUEVO ABONO
              </h2>

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">
                  Liquidar saldo pendiente
                </span>
                <Switch
                  checked={liquidar}
                  onCheckedChange={setLiquidar}
                />
              </div>

        <PagoMixto
            monto={montoAbono}
            onChangeMonto={setMontoAbono}
            liquidar={liquidar}
            pendingBalance={venta?.pending_balance}
            ticketId={ticketId}                 // ← Agrega esto
            venta={venta}                       // ← Agrega esto (para customer_id y otros datos)
            onAbonoRegistrado={() => {
              toast.success("Abono registrado correctamente")
              buscarTicket() // ← Recarga la venta actualizada
            }}
          />

            </CardContent>
          </Card>

        </div>
      )}
    </div>
  )
}