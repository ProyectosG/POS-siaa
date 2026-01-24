"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Search,
  Plus,
  Trash2,
  Package,
  Barcode,
} from "lucide-react"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL

/* ======================================================
   OVERLAY PRODUCTOS POR NOMBRE
====================================================== */
function OverlayProductosPorNombre({
  resultados = [],
  selectedIndex,
  setSelectedIndex,
  onSelect,
  onClose,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) =>
          Math.min(i + 1, resultados.length - 1)
        )
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }

      if (e.key === "Enter") {
        e.preventDefault()
        const prod = resultados[selectedIndex]
        if (prod) onSelect(prod)
      }

      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handler)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handler)
    }
  }, [resultados, selectedIndex, setSelectedIndex, onSelect, onClose])

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 w-[820px] max-h-[420px] bg-white rounded-xl border shadow-2xl overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/40 font-semibold text-sm">
          Resultados por nombre
        </div>

        <div className="max-h-[340px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Artículo</th>
                <th className="px-3 py-2 text-left">Presentación</th>
                <th className="px-3 py-2 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((p, i) => (
                <tr
                  key={`${p.id}-${i}`}
                  onClick={() => onSelect(p)}
                  className={cn(
                    "cursor-pointer",
                    i === selectedIndex
                      ? "bg-emerald-100 ring-1 ring-emerald-400"
                      : "hover:bg-muted/40"
                  )}
                >
                  <td className="px-3 py-2 font-mono">
                    {p.codigo_barras || "-"}
                  </td>
                  <td className="px-3 py-2">{p.articulo}</td>
                  <td className="px-3 py-2">{p.presentacion}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {p.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          ↑ ↓ navegar · Enter seleccionar · Esc cerrar
        </div>
      </div>
    </>
  )
}

/* ======================================================
   REGISTRO ENTRADAS
====================================================== */
export default function RegistroEntradas() {
  const [tipoEntrada, setTipoEntrada] = useState("")
  const [comentarios, setComentarios] = useState("")

  const [buscarNombre, setBuscarNombre] = useState("")
  const [buscarCodigo, setBuscarCodigo] = useState("")

  const [productoTmp, setProductoTmp] = useState(null)
  const [cantidad, setCantidad] = useState("")
  const [productos, setProductos] = useState([])

  const [fechaHora, setFechaHora] = useState({ fecha: "", hora: "" })

  /* Overlay */
  const [mostrarOverlay, setMostrarOverlay] = useState(false)
  const [resultadosNombre, setResultadosNombre] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const refNombre = useRef(null)
  const refCodigo = useRef(null)

  /* ================= FECHA / HORA ================= */
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setFechaHora({
        fecha: d.toISOString().split("T")[0],
        hora: d.toTimeString().slice(0, 5),
      })
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])


/* ================= BUSCAR POR NOMBRE (OVERLAY) ================= */
const buscarPorNombre = async (texto) => {
  if (!texto || texto.length < 2) {
    setMostrarOverlay(false)
    setResultadosNombre([])
    return
  }

  try {
    const res = await fetch(
      `${API_URL}/products/search?query=${encodeURIComponent(texto)}`
    )
    if (!res.ok) return

    const data = await res.json()
    console.log(data)

    setResultadosNombre(data)
    setSelectedIndex(0)
    setMostrarOverlay(true)
  } catch (err) {
    console.error(err)
  }
}



  /* ================= BUSCAR POR CÓDIGO ================= */
  const buscarPorCodigo = async () => {
    if (!buscarCodigo.trim()) return

    try {
      const res = await fetch(
        `${API_URL}/products/barcode/${buscarCodigo}`
      )
      if (!res.ok) return alert("Producto no encontrado")


      console.log(data)
      setProductoTmp(data)
      setCantidad("")
    } catch (err) {
      console.error(err)
      alert("Error al buscar")
    }
  }

  /* ================= AGREGAR ================= */
  const agregarProducto = () => {
    if (!productoTmp || !cantidad || Number(cantidad) <= 0) {
      alert("Cantidad inválida")
      return
    }

    setProductos((prev) => [
      ...prev,
      {
        ...productoTmp,
        cantidad_entrada: Number(cantidad),
        _rowId: Date.now(),
      },
    ])

    limpiarBusqueda()
  }

  const limpiarBusqueda = () => {
    setBuscarNombre("")
    setBuscarCodigo("")
    setProductoTmp(null)
    setCantidad("")
    refNombre.current?.focus()
  }

  const eliminar = (id) => {
    setProductos((prev) => prev.filter((p) => p._rowId !== id))
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="w-8 h-8 text-blue-600" />
              Registro de Entradas
            </h1>
            <p className="text-slate-600">Captura de inventario</p>
          </div>
          <div className="text-right">
            <p className="text-sm">{fechaHora.fecha}</p>
            <p className="font-semibold">{fechaHora.hora}</p>
          </div>
        </div>

        {/* TIPO + COMENTARIOS */}
        <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Tipo de entrada *</label>
            <select
              value={tipoEntrada}
              onChange={(e) => setTipoEntrada(e.target.value)}
              className="w-full h-11 border rounded-md px-3"
            >
              <option value="">Seleccione</option>
              <option value="ajuste">Ajuste de Inventario</option>
              <option value="traspaso">Traspaso</option>
              <option value="devolucion">Devolución</option>
              <option value="compra">Compra</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Comentarios</label>
            <Input
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              className="h-11"
            />
          </div>
        </Card>

        {/* BUSCADORES */}
        <Card className="p-5 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs">Buscar por nombre</label>
              <div className="flex gap-2">
                <Input
               
                    ref={refNombre}
                    value={buscarNombre}
                    onChange={(e) => {
                      setBuscarNombre(e.target.value)
                      buscarPorNombre(e.target.value)
                    }}
                  />
                <Button onClick={buscarPorNombre} size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="w-64">
              <label className="text-xs">Código</label>
              <div className="flex gap-2">
                <Input
                  ref={refCodigo}
                  value={buscarCodigo}
                  onChange={(e) => setBuscarCodigo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarPorCodigo()}
                />
                <Button onClick={buscarPorCodigo} size="icon">
                  <Barcode className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {productoTmp && (
            <div className="grid grid-cols-7 gap-3 bg-slate-50 p-4 rounded-md text-sm">
              <div>
                <p className="text-xs">Código</p>
                <p className="font-semibold">{productoTmp.codigo_barras}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs">Producto</p>
                <p className="font-semibold">{productoTmp.articulo}</p>
              </div>
              <div>
                <p className="text-xs">Presentación</p>
                <p>{productoTmp.presentacion}</p>
              </div>
              <div>
                <p className="text-xs">Stock</p>
                <p className="font-semibold">{productoTmp.stock}</p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="h-9"
                />
                <Button
                  onClick={agregarProducto}
                  className="h-9 bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* GRILLA */}
        <Card className="p-5">
          {productos.length === 0 ? (
            <p className="text-center text-slate-500">
              No hay productos agregados
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Presentación</th>
                  <th className="text-right">Cantidad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p._rowId} className="border-b">
                    <td>{p.codigo_barras}</td>
                    <td>{p.articulo}</td>
                    <td>{p.presentacion}</td>
                    <td className="text-right font-semibold">
                      {p.cantidad_entrada}
                    </td>
                    <td className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminar(p._rowId)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {mostrarOverlay && (
        <OverlayProductosPorNombre
          resultados={resultadosNombre}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          onSelect={(p) => {
            setProductoTmp(p)
            setMostrarOverlay(false)
            setCantidad("")
            refNombre.current?.focus()
          }}
          onClose={() => setMostrarOverlay(false)}
        />
      )}
    </div>
  )
}
