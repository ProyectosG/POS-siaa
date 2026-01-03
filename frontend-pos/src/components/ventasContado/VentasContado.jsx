"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { useVentasContado } from "./hooks/useVentasContado"
import { useGridNavigation } from "./hooks/useGridNavigation"

import VentaGrid from "./VentaGrid"
import ListaArticulosPorNombre from "./ListaArticulosPorNombre"
import MenuPrecios from "./MenuPrecios"
import Resumen from "./Resumen"
import Pago from "./Pago"

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
    onDeleteRow: (fila) => eliminarItem(items[fila].id),
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

      console.log(p.id)
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

  /* ===== PROCESAR VENTA ===== */
 const handleProcesarVenta = async ({ formaPago, efectivo, tarjeta }) => {
  const date = new Date().toISOString().split('T')[0];

  const efectivoRecibido = Number(efectivo || 0);
  const tarjetaPagada = Number(tarjeta || 0);

  // ✅ EFECTIVO REAL APLICADO A LA VENTA
  const efectivoAplicado = Math.min(
    efectivoRecibido,
    granTotal - tarjetaPagada
  );

  // ✅ TOTAL PAGADO REAL
  const paid = efectivoAplicado + tarjetaPagada;

  const payments = [];

  if (efectivoAplicado > 0) {
    payments.push({
      method: 'efectivo',
      amount: efectivoAplicado,
      date
    });
  }

  if (tarjetaPagada > 0) {
    payments.push({
      method: 'tarjeta',
      amount: tarjetaPagada,
      bank: bancoTarjeta || null,
      last4: ultimos4Tarjeta || null,
      reference: null,
      date
    });
  }

  const details = items
    .filter(i => i.productId)
    .map(i => ({
      product_id: i.productId,
      quantity: i.cantidad,

      // 💰 PRECIO FINAL
      price: i.precioConDesc || i.precio,
      subtotal: i.importe,

      // 🧾 AUDITORÍA
      base_price: i.precio,
      discount_pct: i.descuentoPct || 0,
      discount_amount: i.descuentoMonto || 0,
    }));

  const saleData = {
    date,
    type: 'contado',
    customer_id: null,
    total: granTotal,
    paid,
    status: paid >= granTotal ? 'completed' : 'pending',
    details,
    payments
  };

  try {
    const res = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar venta');
    }


    setItems([]);
    setEfectivo(0);
    setTarjeta(0);
    setBancoTarjeta("");
    setUltimos4Tarjeta("");
    setFocusArea("grilla");

    alert('Venta procesada');
  } catch (err) {
    console.error(err);
    alert(err.message); // 👈 muestra "Stock insuficiente..."
}

};

   /*-------------------------------------------------------------------------*/
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

      {/* TOGGLE */}
      <div className="flex items-center gap-3">
        <Switch
          checked={mostrarDescuento}
          onCheckedChange={setMostrarDescuento}
        />
        <span className="text-sm">Mostrar descuentos</span>
        <p className="text-sm text-muted-foreground">  [F11] cambia foco</p>
      </div>

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
        eliminarItem={eliminarItem}
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

        <Pago
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
          onProcesarVenta={handleProcesarVenta}
        />
      </div>

      {/* OVERLAYS */}
      {mostrarLista && (
        <ListaArticulosPorNombre
          resultados={resultadosNombre}
          selectedIndex={selectedIndexNombre}
          setSelectedIndex={setSelectedIndexNombre}
          onSelect={seleccionarProductoDesdeLista}
          onClose={() => setMostrarLista(false)}
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