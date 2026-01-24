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
import { ArrowUpDown, DollarSign, CreditCard, Package, FileSpreadsheet, FileText, File, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function CustomerStatement() {
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState("")
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)

  const [filtro, setFiltro] = useState("")
  const [filtroType, setFiltroType] = useState("all")
  const [filtroStatus, setFiltroStatus] = useState("all")
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("")
  const [filtroFechaFin, setFiltroFechaFin] = useState("")

  const [selectedSale, setSelectedSale] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Resumen
  const [saldoPendienteTotal, setSaldoPendienteTotal] = useState(0)
  const [totalPagado, setTotalPagado] = useState(0)
  const [totalAdeudado, setTotalAdeudado] = useState(0)

  // Cargar lista de clientes al montar
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoadingCustomers(true)
        const res = await fetch(`${API_URL}/customers`)
        if (!res.ok) throw new Error("Error al cargar clientes")
        const data = await res.json()
        setCustomers(data)
      } catch (err) {
        toast.error("No se pudieron cargar los clientes")
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  // Cargar estado de cuenta cuando se selecciona un cliente
  useEffect(() => {
    if (!selectedCustomerId) {
      setVentas([])
      setSaldoPendienteTotal(0)
      setTotalPagado(0)
      setTotalAdeudado(0)
      return
    }

    const fetchStatement = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_URL}/customers/${selectedCustomerId}/statement`)
        if (!res.ok) throw new Error("Error al cargar estado de cuenta")
        const data = await res.json()
        setVentas(data)
      } catch (err) {
        toast.error("Error al cargar el estado de cuenta del cliente")
        setVentas([])
      } finally {
        setLoading(false)
      }
    }

    fetchStatement()
  }, [selectedCustomerId])

  // Calcular totales cuando cambian las ventas o filtros
  useEffect(() => {
    if (ventas.length === 0) return

    const filtradas = ventasFiltradas

    let adeudado = 0
    let pagado = 0

    filtradas.forEach(v => {
      if (v.type !== "contado") {
        adeudado += Number(v.total || 0)
      }
      pagado += Number(v.paid || 0)
    })

    setTotalAdeudado(adeudado)
    setTotalPagado(pagado)
    setSaldoPendienteTotal(adeudado - pagado)
  }, [ventas, filtro, filtroType, filtroStatus, filtroFechaInicio, filtroFechaFin])

  const ventasFiltradas = ventas
    .filter(v => {
      const term = filtro.toLowerCase()
      return (
        (v.id.toString().includes(term) ||
         (v.movement_reason || "").toLowerCase().includes(term)) &&
        (filtroType !== "all" ? v.type === filtroType : true) &&
        (filtroStatus !== "all" ? v.status === filtroStatus : true) &&
        (!filtroFechaInicio || v.date >= filtroFechaInicio) &&
        (!filtroFechaFin || v.date <= filtroFechaFin)
      )
    })
    .sort((a, b) => new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time))

  const handleVerDetalle = (venta) => {
    setSelectedSale(venta)
    setShowDetailModal(true)
  }

  // Seleccionar cliente desde el Select
  const handleCustomerSelect = (value) => {
    const selected = customers.find(c => c.id.toString() === value)
    if (selected) {
      setSelectedCustomerId(selected.id)
      setSelectedCustomerName(`${selected.first_name} ${selected.last_name_paternal || ''} ${selected.last_name_maternal || ''}`)
    }
  }

  if (loadingCustomers) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-muted-foreground animate-pulse">Cargando clientes...</p>
      </div>
    )
  }

  return (
    <Card className="border-none shadow-xl rounded-xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 pb-4">
        <CardTitle className="text-2xl font-bold text-indigo-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-indigo-600" />
            Estado de Cuenta del Cliente
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        {/* SELECCIÓN DE CLIENTE */}
        <div className="mb-8 bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-600" />
            Seleccionar Cliente
          </h3>

          <Select 
            value={selectedCustomerId?.toString() || ""} 
            onValueChange={handleCustomerSelect}
          >
            <SelectTrigger className="w-full max-w-xl">
              <SelectValue placeholder="Selecciona un cliente..." />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {customers.map(c => (
                <SelectItem 
                  key={c.id} 
                  value={c.id.toString()}
                >
                  {c.first_name} {c.last_name_paternal || ''} {c.last_name_maternal || ''} 
                  <span className="text-muted-foreground ml-2">({c.phone || 'Sin teléfono'})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCustomerId && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-100">
              <p className="font-medium text-indigo-800">
                Cliente seleccionado: <span className="text-indigo-600">{selectedCustomerName}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ID: {selectedCustomerId}
              </p>
            </div>
          )}
        </div>

        {/* RESUMEN */}
        {selectedCustomerId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border border-red-100 shadow-sm">
              <p className="text-sm text-red-700 font-medium">Saldo Pendiente</p>
              <p className="text-3xl font-bold text-red-800 mt-2">${saldoPendienteTotal.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100 shadow-sm">
              <p className="text-sm text-green-700 font-medium">Total Pagado</p>
              <p className="text-3xl font-bold text-green-800 mt-2">${totalPagado.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
              <p className="text-sm text-blue-700 font-medium">Total Adeudado</p>
              <p className="text-3xl font-bold text-blue-800 mt-2">${totalAdeudado.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* FILTROS Y TABLA */}
        {selectedCustomerId ? (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border">
              <Input 
                placeholder="Buscar por folio o razón..." 
                value={filtro} 
                onChange={e => setFiltro(e.target.value)} 
                className="max-w-sm" 
              />
              <Select value={filtroType} onValueChange={setFiltroType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="contado">Contado</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="apartado">Apartado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)} />
              <Input type="date" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)} />
            </div>

            <div className="rounded-xl border overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Fecha / Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Razón</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10">
                        Cargando estado de cuenta...
                      </TableCell>
                    </TableRow>
                  ) : ventasFiltradas.length > 0 ? (
                    ventasFiltradas.map(v => (
                      <TableRow key={v.id} className="hover:bg-indigo-50/50">
                        <TableCell className="font-medium">{v.id}</TableCell>
                        <TableCell>{v.date} {v.time}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{v.type}</Badge>
                        </TableCell>
                        <TableCell>{v.movement_reason || "—"}</TableCell>
                        <TableCell className="text-right font-medium">${Number(v.total || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${Number(v.paid || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">${Number(v.pending_balance || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={v.status === "completed" ? "default" : "secondary"}>
                            {v.status === "completed" ? "✅ Completada" : "⏳ Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleVerDetalle(v)}>
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        No hay movimientos para este cliente con los filtros aplicados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-lg">
            Selecciona un cliente para ver su estado de cuenta
          </div>
        )}

        {/* Modal de detalle */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalle de Venta #{selectedSale?.id}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p><strong>Tipo:</strong> {selectedSale?.type}</p>
              <p><strong>Total:</strong> ${Number(selectedSale?.total || 0).toFixed(2)}</p>
              <p><strong>Pagado:</strong> ${Number(selectedSale?.paid || 0).toFixed(2)}</p>
              <p><strong>Pendiente:</strong> ${Number(selectedSale?.pending_balance || 0).toFixed(2)}</p>
              {/* Aquí puedes agregar más detalles como productos y pagos */}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}