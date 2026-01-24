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
import { DollarSign, CreditCard, FileSpreadsheet, FileText, File, Search, Filter, User, Phone, Mail, MapPin, Package } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function CustomerStatement() {
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null) // Objeto completo del cliente
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
  const [totalVendido, setTotalVendido] = useState(0)

  // Cargar clientes
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

  // Cargar estado de cuenta + datos completos del cliente
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomer(null)
      setVentas([])
      setSaldoPendienteTotal(0)
      setTotalPagado(0)
      setTotalVendido(0)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        // 1. Datos del cliente
        const customerRes = await fetch(`${API_URL}/customers/${selectedCustomerId}`)
        if (!customerRes.ok) throw new Error("Error al cargar datos del cliente")
        const customerData = await customerRes.json()
        setSelectedCustomer(customerData)

        // 2. Estado de cuenta (ventas)
        const statementRes = await fetch(`${API_URL}/customers/${selectedCustomerId}/statement`)
        if (!statementRes.ok) throw new Error("Error al cargar estado de cuenta")
        const statementData = await statementRes.json()
        setVentas(statementData)
      } catch (err) {
        toast.error("Error al cargar información del cliente")
        setSelectedCustomer(null)
        setVentas([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedCustomerId])

  // Calcular totales
  useEffect(() => {
    if (ventas.length === 0) return

    const filtradas = ventasFiltradas

    let vendido = 0
    let pagado = 0

    filtradas.forEach(v => {
      vendido += Number(v.total || 0)
      pagado += Number(v.paid || 0)
    })

    setTotalVendido(vendido)
    setTotalPagado(pagado)
    setSaldoPendienteTotal(vendido - pagado)
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

  const handleCustomerSelect = (value) => {
    const selected = customers.find(c => c.id.toString() === value)
    if (selected) {
      setSelectedCustomerId(selected.id)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <DollarSign className="h-7 w-7 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estado de Cuenta del Cliente</h1>
            <p className="text-sm text-gray-500">Seguimiento completo de ventas, pagos y saldos pendientes</p>
          </div>
        </div>
      </div>

      {/* Selección de cliente */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-600" />
                Seleccionar Cliente
              </label>
              <Select 
                value={selectedCustomerId?.toString() || ""} 
                onValueChange={handleCustomerSelect}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Busca y selecciona un cliente..." />
                </SelectTrigger>
                <SelectContent className="max-h-[420px]">
                  {customers.map(c => (
                    <SelectItem 
                      key={c.id} 
                      value={c.id.toString()}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {c.first_name} {c.last_name_paternal || ''} {c.last_name_maternal || ''}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.phone ? `Tel: ${c.phone}` : 'Sin teléfono'} • ID: {c.id}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomerId && selectedCustomer && (
              <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100 min-w-[380px]">
                <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Datos del Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Nombre completo</p>
                    <Input 
                      value={`${selectedCustomer.first_name || ''} ${selectedCustomer.last_name_paternal || ''} ${selectedCustomer.last_name_maternal || ''}`.trim()}
                      disabled
                      className="mt-1 bg-white/80 border-gray-300"
                    />
                  </div>
                  <div>
                    <p className="text-gray-600">Teléfono</p>
                    <Input 
                      value={selectedCustomer.phone || '—'}
                      disabled
                      className="mt-1 bg-white/80 border-gray-300"
                    />
                  </div>
                  <div>
                    <p className="text-gray-600">Correo electrónico</p>
                    <Input 
                      value={selectedCustomer.email || '—'}
                      disabled
                      className="mt-1 bg-white/80 border-gray-300"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-600">Dirección</p>
                    <Input 
                      value={selectedCustomer.address || '—'}
                      disabled
                      className="mt-1 bg-white/80 border-gray-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contenido principal */}
      {selectedCustomerId ? (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Total Vendido */}
            <Card className="border-blue-100 bg-gradient-to-br from-blue-50/70 to-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Vendido</p>
                    <p className="text-3xl font-bold text-blue-800 mt-2">
                      ${totalVendido.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Total Pagado */}
            <Card className="border-green-100 bg-gradient-to-br from-green-50/70 to-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Total Pagado</p>
                    <p className="text-3xl font-bold text-green-800 mt-2">
                      ${totalPagado.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <CreditCard className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Saldo Pendiente */}
            <Card className="border-red-100 bg-gradient-to-br from-red-50/70 to-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Saldo Pendiente</p>
                    <p className="text-3xl font-bold text-red-800 mt-2">
                      ${saldoPendienteTotal.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <DollarSign className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Tabs defaultValue="filtros" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="filtros">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </TabsTrigger>
              <TabsTrigger value="export">
                <FileText className="h-4 w-4 mr-2" />
                Exportar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="filtros">
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                      <Input 
                        placeholder="Buscar por folio o razón..." 
                        value={filtro} 
                        onChange={e => setFiltro(e.target.value)} 
                        className="h-10"
                      />
                    </div>
                    <Select value={filtroType} onValueChange={setFiltroType}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="contado">Contado</SelectItem>
                        <SelectItem value="credito">Crédito</SelectItem>
                        <SelectItem value="apartado">Apartado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="completed">Completada</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input 
                        type="date" 
                        value={filtroFechaInicio} 
                        onChange={e => setFiltroFechaInicio(e.target.value)} 
                        className="h-10"
                      />
                      <Input 
                        type="date" 
                        value={filtroFechaFin} 
                        onChange={e => setFiltroFechaFin(e.target.value)} 
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export">
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4">
                    <Button variant="outline" className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Exportar a Excel
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Exportar a PDF
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <File className="h-4 w-4" />
                      Exportar a XML
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Tabla */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-16">Folio</TableHead>
                      <TableHead className="w-40">Fecha / Hora</TableHead>
                      <TableHead className="w-28">Tipo</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                      <TableHead className="text-right w-28">Pagado</TableHead>
                      <TableHead className="text-right w-28 font-semibold">Pendiente</TableHead>
                      <TableHead className="w-32">Estado</TableHead>
                      <TableHead className="text-center w-24">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                          Cargando estado de cuenta...
                        </TableCell>
                      </TableRow>
                    ) : ventasFiltradas.length > 0 ? (
                      ventasFiltradas.map(v => (
                        <TableRow 
                          key={v.id} 
                          className="hover:bg-indigo-50/40 transition-colors border-b last:border-0"
                        >
                          <TableCell className="font-medium">{v.id}</TableCell>
                          <TableCell className="text-sm">{v.date} <span className="text-gray-500">{v.time}</span></TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {v.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{v.movement_reason || "—"}</TableCell>
                          <TableCell className="text-right font-medium">${Number(v.total || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-green-700">${Number(v.paid || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-red-700">${Number(v.pending_balance || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={v.status === "completed" ? "default" : "secondary"}
                              className={v.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                            >
                              {v.status === "completed" ? "Completada" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                              onClick={() => handleVerDetalle(v)}
                            >
                              Ver detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16 text-gray-500">
                          No hay movimientos para este cliente con los filtros aplicados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Selecciona un cliente para comenzar
            </h3>
            <p className="text-gray-500">
              Elige un cliente de la lista superior para ver su historial completo de ventas, pagos y saldos pendientes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalle - Ahora muestra tabla de productos */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Detalle de Venta #{selectedSale?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* Información general */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-5 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium">{selectedSale?.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha / Hora</p>
                <p className="font-medium">{selectedSale?.date} {selectedSale?.time}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-medium text-green-700">${Number(selectedSale?.total || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendiente</p>
                <p className="font-bold text-red-700 text-lg">${Number(selectedSale?.pending_balance || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Tabla de productos */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                Productos Vendidos
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Artículo</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale?.details?.length > 0 ? (
                      selectedSale.details.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.quantity}</TableCell>
                          <TableCell>{d.articulo || `Producto #${d.product_id}`}</TableCell>
                          <TableCell className="text-right">${Number(d.price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${Number(d.subtotal || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                          No hay productos registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagos */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                Pagos Registrados
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale?.payments?.length > 0 ? (
                      selectedSale.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {p.method === "efectivo" ? "Efectivo" : "Tarjeta"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">${Number(p.amount || 0).toFixed(2)}</TableCell>
                          <TableCell>{p.bank || "—"}</TableCell>
                          <TableCell>{p.reference || "—"}</TableCell>
                          <TableCell>{p.date}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-gray-500">
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
    </div>
  )
}