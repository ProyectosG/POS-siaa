"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import toast from "react-hot-toast"

import { Plus, User, DollarSign, CreditCard } from "lucide-react"

import { useVentasApartado } from "./hooks/useVentasApartado"
import { useGridNavigationApartado } from "./hooks/useGridNavigationApartado"

import VentaApartadoGrid from "./VentaApartadoGrid"
import ListaArticulosPorNombreApartado from "./ListaArticulosPorNombreApartado"
import MenuPreciosApartado from "./MenuPreciosApartado"
import ResumenApartado from "./ResumenApartado"
import PagoApartado from "./PagoApartado"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCajaStore } from "@/store/useCajaStore"

const API_URL = process.env.NEXT_PUBLIC_API_URL

const beep = (ok = true) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = "square"
  osc.frequency.value = ok ? 900 : 220
  gain.gain.value = 0.05

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start()
  osc.stop(ctx.currentTime + 0.08)
}

export default function VentasApartado() {
  const caja = useCajaStore((s) => s.caja)
  const user = useAuthStore((s) => s.user)
  const inicializadoRef = React.useRef(false)

  const {
    items,
    setItems,
    mostrarDescuento,
    setMostrarDescuento,
    subtotal,
    ivaTotal,
    descuentoTotal,
    granTotal,
    agregarItem,
    actualizarItem,
    eliminarItem,
    porcentajeApartado,
    setPorcentajeApartado,
    tipoRequisito,
    setTipoRequisito,
    montoFijo,
    setMontoFijo,
    pagoInicialRequerido,
  } = useVentasApartado()

  const [formaPago, setFormaPago] = React.useState("efectivo")
  const [efectivo, setEfectivo] = React.useState(0)
  const [tarjeta, setTarjeta] = React.useState(0)
  const [bancoTarjeta, setBancoTarjeta] = React.useState("")
  const [ultimos4Tarjeta, setUltimos4Tarjeta] = React.useState("")
  const totalPagado = Number(efectivo || 0) + Number(tarjeta || 0)
  const cambio = Math.max(0, totalPagado - pagoInicialRequerido)

  const [focusArea, setFocusArea] = React.useState("grilla")
  const [focusPendiente, setFocusPendiente] = React.useState(null)

  const [resultadosNombre, setResultadosNombre] = React.useState([])
  const [mostrarLista, setMostrarLista] = React.useState(false)
  const [filaBusqueda, setFilaBusqueda] = React.useState(null)
  const [selectedIndexNombre, setSelectedIndexNombre] = React.useState(0)

  const [mostrarPrecios, setMostrarPrecios] = React.useState(false)
  const [preciosProducto, setPreciosProducto] = React.useState([])
  const [precioIndex, setPrecioIndex] = React.useState(0)
  const [filaPrecio, setFilaPrecio] = React.useState(null)

  const columnas = React.useMemo(() => {
    const base = ["cantidad", "codigoBarras", "articulo", "precio"]
    if (mostrarDescuento) base.push("descuentoPct")
    return base
  }, [mostrarDescuento])

  const { activeCell, setActiveCell, manejarTeclas } = useGridNavigationApartado({
    columnas,
    items,
    onDeleteRow: (fila) => eliminarItemSeguro(items[fila].id),
    disabled: mostrarLista || mostrarPrecios,
  })

  const [customerQuery, setCustomerQuery] = useState("")
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)

  React.useEffect(() => {
    const h = (e) => {
      if (e.key === "F11") {
        e.preventDefault()
        setFocusArea((p) => (p === "grilla" ? "pago" : "grilla"))
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  React.useEffect(() => {
    if (!focusPendiente) return
    const el = document.querySelector(
      `input[data-row="${focusPendiente.row}"][data-col="${focusPendiente.col}"]`
    )
    if (el) {
      el.focus()
      setActiveCell(focusPendiente)
      setFocusPendiente(null)
    }
  }, [items, focusPendiente, setActiveCell])

  const buscarProductoPorCodigo = async (itemId, codigo) => {
    if (!codigo) return
    try {
      const res = await fetch(`${API_URL}/products/barcode/${codigo}`)
      if (!res.ok) {
        beep(false)
        return
      }

      const p = await res.json()
      beep(true)

      const precios = [
        { tipo: "menudeo", label: "Menudeo", valor: p.precio_menudeo },
        { tipo: "mayoreo", label: "Mayoreo", valor: p.precio_mayoreo },
        { tipo: "especial", label: "Especial", valor: p.precio_especial },
        { tipo: "oferta", label: "Oferta", valor: p.precio_oferta },
      ].filter((p) => p.valor > 0)

      actualizarItem(itemId, "productId", p.id)
      actualizarItem(itemId, "codigoBarras", p.codigo_barras || "")
      actualizarItem(itemId, "articulo", p.articulo || "")
      actualizarItem(itemId, "presentacion", p.presentacion || "")
      actualizarItem(itemId, "precios", precios)
      actualizarItem(itemId, "tipoPrecio", precios[0]?.tipo || "menudeo")
      actualizarItem(itemId, "precio", precios[0]?.valor || 0)
      actualizarItem(itemId, "ivaPct", p.iva ? 16 : 0)

      agregarItem()
      setFocusPendiente({ row: items.length, col: "codigoBarras" })
    } catch (err) {
      console.error(err)
    }
  }

  const buscarProductoPorNombre = async (texto, fila) => {
    if (!texto || texto.length < 2) {
      setMostrarLista(false)
      return
    }

    const res = await fetch(
      `${API_URL}/products/search?query=${encodeURIComponent(texto)}`
    )
    if (!res.ok) return

    const data = await res.json()
    setResultadosNombre(data)
    setFilaBusqueda(fila)
    setSelectedIndexNombre(0)
    setMostrarLista(true)
  }

  const seleccionarProductoDesdeLista = (p) => {
    const item = items[filaBusqueda]
    if (!item) return

    const precios = [
      { tipo: "menudeo", label: "Menudeo", valor: p.precio_menudeo },
      { tipo: "mayoreo", label: "Mayoreo", valor: p.precio_mayoreo },
      { tipo: "especial", label: "Especial", valor: p.precio_especial },
      { tipo: "oferta", label: "Oferta", valor: p.precio_oferta },
    ].filter((p) => p.valor > 0)

    actualizarItem(item.id, "productId", p.id)
    actualizarItem(item.id, "codigoBarras", p.codigo_barras || "")
    actualizarItem(item.id, "articulo", p.articulo || "")
    actualizarItem(item.id, "presentacion", p.presentacion || "")
    actualizarItem(item.id, "precios", precios)
    actualizarItem(item.id, "tipoPrecio", precios[0]?.tipo)
    actualizarItem(item.id, "precio", precios[0]?.valor)
    actualizarItem(item.id, "ivaPct", p.iva ? 16 : 0)

    setMostrarLista(false)
    agregarItem()
    setFocusPendiente({ row: filaBusqueda + 1, col: "codigoBarras" })
  }

  const construirMenuPrecios = (precios) =>
    Array.isArray(precios) ? precios.filter((p) => p.valor > 0) : []

  // PROCESAR VENTA - Fecha corregida con replace para evitar "/"
  const handleProcesarVenta = async ({ formaPago, efectivo, tarjeta }) => {
// PROCESAR VENTA - Fecha ultra segura (reforzada)
const now = new Date();

// Fecha: YYYY-MM-DD garantizada (sin /)
let date = now.toISOString().split('T')[0]; // Siempre 2026-01-24

// Doble chequeo por si acaso
date = date.replace(/\//g, '-').replace(/[^0-9-]/g, ''); // Elimina cualquier cosa rara

const time = now.toLocaleTimeString('es-MX', {
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});




    console.log('Fecha y hora ENVIADAS al backend:', { date, time })

    const efectivoRecibido = Number(efectivo || 0)
    const tarjetaPagada = Number(tarjeta || 0)

    const efectivoAplicado = Math.min(efectivoRecibido, pagoInicialRequerido - tarjetaPagada)
    const paid = efectivoAplicado + tarjetaPagada

    if (paid < pagoInicialRequerido) {
      toast.error(`El pago debe ser al menos $${pagoInicialRequerido.toFixed(2)}`)
      return
    }

    const payments = []

    const esApartado = tipoRequisito === "apartado" || granTotal > 0 && pagoInicialRequerido > 0

    if (efectivoAplicado > 0) {
      payments.push({
        method: "efectivo",
        amount: efectivoAplicado,
        payment_type: esApartado ? "anticipo" : "normal",
        date,
      })
    }

    if (tarjetaPagada > 0) {
      payments.push({
        method: "tarjeta",
        amount: tarjetaPagada,
        bank: bancoTarjeta || null,
        last4: ultimos4Tarjeta || null,
        reference: null,
        payment_type: esApartado ? "anticipo" : "normal",
        date,
      })
    }

    const details = items
      .filter((i) => i.productId)
      .map((i) => ({
        product_id: i.productId,
        quantity: i.cantidad,
        base_price: i.precio,
        price: i.precioConDesc || i.precio,
        subtotal: i.importeBase,
        discount_pct: i.descuentoPct || 0,
        discount_amount: i.descuentoMonto || 0,
        tax_rate: i.ivaPct || 0,
        tax_amount: i.ivaMonto || 0,
        tax_type: i.ivaPct > 0 ? "IVA" : "EXENTO",
        articulo: i.articulo || "Sin nombre"
      }))

    if (!user?.id || !user?.nickname) {
      toast.error("Sesión no válida")
      return
    }
    if (!selectedCustomer?.id) {
      toast.error("Debes seleccionar un cliente para el apartado")
      return
    }

    const saleData = {
      date,
      time,
      type: "apartado",
      movement_reason: "VENTA_APARTADO",
      customer_id: selectedCustomer.id,
      subtotal,
      tax_total: ivaTotal,
      discount_total: descuentoTotal,
      total: granTotal,
      paid,
      efectivo_recibido: efectivoRecibido,
      cambio,
      pending_balance: Math.max(granTotal - paid, 0),
      status: paid >= granTotal ? "completed" : "pending",
      id_user: user.id,
      nickname_user: user.nickname,
      details,
      payments,
    }

    try {
      const res = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar venta")
      }

      // RESET TOTAL después de guardar (incluyendo cliente)
      inicializadoRef.current = false
      setItems([])
      setEfectivo(0)
      setTarjeta(0)
      setBancoTarjeta("")
      setUltimos4Tarjeta("")
      setFocusArea("grilla")
      setSelectedCustomer(null)          // Limpia el cliente seleccionado
      setCustomerQuery("")               // Limpia el input de búsqueda
      setShowOverlay(false)              // Cierra cualquier overlay abierto

      toast.success("Venta guardada ✅")
    } catch (err) {
      console.error(err)
      toast.error(err.message)
    }
  }

  React.useEffect(() => {
    if (inicializadoRef.current) return

    if (items.length === 0) {
      agregarItem()
      setFocusPendiente({ row: 0, col: "codigoBarras" })
    }

    inicializadoRef.current = true
  }, [items.length])

  const eliminarItemSeguro = (id) => {
    if (items.length === 1) {
      beep(false)
      actualizarItem(id, "productId", null)
      actualizarItem(id, "codigoBarras", "")
      actualizarItem(id, "articulo", "")
      actualizarItem(id, "presentacion", "")
      actualizarItem(id, "cantidad", 1)
      actualizarItem(id, "precio", 0)
      actualizarItem(id, "descuentoPct", 0)
      actualizarItem(id, "ivaPct", 16)
      actualizarItem(id, "precios", [])
      actualizarItem(id, "tipoPrecio", null)
      return
    }

    eliminarItem(id)
  }

  useEffect(() => {
    if (customerQuery.length < 2) {
      setCustomers([])
      return
    }

    const fetchCustomers = async () => {
      const res = await fetch(`${API_URL}/customers/search/${customerQuery}`)
      const data = await res.json()
      setCustomers(data)
      setShowOverlay(true)
    }

    const delay = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(delay)
  }, [customerQuery])

  return (
    <div className="space-y-8 pb-12">
      {/* Header superior */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        {/* Izquierda: Título + caja + toggle */}
        <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Ventas de APARTADO
          </h2>

          <div className="text-sm text-muted-foreground">
            Caja: <span className="font-semibold">{caja?.numero || "—"}</span>{" "}
            <span className="opacity-60">({caja?.tipo || "N/A"})</span>
          </div>

          <div className="flex flex-col items-center gap-2 lg:flex-row lg:gap-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={mostrarDescuento}
                onCheckedChange={setMostrarDescuento}
              />
              <span className="text-sm">Mostrar descuentos</span>
            </div>
            <span className="text-xs text-muted-foreground">[F11] Cambiar foco</span>
          </div>
        </div>

        {/* Derecha: Botón Agregar */}
        <Button
          onClick={agregarItem}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md h-11 px-8 self-center lg:self-start"
        >
          <Plus className="w-5 h-5 mr-2" />
          Agregar producto
        </Button>
      </div>

      {/* Grilla principal */}
      <VentaApartadoGrid
        focusArea={focusArea}
        items={items}
        columnas={columnas}
        mostrarDescuento={mostrarDescuento}
        activeCell={activeCell}
        setActiveCell={setActiveCell}
        manejarTeclas={manejarTeclas}
        actualizarItem={actualizarItem}
        eliminarItemSeguro={eliminarItemSeguro}
        buscarProductoPorCodigo={buscarProductoPorCodigo}
        buscarProductoPorNombre={buscarProductoPorNombre}
        mostrarLista={mostrarLista}
        mostrarPrecios={mostrarPrecios}
        abrirMenuPrecios={(index, precios) => {
          const lista = construirMenuPrecios(precios)
          if (!lista.length) return
          setFilaPrecio(index)
          setPrecioIndex(0)
          setPreciosProducto(lista)
          setMostrarPrecios(true)
        }}
      />

      {/* Sección inferior: 3 cards grandes */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card 1: ¿Quién? - Datos del cliente */}
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-emerald-600" />
              ¿Quién compra?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda de cliente */}
            <div className="relative">
              <input
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value)
                  setShowOverlay(true)
                }}
                placeholder="Buscar cliente por nombre o teléfono"
                className="w-full border rounded-lg px-4 py-2.5 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 transition-all"
              />

              {showOverlay && customers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto divide-y divide-gray-100">
                  {customers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c)
                        setCustomerQuery(`${c.first_name} ${c.last_name_paternal}`)
                        setShowOverlay(false)
                      }}
                      className="px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        #{c.id} {c.first_name} {c.last_name_paternal} {c.last_name_maternal}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5 flex justify-between">
                        <span>{c.phone || "—"}</span>
                        <span className="font-medium text-emerald-700">
                          Saldo: ${Number(c.current_balance || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Datos del cliente seleccionado */}
            {selectedCustomer ? (
              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-muted-foreground block text-xs">ID</span>
                  <span className="font-medium">{selectedCustomer.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Teléfono</span>
                  <span className="font-medium">{selectedCustomer.phone || "—"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Nombre completo</span>
                  <span className="font-medium">
                    {selectedCustomer.first_name} {selectedCustomer.last_name_paternal}{" "}
                    {selectedCustomer.last_name_maternal}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Saldo actual</span>
                  <span className="font-bold text-emerald-700 text-lg">
                    ${Number(selectedCustomer.current_balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm bg-gray-50 rounded-lg">
                Selecciona un cliente para continuar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Resumen + Anticipo */}
        <ResumenApartado
          subtotal={subtotal}
          ivaTotal={ivaTotal}
          descuentoTotal={descuentoTotal}
          granTotal={granTotal}
          mostrarDescuento={mostrarDescuento}
          porcentajeApartado={porcentajeApartado}
          setPorcentajeApartado={setPorcentajeApartado}
          tipoRequisito={tipoRequisito}
          setTipoRequisito={setTipoRequisito}
          montoFijo={montoFijo}
          setMontoFijo={setMontoFijo}
          pagoInicialRequerido={pagoInicialRequerido}
        />

        {/* Card 3: Pago */}
        <PagoApartado
          focusArea={focusArea}
          formaPago={formaPago}
          setFormaPago={setFormaPago}
          efectivo={efectivo}
          setEfectivo={setEfectivo}
          tarjeta={tarjeta}
          setTarjeta={setTarjeta}
          cambio={cambio}
          bancoTarjeta={bancoTarjeta}
          setBancoTarjeta={setBancoTarjeta}
          ultimos4Tarjeta={ultimos4Tarjeta}
          setUltimos4Tarjeta={setUltimos4Tarjeta}
          total={granTotal}
          pagoInicialRequerido={pagoInicialRequerido}
          onProcesarVenta={handleProcesarVenta}
        />
      </div>

      {/* Overlays */}
      {mostrarLista && (
        <ListaArticulosPorNombreApartado
          resultados={resultadosNombre}
          selectedIndex={selectedIndexNombre}
          setSelectedIndex={setSelectedIndexNombre}
          onSelect={seleccionarProductoDesdeLista}
          onClose={() => setMostrarLista(false)}
        />
      )}

      {mostrarPrecios && (
        <MenuPreciosApartado
          precios={preciosProducto}
          selectedIndex={precioIndex}
          setSelectedIndex={setPrecioIndex}
          onSelect={(p) => {
            const item = items[filaPrecio]
            actualizarItem(item.id, "tipoPrecio", p.tipo)
            actualizarItem(item.id, "precio", p.valor)
            setMostrarPrecios(false)
          }}
          onClose={() => setMostrarPrecios(false)}
        />
      )}
    </div>
  )
}