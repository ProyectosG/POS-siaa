"use client"

import * as React from "react"
import { useState, useRef } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { useSettingsStore } from "@/store/useSettingsStore"
import toast from "react-hot-toast"

import { Plus } from "lucide-react"

import { useVentasContado } from "./hooks/useVentasContado"
import { useGridNavigation } from "./hooks/useGridNavigation"

import VentaGrid from "./VentaGrid"
import OverlayProductos from "@/components/siaa-ui/OverlayProductos";
import MenuPrecios from "../siaa-ui/MenuPrecios"
import Resumen from "./Resumen"
import PagoVenta from "../siaa-ui/PagoVenta"


import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useCajaStore } from "@/store/useCajaStore"

const API_URL = process.env.NEXT_PUBLIC_API_URL

/* ===== BEEP ===== */
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

export default function VentasContado() {
  const caja = useCajaStore((s) => s.caja)
  const user = useAuthStore((s) => s.user)
  const inicializadoRef = React.useRef(false)

  /* Overlay */
  const [mostrarOverlay, setMostrarOverlay] = useState(false)
  const [productoTmp, setProductoTmp] = useState(null)
  const [cantidad, setCantidad] = useState("")
  const refNombre = useRef(null)
  const refCodigo = useRef(null)

    // 🟢 CONSUMIMOS SETTINGS GLOBALES
  const settings = useSettingsStore((s) => s.settings)

  /* ===== HOOK PRINCIPAL ===== */
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
  } = useVentasContado()

  /* ===== ESTADO PAGO ===== */
  const [formaPago, setFormaPago] = React.useState("efectivo")
  const [efectivo, setEfectivo] = React.useState(0)
  const [tarjeta, setTarjeta] = React.useState(0)
  const [bancoTarjeta, setBancoTarjeta] = React.useState("")
  const [ultimos4Tarjeta, setUltimos4Tarjeta] = React.useState("")
  const totalPagado = Number(efectivo || 0) + Number(tarjeta || 0)
  const cambio = Math.max(0, totalPagado - granTotal)

  /* ===== FOCO ===== */
  const [focusArea, setFocusArea] = React.useState("grilla")
  const [focusPendiente, setFocusPendiente] = React.useState(null)

  /* ===== BÚSQUEDA POR NOMBRE ===== */
  const [resultadosNombre, setResultadosNombre] = React.useState([])
  const [mostrarLista, setMostrarLista] = React.useState(false)
  const [filaBusqueda, setFilaBusqueda] = React.useState(null)
  const [selectedIndexNombre, setSelectedIndexNombre] = React.useState(0)

  /* ===== MENÚ PRECIOS ===== */
  const [mostrarPrecios, setMostrarPrecios] = React.useState(false)
  const [preciosProducto, setPreciosProducto] = React.useState([])
  const [precioIndex, setPrecioIndex] = React.useState(0)
  const [filaPrecio, setFilaPrecio] = React.useState(null)

  /* ===== COLUMNAS ===== */
  const columnas = React.useMemo(() => {
    const base = ["cantidad", "codigoBarras", "articulo", "precio"]
    if (mostrarDescuento) base.push("descuentoPct")
    return base
  }, [mostrarDescuento])

  const { activeCell, setActiveCell, manejarTeclas } = useGridNavigation({
    columnas,
    items,
    onDeleteRow: (fila) => eliminarItemSeguro(items[fila].id),
    disabled: mostrarLista || mostrarPrecios,
  })

  /* ===== F11 ===== */
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

  /* ===== FOCO POST RENDER ===== */
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

  /* ===== BUSCAR POR CÓDIGO ===== */
const buscarProductoPorCodigo = async (itemId, codigo) => {
  if (!codigo) return
  
  // Obtenemos las configuraciones actuales del store
  const settings = useSettingsStore.getState().settings;

  try {
    const res = await fetch(`${API_URL}/products/barcode/${codigo}`)
    if (!res.ok) {
      beep(false)
      // Opcional: toast.error("Producto no encontrado")
      return
    }

    const p = await res.json()

    // 🚨 VALIDACIÓN DE STOCK SEGÚN SETTINGS
    // Si el stock es 0 o menos Y la variable allow_negative_balance es false (o no existe)
    const stockDisponible = Number(p.existencia) || 0;
    
    if (stockDisponible <= 0 && !settings?.allow_negative_balance) {
      beep(false);
      toast.error(`No hay existencia de: ${p.articulo}`, {
        icon: '🚫',
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
      return; // Bloqueamos la entrada del producto a la grilla
    }

    beep(true)

    const precios = [
      { tipo: "menudeo", label: "Menudeo", valor: p.precio_menudeo },
      { tipo: "mayoreo", label: "Mayoreo", valor: p.precio_mayoreo },
      { tipo: "especial", label: "Especial", valor: p.precio_especial },
      { tipo: "oferta", label: "Oferta", valor: p.precio_oferta },
    ].filter((pre) => pre.valor > 0)

    // Actualizamos los datos del item actual
    actualizarItem(itemId, "productId", p.id)
    actualizarItem(itemId, "codigoBarras", p.codigo_barras || "")
    actualizarItem(itemId, "articulo", p.articulo || "")
    actualizarItem(itemId, "presentacion", p.presentacion || "")
    actualizarItem(itemId, "stock", stockDisponible) // Guardamos el stock para validaciones posteriores
    actualizarItem(itemId, "precios", precios)
    actualizarItem(itemId, "tipoPrecio", precios[0]?.tipo || "menudeo")
    actualizarItem(itemId, "precio", precios[0]?.valor || 0)
    actualizarItem(itemId, "ivaPct", p.iva ? 16 : 0)

    // Agregamos una fila nueva y saltamos a ella
    agregarItem()
    setFocusPendiente({ row: items.length, col: "codigoBarras" })

  } catch (err) {
    console.error("Error al buscar por código:", err)
    toast.error("Error de conexión con el servidor");
  }
}
  /* ===== BUSCAR POR NOMBRE ===== */
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
    Array.isArray(precios)
      ? precios.filter((p) => p.valor > 0)
      : []

  /* ===== ELIMINAR ITEM SEGURO ===== */
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



  /* ===== PROCESAR VENTA ===== */
  const handleProcesarVenta = async ({ formaPago, efectivo, tarjeta }) => {
    const now = new Date()
    const date =
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0")

    const time = now.toLocaleTimeString('es-MX', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

  const efectivoRecibido = Number(efectivo || 0);
const tarjetaPagada = Number(tarjeta || 0);

// Calculamos cambio (ya lo tienes en UI)
const cambio = Math.max(efectivoRecibido - (granTotal - tarjetaPagada), 0);

// Efectivo que se aplica a la venta
const efectivoAplicado = efectivoRecibido - cambio;

// Total entregado por el cliente (esto será el nuevo `paid`)
const paid = efectivoAplicado + tarjetaPagada;  // 263 + 77 = 340 (aplicado)
// O si quieres que paid sea lo entregado real: paid = efectivoRecibido + tarjetaPagada;


    const payments = []

    if (efectivoAplicado > 0) {
      payments.push({
        method: "efectivo",
        amount: efectivoAplicado,
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
        date,
      })
    }

    const details = items
      .filter(i => i.productId)
      .map(i => ({
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
      }))

    if (!user?.id || !user?.nickname) {
      toast.error("Sesión no válida")
      return
    }

    const saleData = {
      date,
      time,   // ← ahora enviamos time también
      type: "contado",
      movement_reason: "VENTA_CONTADO",
      customer_id: null,
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

    // Limpieza forzada de todos los strings (por seguridad)
    Object.keys(saleData).forEach(key => {
      if (typeof saleData[key] === 'string') {
        saleData[key] = saleData[key].replace(/\//g, '-').trim();
      }
    });

    console.log('Valores ENVIADOS al backend (revisa si hay "/"):', saleData);

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

      inicializadoRef.current = false
      setItems([])
      setEfectivo(0)
      setTarjeta(0)
      setBancoTarjeta("")
      setUltimos4Tarjeta("")
      setFocusArea("grilla")

      toast.success("Venta guardada ✅")
    } catch (err) {
      console.error(err)
      toast.error(err.message)
    }
  }

  /* ===== ASEGURAR FILA INICIAL SOLO UNA VEZ ===== */
  React.useEffect(() => {
    if (inicializadoRef.current) return

    if (items.length === 0) {
      agregarItem()
      setFocusPendiente({ row: 0, col: "codigoBarras" })
    }

    inicializadoRef.current = true
  }, [items.length])

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


  /* ===== RENDER ===== */
  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-emerald-600">
            Ventas de Contado
          </h2>
          <div className="text-sm text-muted-foreground">
            Caja: <span className="font-semibold">{caja?.numero}</span>{" "}
            <span className="opacity-60">({caja?.tipo})</span>
          </div>
        </div>

        <Button onClick={agregarItem} className="bg-emerald-600 gap-2">
          <Plus className="w-4 h-4" />
          Agregar
        </Button>
      </div>

 {/* TOGGLE CONDICIONADO */}
{Number(settings?.allow_discounts) !== 0 && (
  <div className="flex items-center gap-3 animate-in fade-in duration-300">
    <Switch
      checked={mostrarDescuento}
      onCheckedChange={setMostrarDescuento}
    />
    <div className="flex flex-col">
       <span className="text-sm font-medium text-slate-700">Mostrar descuentos</span>
       <p className="text-[10px] text-muted-foreground">[F11] cambia foco</p>
    </div>
  </div>
)}

      {/* GRILLA */}
      <VentaGrid
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

      {/* RESUMEN + PAGO */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Resumen
          subtotal={subtotal}
          ivaTotal={ivaTotal}
          descuentoTotal={descuentoTotal}
          granTotal={granTotal}
          mostrarDescuento={mostrarDescuento}
        />

      <PagoVenta
        mode="contado"  // Ahora es "contado" en lugar de "apartado"
        total={granTotal}
        anticipoRequerido={0}  // En ventas de contado no es necesario el anticipo

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

        onProcesar={handleProcesarVenta} // Función de procesamiento de ventas de contado
      />

      </div>

      {/* OVERLAYS */}
     {mostrarLista && (
  <OverlayProductos
    resultados={resultadosNombre}
    selectedIndex={selectedIndexNombre}
    setSelectedIndex={setSelectedIndexNombre}
    onSelect={handleSeleccionProducto}
    // 🔥 CAMBIO AQUÍ: Debe ser la misma variable que arriba
    onClose={() => setMostrarLista(false)} 
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