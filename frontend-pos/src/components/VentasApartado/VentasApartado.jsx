"use client"

import * as React from "react"
import { useState, useEffect,useRef } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { useSettingsStore } from "@/store/useSettingsStore"
import toast from "react-hot-toast"

import { Plus, User, DollarSign, CreditCard, ShoppingBag, HandCoins } from "lucide-react"
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla"
import BarraTotalMovil from "@/components/siaa-ui/BarraTotalMovil"


import { useVentasApartado } from "./hooks/useVentasApartado"
import { useGridNavigationApartado } from "./hooks/useGridNavigationApartado"

import VentaApartadoGrid from "./VentaApartadoGrid"
import OverlayProductos from "@/components/siaa-ui/OverlayProductos";
import CustomerForm from "@/components/CatalogoClientes/CustomerForm.jsx"
import MenuPrecios from "../siaa-ui/MenuPrecios"
import ResumenApartado from "./ResumenApartado"
import PagoVenta from "../siaa-ui/PagoVenta"
import VistaPreviaTicket from "../siaa-ui/VistaPreviaTicket"
// import PagoApartado from "./PagoApartado"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCajaStore } from "@/store/useCajaStore"
import { apiFetch } from "@/lib/apiFetch"
import { armarRenglones, enviarVenta, aCentavosPesos } from "@/lib/ventas"
import { pesos } from "@/lib/formato"



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

// La misma pantalla sirve para apartado y para crédito (tipo="credito"): en
// crédito el anticipo es opcional y al terminar se muestra el ticket
export default function VentasApartado({ tipo = "apartado" }) {
  const esCredito = tipo === "credito"
  const caja = useCajaStore((s) => s.caja)
  const user = useAuthStore((s) => s.user)
  const claveVentaRef = React.useRef(null) // Idempotency-Key de la venta en curso
  const [ticketVenta, setTicketVenta] = useState(null) // venta a crédito recién hecha (vista previa)
  const inicializadoRef = React.useRef(false)
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  
  // 🟢 CONSUMIMOS SETTINGS GLOBALES
  const settings = useSettingsStore((s) => s.settings)
  const FORM_MODE = settings.customer_form_mode || "complete" // 🟢 ahora también desde settings globales

  /* Overlay */
  const [mostrarOverlay, setMostrarOverlay] = useState(false)
  const [productoTmp, setProductoTmp] = useState(null)
  const [cantidad, setCantidad] = useState("")
  const refNombre = useRef(null)
  const refCodigo = useRef(null)
  
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
      const res = await apiFetch(`/products/barcode/${codigo}`)
      if (!res.ok) {
        beep(false)
        return
      }

      const p = await res.json()
      beep(true)

      // Etiqueta vieja: el servidor encontró el producto por su código anterior
      if (p.codigo_cambiado) {
        toast(`Este código cambió; el actual es ${p.codigo_cambiado.actual || "ninguno"}`, { icon: "🏷️" })
      }

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

    const res = await apiFetch(
      `/products/search?query=${encodeURIComponent(texto)}`
    )
    if (!res.ok) return

    const data = await res.json()

                  // normalizar para overlay

      const normalizados = data.map(p => ({
        ...p,
        codigo_barras: p.codigo_barras || p.codigo || "-",
        articulo: p.articulo || p.name || "-",
        presentacion: p.presentacion || p.presentation || "-",
        precio_menudeo: p.precio_menudeo ?? p.retail_price ?? 0,
        stock: Number(p.stock ?? p.quantity ?? 0),
      }))

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

  // PROCESAR APARTADO
  // Precios, IVA y saldo los calcula el servidor (también la fecha); aquí solo se
  // manda qué se aparta, el anticipo y el total que vio el cajero (total_esperado).
  const handleProcesarVenta = async ({ formaPago, efectivo, tarjeta }) => {
    const efectivoRecibido = Number(efectivo || 0)
    const tarjetaPagada = Number(tarjeta || 0)

    // Apartado: el anticipo es el requerido y el efectivo de más se devuelve como
    // cambio. Crédito: el anticipo es lo que se recibe (puede ser 0), sin cambio.
    const efectivoAplicado = esCredito
      ? aCentavosPesos(efectivoRecibido)
      : aCentavosPesos(Math.min(efectivoRecibido, pagoInicialRequerido - tarjetaPagada))
    const paid = efectivoAplicado + tarjetaPagada

    if (esCredito && paid >= granTotal) {
      toast.error("Si paga todo, cóbralo como venta de contado")
      return
    }
    if (!esCredito && paid < pagoInicialRequerido) {
      toast.error(`El pago debe ser al menos ${pesos(pagoInicialRequerido)}`)
      return
    }

    const payments = []

    if (efectivoAplicado > 0) {
      payments.push({ method: "efectivo", amount: efectivoAplicado })
    }

    if (tarjetaPagada > 0) {
      payments.push({
        method: "tarjeta",
        amount: aCentavosPesos(tarjetaPagada),
        bank: bancoTarjeta || null,
        last4: ultimos4Tarjeta || null,
      })
    }

    if (!user?.id && !user?.isSuperDev) {
      toast.error("Sesión no válida")
      return
    }
    if (!selectedCustomer?.id) {
      toast.error(`Debes seleccionar un cliente para ${esCredito ? "el crédito" : "el apartado"}`)
      return
    }

    const saleData = {
      type: tipo,
      customer_id: selectedCustomer.id,
      total_esperado: aCentavosPesos(granTotal),
      efectivo_recibido: efectivoRecibido,
      details: armarRenglones(items),
      payments,
    }

    try {
      const r = await enviarVenta(saleData, claveVentaRef)
      if (!r.ok) throw new Error(r.mensaje)

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

      if (esCredito) {
        toast.success(r.data.repetida ? "Este crédito ya estaba registrado ✅" : "Venta a crédito guardada ✅")
        setTicketVenta(r.data.id)
      } else {
        toast.success(r.data.repetida ? "Este apartado ya estaba registrado ✅" : "Venta guardada ✅")
      }
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
      const res = await apiFetch(`/customers/search/${customerQuery}`)
      const data = await res.json()
      setCustomers(data)
      setShowOverlay(true)
    }

    const delay = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(delay)
  }, [customerQuery])


      /* ================= MANEJAR SELECCIÓN DEL OVERLAY ================= */
const handleSeleccionProducto = (producto) => {
  if (!producto) return
  const fila = filaBusqueda ?? items.length - 1  // fila actual de la grilla
  const item = items[fila]
  if (!item) return

  const precios = [
    { tipo: "menudeo", label: "Menudeo", valor: producto.precio_menudeo },
    { tipo: "mayoreo", label: "Mayoreo", valor: producto.precio_mayoreo },
    { tipo: "especial", label: "Especial", valor: producto.precio_especial },
    { tipo: "oferta", label: "Oferta", valor: producto.precio_oferta },
  ].filter(p => p.valor > 0)

  actualizarItem(item.id, "productId", producto.id)
  actualizarItem(item.id, "codigoBarras", producto.codigo_barras || "")
  actualizarItem(item.id, "articulo", producto.articulo || "")
  actualizarItem(item.id, "presentacion", producto.presentacion || "")
  actualizarItem(item.id, "precios", precios)
  actualizarItem(item.id, "tipoPrecio", precios[0]?.tipo)
  actualizarItem(item.id, "precio", precios[0]?.valor)
  actualizarItem(item.id, "ivaPct", producto.iva ? 16 : 0)

  setMostrarLista(false)       // cierra overlay
  agregarItem()                // agrega nueva fila
  setFocusPendiente({ row: fila + 1, col: "codigoBarras" })  // mueve foco
}

const handleAgregarNuevoCliente = () => {
  setMostrarNuevoCliente(true)
}

const handleClienteCreado = (clienteNuevo) => {
  setSelectedCustomer(clienteNuevo)
  setCustomerQuery(`${clienteNuevo.first_name} ${clienteNuevo.last_name_paternal}`)
  setMostrarNuevoCliente(false)
  toast.success("Cliente creado ✅")
}

  return (
    <div className="space-y-5 pb-20 md:pb-12">
      <EncabezadoPantalla
        titulo={esCredito ? "Venta a crédito" : "Venta de apartado"}
        icono={esCredito ? HandCoins : ShoppingBag}
        className="mb-0"
        subtitulo={<>Caja <b className="text-foreground">{caja?.numero || "—"}</b> <span className="opacity-70">({caja?.tipo || "N/A"})</span></>}
        acciones={
          <Button onClick={agregarItem} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar producto
          </Button>
        }
      />
      <div>
        <div>
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
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

      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-start lg:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-5">
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

        {/* Card 1: ¿Quién? - Datos del cliente */}
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-emerald-600" />
              ¿Quién compra?
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={handleAgregarNuevoCliente}
            >
              <User className="w-4 h-4 mr-1" /> Nuevo cliente
            </Button>

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
                          Saldo: {pesos(Number(c.current_balance || 0))}
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
                  <span className="text-muted-foreground block text-xs">{esCredito ? "Ya debe" : "Saldo actual"}</span>
                  <span className={`font-bold text-lg ${esCredito && Number(selectedCustomer.current_balance) > 0 ? "text-aviso" : "text-emerald-700"}`}>
                    {pesos(Number(selectedCustomer.current_balance || 0))}
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
        

      </div>

      {/* TICKET: resumen con anticipo y pago */}
      <div className="min-w-0 space-y-5 [&>*]:min-w-0 md:sticky md:top-20 lg:static lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 2xl:sticky 2xl:top-6 2xl:block 2xl:space-y-5">
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
          tipo={tipo}
        />

        {/* Card 3: Pago */}
        <div id="pago-venta" className="scroll-mt-20">
        <PagoVenta
          mode={tipo}
          total={granTotal}
          anticipoRequerido={pagoInicialRequerido}

          focusArea={focusArea}
          formaPago={formaPago}
          setFormaPago={setFormaPago}
          efectivo={efectivo}
          setEfectivo={setEfectivo}
          tarjeta={tarjeta}
          setTarjeta={setTarjeta}
          bancoTarjeta={bancoTarjeta}
          setBancoTarjeta={setBancoTarjeta}
          ultimos4Tarjeta={ultimos4Tarjeta}
          setUltimos4Tarjeta={setUltimos4Tarjeta}
          cambio={cambio}

          onProcesar={handleProcesarVenta} // Cambié el nombre del prop a `onProcesar` que es lo que espera el componente hijo
        />
        </div>
      </div>
      </div>

      <BarraTotalMovil total={granTotal} textoBoton={esCredito ? "Ir a cobrar" : "Ir al anticipo"} />

      {/* Crédito: ticket de la venta recién hecha (para imprimir y que el cliente firme) */}
      <VistaPreviaTicket saleId={ticketVenta} onClose={() => setTicketVenta(null)} />

      {/* Overlays */}
      {mostrarLista && (
       <OverlayProductos
             resultados={resultadosNombre} // ✅ aquí van los resultados de búsqueda
             selectedIndex={selectedIndexNombre}
             setSelectedIndex={setSelectedIndexNombre}
             onSelect={handleSeleccionProducto}
             onClose={() => setMostrarOverlay(false)} // ✅ corregido
             columns={[
               { key: 'codigo_barras', label: 'Código' },
               { key: 'articulo', label: 'Artículo' },
               { key: 'presentacion', label: 'Presentación' },
               { key: 'precio_menudeo', label: 'Precio' },    
               { key: 'stock', label: 'Stock', align: 'right' },
             ]}
             selectedColor="emerald"
           />
      )}

      {mostrarPrecios && (
        <MenuPrecios
          precios={preciosProducto}
          selectedIndex={precioIndex}
          setSelectedIndex={setPrecioIndex}
          productId={items[filaPrecio]?.productId}
          onSelect={(p) => {
            const item = items[filaPrecio]
            actualizarItem(item.id, "tipoPrecio", p.tipo)
            actualizarItem(item.id, "precio", p.valor)
            // Precio libre: la autorización del servidor viaja con el renglón
            actualizarItem(item.id, "autorizacionPrecio", p.autorizacion || null)
            setMostrarPrecios(false)
          }}
          onClose={() => setMostrarPrecios(false)}
        />
      )}
{mostrarNuevoCliente && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
    <div
      className={`bg-gray-100 rounded-lg shadow-lg w-full max-w-4xl flex flex-col overflow-hidden ${
        FORM_MODE === "basic" ? "max-h-[85vh]" : "max-h-[95vh]"
      }`}
    >
      <div className="p-6 flex-1 overflow-y-auto">
        <CustomerForm
          onSubmit={handleClienteCreado}
          onCancel={() => setMostrarNuevoCliente(false)}
        />
      </div>
    </div>
  </div>
)}




    </div>
  )
}