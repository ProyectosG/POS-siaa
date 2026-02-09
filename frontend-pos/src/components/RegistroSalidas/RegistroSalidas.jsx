"use client"

import { useState, useEffect, useRef } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import OverlayProductos from "@/components/siaa-ui/OverlayProductos";
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { Search, Plus, Trash2, PackageMinus, Barcode } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function RegistroSalidas() {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const user = useAuthStore((s) => s.user)
  const id_user = user?.id
  const nickname_user = user?.nickname

  const [tipoSalida, setTipoSalida] = useState("")
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
      const fecha =
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
      const hora = d.toLocaleTimeString("es-MX", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      setFechaHora({ fecha, hora })
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
      const res = await fetch(`${API_URL}/products/search?query=${encodeURIComponent(texto)}`)
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
      setResultadosNombre(normalizados)
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
      const res = await fetch(`${API_URL}/products/barcode/${buscarCodigo}`)
      if (!res.ok) return toast.error("Producto no encontrado")
      const data = await res.json()
      setProductoTmp({
        ...data,
        codigo_barras: data.codigo_barras || data.codigo,
        articulo: data.articulo || data.name,
        presentacion: data.presentacion || data.presentation,
        stock: Number(data.stock ?? data.quantity ?? 0)
      })
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
    if (Number(cantidad) > productoTmp.stock) {
      toast.error("La cantidad excede el stock disponible")
      return
    }
    setProductos(prev => [
      ...prev,
      { ...productoTmp, cantidad_salida: Number(cantidad), _rowId: Date.now() }
    ])
    limpiarBusqueda()
  }

  const limpiarBusqueda = () => {
    setBuscarNombre("")
    setBuscarCodigo("")
    setProductoTmp(null)
    setCantidad("")
    setMostrarOverlay(false)
    setTimeout(() => { refNombre.current?.focus() }, 0)
  }

  const eliminar = (id) => {
    setProductos(prev => prev.filter(p => p._rowId !== id))
  }

  /* ================= CANCELAR ================= */
  const cancelarSalida = () => {
    setTipoSalida("")
    setComentarios("")
    setProductos([])
    limpiarBusqueda()
  }

  /* ================= GUARDAR ================= */
  const guardarSalida = async () => {
    if (!tipoSalida) return toast.error("Seleccione el tipo de salida")
    if (productos.length === 0) return toast.error("Agregue al menos un producto")
    const payload = {
      out_type: "SALIDA",
      comments: comentarios,
      date: fechaHora.fecha,
      time: fechaHora.hora,
      id_user,
      nickname_user,
      movement_reason: tipoSalida,
      items: productos.map(p => ({ product_id: p.id, quantity: p.cantidad_salida })),
    }
    try {
      const res = await fetch(`${API_URL}/outs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar")
      }
      toast.success("Salida registrada correctamente ✅")
      cancelarSalida()
    } catch (err) {
      toast.error(err.message)
    }
  }

  /* ================= CONFIRM ================= */
  const solicitarCancelacion = () => {
    if (productos.length === 0) { cancelarSalida(); return }
    setConfirmOpen(true)
  }

  /* ================= MANEJAR SELECCIÓN DEL OVERLAY ================= */
  const handleSeleccionProducto = (producto) => {
    if (!producto) return
    setProductoTmp(producto)
    setCantidad("")
    setMostrarOverlay(false)
    setTimeout(() => refCodigo.current?.focus(), 0)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <PackageMinus className="w-8 h-8 text-red-600" />
              Registro de Salidas
            </h1>
            <p className="text-slate-600">Descargos de inventario</p>
          </div>
          <div className="text-right">
            <p className="text-sm">{fechaHora.fecha}</p>
            <p className="font-semibold">{fechaHora.hora}</p>
          </div>
        </div>

        {/* TIPO + COMENTARIOS */}
        <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Tipo de salida *</label>
            <select
              value={tipoSalida}
              onChange={(e) => setTipoSalida(e.target.value)}
              className="w-full h-11 border rounded-md px-3"
            >
              <option value="">SELECCIONE</option>
              <option value="TRASPASO_SUCURSAL">TRASPASO A SUCURSAL</option>
              <option value="AJUSTE_NEGATIVO">AJUSTE DE INVENTARIO</option>
              <option value="DEVOLUCION_PROVEEDOR">DEVOLUCIÓN A PROVEEDOR</option>
              <option value="CONSUMO_INTERNO">CONSUMO INTERNO</option>
              <option value="MERMA">MERMA (DAÑO O CADUCIDAD)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Comentarios</label>
            <Input value={comentarios} onChange={(e) => setComentarios(e.target.value)} className="h-11" />
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
                    const val = e.target.value.toUpperCase()
                    setBuscarNombre(val)
                    buscarPorNombre(val)
                  }}
                />
                <Button size="icon"><Search className="w-4 h-4" /></Button>
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
                <Button onClick={buscarPorCodigo} size="icon"><Barcode className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          {productoTmp && (
            <div className="grid grid-cols-7 gap-3 bg-slate-50 p-4 rounded-md text-sm">
              <div><p className="text-xs">Código</p><p className="font-semibold">{productoTmp.codigo_barras}</p></div>
              <div className="col-span-2"><p className="text-xs">Producto</p><p className="font-semibold">{productoTmp.articulo}</p></div>
              <div><p className="text-xs">Presentación</p><p>{productoTmp.presentacion}</p></div>
              <div><p className="text-xs">Stock</p><p className="font-semibold">{productoTmp.stock}</p></div>
              <div className="flex gap-2">
                <Input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="h-9" />
                <Button onClick={agregarProducto} className="h-9 bg-red-600"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </Card>

        {/* GRILLA */}
        <Card className="p-5">
          {productos.length === 0 ? (
            <p className="text-center text-slate-500">No hay productos agregados</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th>Código</th><th>Producto</th><th>Presentación</th><th className="text-right">Cantidad</th><th></th></tr></thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p._rowId} className="border-b">
                    <td>{p.codigo_barras}</td>
                    <td>{p.articulo}</td>
                    <td>{p.presentacion}</td>
                    <td className="text-right font-semibold">{p.cantidad_salida}</td>
                    <td className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => eliminar(p._rowId)} className="text-red-600">
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
          <Button variant="outline" onClick={solicitarCancelacion} className="h-11">Cancelar</Button>
          <Button onClick={guardarSalida} className="h-11 bg-red-600 hover:bg-red-700">Guardar Salida</Button>
        </Card>
      </div>

      {/* OVERLAY */}
      {mostrarOverlay && (
        <OverlayProductos
          resultados={resultadosNombre} // ✅ aquí van los resultados de búsqueda
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Cancelar la salida?"
        description="Se perderán los cambios no guardados."
        confirmText="Sí, cancelar"
        cancelText="No"
        destructive
        onConfirm={() => { setConfirmOpen(false); cancelarSalida() }}
      />
    </div>
  )
}
