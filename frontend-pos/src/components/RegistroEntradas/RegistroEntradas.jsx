"use client"

import { useState, useEffect, useRef } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import OverlayProductosPorNombre from "./OverlayProductosPorNombre"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
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
   REGISTRO ENTRADAS
====================================================== */
export default function RegistroEntradas() {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const user = useAuthStore((s) => s.user)
  const id_user = user?.id
  const nickname_user = user?.nickname

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

      // Fecha local YYYY-MM-DD (sin desfase UTC)
      const fecha = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

      // Hora local HH:MM:SS
      const hora = d.toLocaleTimeString('es-MX', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      setFechaHora({ fecha, hora });
    }

    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  /* ================= BUSCAR POR NOMBRE ================= */
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
      if (!res.ok) return toast("Producto no encontrado")

      const data = await res.json()
      setProductoTmp(data)
      setCantidad("")
    } catch (err) {
      console.error(err)
      toast.error("Error al buscar")
    }
  }

  /* ================= AGREGAR ================= */
  const agregarProducto = () => {
    if (!productoTmp || !cantidad || Number(cantidad) <= 0) {
      toast.error("Cantidad inválida")
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
    setTimeout(() => {
      refNombre.current?.focus()
    }, 0)
  }

  const eliminar = (id) => {
    setProductos((prev) => prev.filter((p) => p._rowId !== id))
  }

  /* ================= CANCELAR (RESET REAL) ================= */
  const cancelarEntrada = () => {
    setTipoEntrada("")
    setComentarios("")
    setProductos([])
    limpiarBusqueda()
  }

  /* ================= GUARDAR ================= */
  const guardarEntrada = async () => {
    if (!tipoEntrada) {
      toast.error("Seleccione el tipo de entrada")
      return
    }

    if (productos.length === 0) {
      toast.error("Agregue al menos un producto")
      return
    }

    const payload = {
      entry_type: "ENTRADA",
      comments: comentarios,
      date: fechaHora.fecha,
      time: fechaHora.hora,
      id_user,
      nickname_user,
      movement_reason: tipoEntrada,
      items: productos.map((p) => ({
        product_id: p.id,
        quantity: p.cantidad_entrada,
      })),
    }

    try {
      const res = await fetch(`${API_URL}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar")
      }

      toast.success("Entrada registrada correctamente ✅")
      cancelarEntrada()
    } catch (err) {
      toast.error(err.message)
    }
  }

  /* ================= CONFIRM DIALOG ================= */
  const solicitarCancelacion = () => {
    if (productos.length === 0) {
      cancelarEntrada()
      return
    }
    setConfirmOpen(true)
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
              <option value="">SELECCIONE</option>
              <option value="COMPRA_PROVEEDOR">COMPRA A PROVEEDOR</option>
              <option value="DEVOLUCION_CLIENTE">DEVOLUCIÓN DE CLIENTE</option>
              <option value="TRASPASO_ENTRADA">ENTRADA POR TRASPASO</option>
              <option value="AJUSTE_POSITIVO">AJUSTE POSITIVO DE INVENTARIO</option>
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
                    setBuscarNombre(e.target.value.toUpperCase())
                    buscarPorNombre(e.target.value.toUpperCase())
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
                  onChange={(e) => setBuscarCodigo(e.target.value.toUpperCase())}
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

        <Card className="p-5 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            className="h-11"
          >
            Cancelar
          </Button>

          <Button
            onClick={guardarEntrada}
            className="h-11 bg-blue-600 hover:bg-blue-700"
          >
            Guardar Entrada
          </Button>
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Cancelar la entrada?"
        description="Se perderán los cambios no guardados."
        confirmText="Sí, cancelar"
        cancelText="No"
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          cancelarEntrada()
        }}
      />
    </div>
  )
}