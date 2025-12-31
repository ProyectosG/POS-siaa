"use client"

import * as React from "react"
import { useVentasContado } from "./hooks/useVentasContado"
import { useGridNavigation } from "./hooks/useGridNavigation"
import ListaArticulosPorNombre from "./ListaArticulosPorNombre"
import MenuPrecios from "./MenuPrecios"

import Resumen from "./Resumen"
import Pago from "./Pago"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

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

const cellActiveClass = (row, col, activeCell) =>
  activeCell.row === row && activeCell.col === col
    ? "ring-2 ring-emerald-500 bg-emerald-50"
    : ""

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function VentasContado() {
  const {
    items,
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

  const [formaPago, setFormaPago] = React.useState("efectivo")
  const [efectivo, setEfectivo] = React.useState(0)
  const [tarjeta, setTarjeta] = React.useState(0)
  const [focusArea, setFocusArea] = React.useState("grilla")
  const [focusPendiente, setFocusPendiente] = React.useState(null)
  const [bancoTarjeta, setBancoTarjeta] = React.useState("")
  const [ultimos4Tarjeta, setUltimos4Tarjeta] = React.useState("")




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

  const totalPagado = Number(efectivo || 0) + Number(tarjeta || 0)

  
const cambio = Math.max(0, totalPagado - granTotal)


  /* ===== COLUMNAS ===== */
  const columnas = React.useMemo(() => {
    const base = ["cantidad", "codigoBarras", "articulo", "precio"]
    if (mostrarDescuento) base.push("descuentoPct")
    return base
  }, [mostrarDescuento])

const { activeCell, setActiveCell, manejarTeclas } =
  useGridNavigation({
    columnas,
    items,
    onDeleteRow: (fila) => eliminarItem(items[fila].id),
    disabled: mostrarLista || mostrarPrecios, // 🔑
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
  const buscarProductoPorCodigo = async (itemId, codigo, fila) => {
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
      ].filter(p => p.valor > 0)

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

  /* ===== SELECCIONAR DESDE LISTA ===== */
const seleccionarProductoDesdeLista = (p) => {

  const item = items[filaBusqueda]
  if (!item) return

  const precios = [
    { tipo: "menudeo", label: "Menudeo", valor: p.precio_menudeo },
    { tipo: "mayoreo", label: "Mayoreo", valor: p.precio_mayoreo },
    { tipo: "especial", label: "Especial", valor: p.precio_especial },
    { tipo: "oferta", label: "Oferta", valor: p.precio_oferta },
  ].filter(p => p.valor != null && p.valor > 0)

  // 🔐 BLINDAJE
  const preciosFinales = precios.length > 0 ? precios : [
    { tipo: "menudeo", label: "Menudeo", valor: 0 }
  ]

  actualizarItem(item.id, "codigoBarras", p.codigo_barras || "")
  actualizarItem(item.id, "articulo", p.articulo || "")
  actualizarItem(item.id, "presentacion", p.presentacion || "")
  actualizarItem(item.id, "precios", preciosFinales)
  actualizarItem(item.id, "tipoPrecio", preciosFinales[0].tipo)
  actualizarItem(item.id, "precio", preciosFinales[0].valor)
  actualizarItem(item.id, "ivaPct", p.iva ? 16 : 0)

  setMostrarLista(false)
  agregarItem()

  setFocusPendiente({
    row: filaBusqueda + 1,
    col: "codigoBarras",
  })
}


 
const cerrarListaNombre = () => {
  setMostrarLista(false)

  if (filaBusqueda !== null) {
    setFocusPendiente({
      row: filaBusqueda,
      col: "articulo",
    })
  }
}
const construirMenuPrecios = (precios) => {
  if (!precios) return []

  // Si ya viene como ARRAY (barcode)
  if (Array.isArray(precios)) {
    return precios.filter(
      (p) => p && p.valor != null && p.valor > 0
    )
  }

  // Si viene como OBJETO (búsqueda por nombre)
  return [
    {
      tipo: "menudeo",
      label: "Menudeo",
      valor: precios.menudeo,
    },
    {
      tipo: "mayoreo",
      label: "Mayoreo",
      valor: precios.mayoreo,
    },
    {
      tipo: "especial",
      label: "Especial",
      valor: precios.especial,
    },
    {
      tipo: "oferta",
      label: "Oferta",
      valor: precios.oferta,
    },
  ].filter((p) => p.valor != null && p.valor > 0)
}



 return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-emerald-600">
            Ventas de Contado
          </h2>
          <p className="text-sm text-muted-foreground">F11 cambia foco</p>
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
      </div>

      {/* GRILLA */}
      <div
        className={`border rounded-md ${
          focusArea === "grilla" ? "ring-2 ring-emerald-500" : ""
        }`}
      >
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th>Cant.</th>
              <th>Código</th>
              <th>Artículo</th>
              <th>Present.</th>
              <th className="text-right">Precio</th>
              {mostrarDescuento && (
                <th className="text-right text-blue-600">Desc %</th>
              )}
              <th className="text-right">Importe</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {items.map((i, index) => (
              <tr key={i.id}>
                <td>
                  <Input
                    data-row={index}
                    data-col="cantidad"
                    value={i.cantidad}
                    onChange={(e) =>
                      actualizarItem(i.id, "cantidad", Number(e.target.value) || 0)
                    }
                    onKeyDown={(e) => manejarTeclas(e, index, "cantidad")}
                    onFocus={() => setActiveCell({ row: index, col: "cantidad" })}
                    className={`h-7 w-[7ch] ${cellActiveClass(index, "cantidad", activeCell)}`}
                  />
                </td>

                <td>
                  <Input
                    data-row={index}
                    data-col="codigoBarras"
                    value={i.codigoBarras}
                    onChange={(e) =>
                      actualizarItem(i.id, "codigoBarras", e.target.value)
                    }
                    onKeyDown={(e) => {
                      manejarTeclas(e, index, "codigoBarras")
                      if (e.key === "Enter") {
                        e.preventDefault()
                        buscarProductoPorCodigo(i.id, i.codigoBarras, index)
                      }
                    }}
                    onFocus={() => setActiveCell({ row: index, col: "codigoBarras" })}
                    className={`h-7 w-[18ch] ${cellActiveClass(index, "codigoBarras", activeCell)}`}
                  />
                </td>

                <td>
               <Input
                  data-row={index}
                  data-col="articulo"
                  value={i.articulo}
                  onChange={(e) => {
                    const texto = e.target.value

                    // 🔎 Siempre buscar (overlay)
                    buscarProductoPorNombre(texto, index)

                    // ✏️ SOLO permitir escritura si AÚN NO hay precios cargados
                    if (!Array.isArray(i.precios) || i.precios.length === 0) {
                      actualizarItem(i.id, "articulo", texto)
                    }
                  }}
                  onKeyDown={(e) => manejarTeclas(e, index, "articulo")}
                  onFocus={() => setActiveCell({ row: index, col: "articulo" })}
                  className={`h-7 w-[30ch] ${cellActiveClass(
                    index,
                    "articulo",
                    activeCell
                  )}`}
                />

                </td>

                <td>
                  <Input value={i.presentacion} disabled className="w-[15ch]" />
                </td>

              <td>
                <Input
                  data-row={index}
                  data-col="precio"
                  value={fmt(i.precio)}
                  readOnly
                  tabIndex={0}
             onKeyDown={(e) => {
                if (mostrarLista) {
                  e.preventDefault()
                  e.stopPropagation()
                  return
                }

                // ABRIR MENÚ DE PRECIOS
                if (e.key.toLowerCase() === "p") {
                  if (!i.precios) return

                  const lista = construirMenuPrecios(i.precios)
                  if (lista.length === 0) return

                  e.preventDefault()
                  e.stopPropagation()

                  setFilaPrecio(index)
                  setPrecioIndex(0)
                  setPreciosProducto(lista)
                  setMostrarPrecios(true)
                  return
                }

                if (!mostrarPrecios) {
                  manejarTeclas(e, index, "precio")
                }
              }}

                  onFocus={() => setActiveCell({ row: index, col: "precio" })}
                  className={`h-7 text-right bg-muted/20 w-[10ch] ${cellActiveClass(
                    index,
                    "precio",
                    activeCell
                  )}`}
                />


              </td>


                {mostrarDescuento && (
                  <td>
                    <Input
                    data-row={index}
                    data-col="descuentoPct"
                    onKeyDown={(e) => manejarTeclas(e, index, "descuentoPct")}
                    onFocus={() => setActiveCell({ row: index, col: "descuentoPct" })}

                      value={i.descuentoPct}
                      onChange={(e) =>
                        actualizarItem(i.id, "descuentoPct", Number(e.target.value) || 0)
                      }
                      className="h-7 text-right text-blue-600 w-[6ch]"
                    />
                  </td>
                )}

                <td className="text-right font-semibold w-[12ch]">
                  ${fmt(i.importe)}
                </td>

                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => eliminarItem(i.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
        />
      </div>

   {mostrarLista && (
  <ListaArticulosPorNombre
    resultados={resultadosNombre}
    selectedIndex={selectedIndexNombre}
    setSelectedIndex={setSelectedIndexNombre}
    onSelect={seleccionarProductoDesdeLista}
    onClose={cerrarListaNombre}
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
