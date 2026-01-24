"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Printer, DollarSign, CreditCard, Package, FileSpreadsheet, FileText, File } from "lucide-react"
// Importaciones necesarias (solo estas, NO DialogFooter)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function ListaVentas() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [orden, setOrden] = useState({ campo: "id", direccion: "desc" })
  const [filtroType, setFiltroType] = useState("all")
  const [filtroStatus, setFiltroStatus] = useState("all")

  const [ventaPagos, setVentaPagos] = useState(null)         // Modal pagos (click en Total)
  const [ventaDetalle, setVentaDetalle] = useState(null)     // Modal detalle completo (click en Tipo)
  const [pagosDesglose, setPagosDesglose] = useState([])
  const [detallesVenta, setDetallesVenta] = useState([])
  
  // Estados para el modal de previsualización
const [showPrintModal, setShowPrintModal] = useState(false);
const [ticketText, setTicketText] = useState('');
const [selectedSaleId, setSelectedSaleId] = useState(null);

// Handler actualizado: abre modal con previsualización
const handleReimprimirTicket = async (venta) => {
  try {
    const res = await fetch(`${API_URL}/tickets/${venta.id}/text`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al obtener ticket');
    }
    
    
   const data = await res.json();


    console.log('Ticket data:', data); // ← Depuración
    setTicketText(data.ticketText);
    setSelectedSaleId(venta.id);
    setShowPrintModal(true);
  } catch (err) {
    console.error('Error cargando ticket:', err);
    toast.error('No se pudo cargar el ticket para previsualizar');
  }
};

// Imprimir desde el modal
const handleConfirmPrint = async () => {
  try {
    const res = await fetch(`${API_URL}/tickets/${selectedSaleId}/print`);
    if (!res.ok) throw new Error('Error al imprimir');

    toast.success(`Ticket #${selectedSaleId} impreso exitosamente 🖨️`);
    setShowPrintModal(false);
  } catch (err) {
    console.error('Error imprimiendo:', err);
    toast.error('No se pudo imprimir. Verifica la impresora.');
  }
};


  
  
  


  useEffect(() => {
    fetchVentas()
  }, [])

  const fetchVentas = async () => {
    try {
      const res = await fetch(`${API_URL}/sales`)
      if (!res.ok) throw new Error("Error al cargar ventas")
      const data = await res.json()
      setVentas(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerPagos = async (venta) => {
    try {
      const res = await fetch(`${API_URL}/sales/${venta.id}`)
      if (!res.ok) throw new Error("Error al cargar pagos")
      const data = await res.json()
      setVentaPagos(venta)
      setPagosDesglose(data.payments || [])
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleVerDetalle = async (venta) => {
    try {
      const res = await fetch(`${API_URL}/sales/${venta.id}`)
      if (!res.ok) throw new Error("Error al cargar detalles")
      const data = await res.json()
      setVentaDetalle(venta)
      setDetallesVenta(data.details || [])
      setPagosDesglose(data.payments || [])
    } catch (err) {
      toast.error(err.message)
    }
  }
  

  // ===================================================================
  // EXPORTACIONES - 100% lazy y client-side
  // ===================================================================
  const exportToExcel = async () => {
    if (typeof window === "undefined") return

    try {
      // ✅ IMPORT CORRECTO
      const XLSX = await import("xlsx")

      const data = ventasFiltradas.map(v => ({
        ID: v.id,
        Fecha: v.date,
        Hora: v.time,
        Tipo: v.type,
        Razón: v.movement_reason || "",
        Subtotal: v.subtotal,
        IVA: v.tax_total,
        Total: v.total,
        Pendiente: v.pending_balance,
        Pagado: v.paid,
        Status: v.status,
        Cajero: v.nickname_user
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Ventas")

      XLSX.writeFile(
        wb,
        `ventas_${new Date().toISOString().split("T")[0]}.xlsx`
      )

      toast.success("Exportado a Excel ✅")
    } catch (err) {
      console.error("Error en Excel:", err)
      toast.error("No se pudo generar el Excel")
    }
  }

  const exportToPDF = async () => {
    if (typeof window === "undefined") return

    try {
      // ✅ Import correcto de jsPDF
      const jsPDFModule = await import("jspdf")
      const jsPDF = jsPDFModule.jsPDF

      // ✅ Import EXPLÍCITO del plugin
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF()

      doc.setFontSize(14)
      doc.text("Listado de Ventas", 14, 15)

      const tableData = ventasFiltradas.map(v => ([
        v.id,
        v.date,
        v.type,
        v.total.toFixed(2),
        v.paid.toFixed(2),
        v.pending_balance.toFixed(2),
        v.status
      ]))

      // 🔥 AQUÍ SE REGISTRA BIEN
      autoTable(doc, {
        startY: 20,
        head: [[
          "ID",
          "Fecha",
          "Tipo",
          "Total",
          "Pagado",
          "Pendiente",
          "Estado"
        ]],
        body: tableData,
        styles: { fontSize: 8 },
      })

      doc.save(`ventas_${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (err) {
      console.error("Error generando PDF:", err)
      toast.error("No se pudo generar el PDF")
    }
  }


  const exportToXML = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ventas>\n'
    ventasFiltradas.forEach(v => {
      xml += `  <venta id="${v.id}">\n`
      xml += `    <fecha>${v.date}</fecha>\n`
      xml += `    <hora>${v.time}</hora>\n`
      xml += `    <tipo>${v.type}</tipo>\n`
      xml += `    <razon>${v.movement_reason || ""}</razon>\n`
      xml += `    <total>${v.total.toFixed(2)}</total>\n`
      xml += `    <pagado>${v.paid.toFixed(2)}</pagado>\n`
      xml += `    <pendiente>${v.pending_balance.toFixed(2)}</pendiente>\n`
      xml += `    <status>${v.status}</status>\n`
      xml += `    <cajero>${v.nickname_user}</cajero>\n`
      xml += `  </venta>\n`
    })
    xml += '</ventas>'

    const blob = new Blob([xml], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ventas_${new Date().toISOString().split('T')[0]}.xml`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Exportado a XML ✅")
  }

  const ventasFiltradas = ventas
    .filter(v => {
      const term = filtro.toLowerCase()
      return (
        (v.id.toString().includes(term) ||
         (v.nickname_user || "").toLowerCase().includes(term) ||
         (v.movement_reason || "").toLowerCase().includes(term)) &&
        (filtroType !== "all" ? v.type === filtroType : true) &&
        (filtroStatus !== "all" ? v.status === filtroStatus : true)
      )
    })
    .sort((a, b) => {
      const aValue = a[orden.campo] ?? ""
      const bValue = b[orden.campo] ?? ""
      return orden.direccion === "asc"
        ? aValue > bValue ? 1 : -1
        : aValue < bValue ? 1 : -1
    })

  const handleOrdenar = (campo) => {
    setOrden({
      campo,
      direccion: orden.campo === campo && orden.direccion === "asc" ? "desc" : "asc"
    })
  }

 


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-muted-foreground animate-pulse">Cargando ventas... 📊</p>
      </div>
    )
  }

  return (
    <Card className="border-none shadow-xl rounded-xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-4">
        <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" /> Listado de Ventas
          </div>
          {/* Botones de exportación */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-1">
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToXML} className="gap-1">
              <File className="h-4 w-4" /> XML
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border border-slate-200">
          <Input
            placeholder="🔍 Filtrar por ID, cajero o razón..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="max-w-sm bg-white shadow-sm"
          />
          <Select value={filtroType} onValueChange={setFiltroType}>
            <SelectTrigger className="w-[180px] bg-white shadow-sm">
              <SelectValue placeholder="Tipo de venta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="contado">Contado 💵</SelectItem>
              <SelectItem value="credito">Crédito 💳</SelectItem>
              <SelectItem value="apartado">Apartado 📦</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[180px] bg-white shadow-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente ⏳</SelectItem>
              <SelectItem value="completed">Completada ✅</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
              <TableRow>
                <TableHead onClick={() => handleOrdenar("id")} className="cursor-pointer font-semibold">
                  ID <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("date")} className="cursor-pointer font-semibold">
                  Fecha <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("time")} className="cursor-pointer font-semibold">
                  Hora <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("type")} className="cursor-pointer font-semibold">
                  Tipo <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("movement_reason")} className="cursor-pointer font-semibold">
                  Razón <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("subtotal")} className="cursor-pointer font-semibold text-right">
                  Subtotal <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("tax_total")} className="cursor-pointer font-semibold text-right">
                  IVA <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead className="cursor-pointer font-semibold text-right">
                  Total 🛒 <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("pending_balance")} className="cursor-pointer font-semibold text-right">
                  Pendiente <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("paid")} className="cursor-pointer font-semibold text-right">
                  Pagado 💰 <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("status")} className="cursor-pointer font-semibold">
                  Status <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("efectivo_recibido")} className="cursor-pointer font-semibold text-right">
                  Efectivo 💵 <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("cambio")} className="cursor-pointer font-semibold text-right">
                  Cambio 🔙 <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead onClick={() => handleOrdenar("nickname_user")} className="cursor-pointer font-semibold">
                  Cajero 👤 <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                </TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventasFiltradas.map((v) => (
                <TableRow 
                  key={v.id}
                  className="hover:bg-emerald-100/70 transition-colors even:bg-slate-50/70"
                >
                  <TableCell className="font-medium">{v.id}</TableCell>
                  <TableCell>{v.date}</TableCell>
                  <TableCell>{v.time}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => handleVerDetalle(v)}>
                    <Badge variant="outline" className="rounded-full px-4 py-1.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">
                      {v.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{v.movement_reason}</TableCell>
                  <TableCell className="text-right">${v.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${v.tax_total.toFixed(2)}</TableCell>
                  <TableCell className="text-right cursor-pointer" onClick={() => handleVerPagos(v)}>
                    <Badge variant="outline" className="rounded-full px-4 py-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors font-medium">
                      ${v.total.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${v.pending_balance.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${v.paid.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === "completed" ? "default" : "secondary"} className={v.status === "completed" ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}>
                      {v.status === "completed" ? "✅ Completada" : "⏳ Pendiente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${v.efectivo_recibido.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium text-slate-700">${v.cambio.toFixed(2)}</TableCell>
                  <TableCell>{v.nickname_user}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleReimprimirTicket(v, e); }}>
                      <Printer className="h-4 w-4 text-gray-600 hover:text-emerald-600 transition-colors" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {ventasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-10 text-muted-foreground text-lg">
                    No se encontraron ventas con los filtros aplicados 😔
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal pagos */}
        <Dialog open={!!ventaDetalle} onOpenChange={() => setVentaDetalle(null)}>
          <DialogContent className="custom-dialog-content rounded-2xl bg-white shadow-2xl border border-emerald-100 max-w-5xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Package className="h-6 w-6 text-emerald-600" />
                Detalle Completo - Venta #{ventaDetalle?.id}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-6 space-y-8">
              {/* Info general */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 p-6 rounded-xl border border-emerald-100">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha y Hora</p>
                  <p className="font-semibold">{ventaDetalle?.date} {ventaDetalle?.time}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo / Razón</p>
                  <p className="font-semibold">{ventaDetalle?.type} - {ventaDetalle?.movement_reason}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cajero</p>
                  <p className="font-semibold">{ventaDetalle?.nickname_user}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={ventaDetalle?.status === "completed" ? "default" : "secondary"} className={ventaDetalle?.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {ventaDetalle?.status === "completed" ? "✅ Completada" : "⏳ Pendiente"}
                  </Badge>
                </div>
              </div>

              {/* Productos vendidos - CON FILA SUPERIOR AGRUPADA */}
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" /> Productos Vendidos
                </h3>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/60">
                    {/* Fila superior: labels agrupados y centrados */}
                    <TableRow>
                      {/* ARTÍCULO centrado entre Producto ID y Artículo */}
                      <TableHead 
                        colSpan={2} 
                        className="text-center font-semibold text-black bg-gray-100 border-b border-gray-300"
                      >
                        ARTÍCULO
                      </TableHead>

                      {/* Celda vacía arriba de Cantidad y Precio unitario */}
                      <TableHead 
                        colSpan={2} 
                        className="text-center text-black bg-gray-100 border-b border-gray-300"
                      >
                        {/* Vacío */}
                      </TableHead>

                      {/* DESCUENTO en azul */}
                      <TableHead 
                        colSpan={2} 
                        className="text-center font-semibold text-blue-700 bg-blue-50/50 border-b border-blue-200"
                      >
                        DESCUENTO
                      </TableHead>

                      {/* TOTALES en negro */}
                      <TableHead 
                        colSpan={3} 
                        className="text-center font-semibold text-black bg-gray-100 border-b border-gray-300"
                      >
                        TOTALES
                      </TableHead>
                    </TableRow>

                    {/* Fila principal de headers */}
                    <TableRow>
                      <TableHead>Producto ID</TableHead>
                      <TableHead>Artículo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio unitario</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-center">Monto</TableHead>
                      <TableHead>Subtotal (sin IVA)</TableHead>
                      <TableHead>IVA 16%</TableHead>
                      <TableHead className="text-right">Total línea</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {detallesVenta.map((d) => {
                      const precioOriginal = d.base_price || d.price;
                      const subtotalSinIVA = d.subtotal || (d.quantity * precioOriginal);
                      const ivaMonto = d.tax_amount || 0;
                      const totalLinea = subtotalSinIVA + ivaMonto;

                      return (
                        <TableRow key={d.id} className="hover:bg-muted/40">
                          <TableCell className="font-medium">{d.product_id}</TableCell>
                          <TableCell className="font-medium">
                            {d.articulo || `Producto #${d.product_id}`}
                          </TableCell>
                          <TableCell>{d.quantity}</TableCell>
                          <TableCell>${precioOriginal.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            {d.discount_pct ? `${d.discount_pct}%` : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            ${(d.discount_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>${subtotalSinIVA.toFixed(2)}</TableCell>
                          <TableCell>${ivaMonto.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700">
                            ${totalLinea.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {detallesVenta.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No hay productos en esta venta
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              </div>

              {/* Desglose de Pagos (sin cambios) */}
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-600" /> Desglose de Pagos
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/60">
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Últimos 4</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagosDesglose.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/40">
                          <TableCell>
                            <Badge variant={p.method === "efectivo" ? "default" : "secondary"}>
                              {p.method === "efectivo" ? "💵 Efectivo" : "💳 Tarjeta"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">${p.amount.toFixed(2)}</TableCell>
                          <TableCell>{p.bank || "—"}</TableCell>
                          <TableCell>{p.last4 || "—"}</TableCell>
                          <TableCell>{p.reference || "—"}</TableCell>
                          <TableCell>{p.date}</TableCell>
                        </TableRow>
                      ))}
                      {pagosDesglose.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No hay pagos registrados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal detalle completo */}

        <Dialog open={!!ventaDetalle} onOpenChange={() => setVentaDetalle(null)}>
          <DialogContent className="custom-dialog-content rounded-2xl bg-white shadow-2xl border border-emerald-100 max-w-5xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Package className="h-6 w-6 text-emerald-600" />
                Detalle Completo - Venta #{ventaDetalle?.id}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-6 space-y-8">
              {/* Info general */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 p-6 rounded-xl border border-emerald-100">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha y Hora</p>
                  <p className="font-semibold">{ventaDetalle?.date} {ventaDetalle?.time}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo / Razón</p>
                  <p className="font-semibold">{ventaDetalle?.type} - {ventaDetalle?.movement_reason}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cajero</p>
                  <p className="font-semibold">{ventaDetalle?.nickname_user}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={ventaDetalle?.status === "completed" ? "default" : "secondary"} className={ventaDetalle?.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {ventaDetalle?.status === "completed" ? "✅ Completada" : "⏳ Pendiente"}
                  </Badge>
                </div>
              </div>

              {/* Productos vendidos - CON FILA SUPERIOR AGRUPADA Y CENTRADA */}
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" /> Productos Vendidos
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/60">
                      {/* Fila superior: labels agrupados y centrados */}
                      <TableRow>
                        {/* ARTÍCULO centrado entre Producto ID y Artículo */}
                        <TableHead 
                          colSpan={2} 
                          className="text-center font-semibold text-black bg-gray-100 border-b border-gray-300"
                        >
                          ARTÍCULO
                        </TableHead>

                        {/* Celda vacía arriba de Cantidad y Precio unitario */}
                        <TableHead 
                          colSpan={2} 
                          className="text-center text-black bg-gray-100 border-b border-gray-300"
                        >
                          {/* Vacío */}
                        </TableHead>

                        {/* DESCUENTO en azul */}
                        <TableHead 
                          colSpan={2} 
                          className="text-center font-semibold text-blue-700 bg-blue-50/50 border-b border-blue-200"
                        >
                          DESCUENTO
                        </TableHead>

                        {/* TOTALES en negro */}
                        <TableHead 
                          colSpan={3} 
                          className="text-center font-semibold text-black bg-gray-100 border-b border-gray-300"
                        >
                          TOTALES
                        </TableHead>
                      </TableRow>

                      {/* Fila principal de headers */}
                      <TableRow>
                        <TableHead>Producto ID</TableHead>
                        <TableHead>Artículo</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio unitario</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">Monto</TableHead>
                        <TableHead>Subtotal (sin IVA)</TableHead>
                        <TableHead>IVA 16%</TableHead>
                        <TableHead className="text-right">Total línea</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {detallesVenta.map((d) => {
                        const precioOriginal = d.base_price || d.price;
                        const subtotalSinIVA = d.subtotal || (d.quantity * precioOriginal);
                        const ivaMonto = d.tax_amount || 0;
                        const totalLinea = subtotalSinIVA + ivaMonto;

                        return (
                          <TableRow key={d.id} className="hover:bg-muted/40">
                            <TableCell className="font-medium">{d.product_id}</TableCell>
                            <TableCell className="font-medium">
                              {d.articulo || `Producto #${d.product_id}`}
                            </TableCell>
                            <TableCell>{d.quantity}</TableCell>
                            <TableCell>${precioOriginal.toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                              {d.discount_pct ? `${d.discount_pct}%` : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              ${(d.discount_amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>${subtotalSinIVA.toFixed(2)}</TableCell>
                            <TableCell>${ivaMonto.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-700">
                              ${totalLinea.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {detallesVenta.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No hay productos en esta venta
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Desglose de Pagos (sin cambios) */}
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-600" /> Desglose de Pagos
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/60">
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Últimos 4</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagosDesglose.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/40">
                          <TableCell>
                            <Badge variant={p.method === "efectivo" ? "default" : "secondary"}>
                              {p.method === "efectivo" ? "💵 Efectivo" : "💳 Tarjeta"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">${p.amount.toFixed(2)}</TableCell>
                          <TableCell>{p.bank || "—"}</TableCell>
                          <TableCell>{p.last4 || "—"}</TableCell>
                          <TableCell>{p.reference || "—"}</TableCell>
                          <TableCell>{p.date}</TableCell>
                        </TableRow>
                      ))}
                      {pagosDesglose.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No hay pagos registrados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>

      {/* MODAL PREVISUALIZACIÓN TICKET */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Previsualización de Ticket #{selectedSaleId}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 bg-white border rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[70vh] overflow-auto">
            {ticketText || "Sin contenido"}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPrintModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmPrint}>
              Imprimir Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </Card>
  )
}