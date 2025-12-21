"use client"

import * as React from "react"
import { Plus, Trash2, ShoppingCart, DollarSign, Receipt, CreditCard, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function VentasContado() {
  const [items, setItems] = React.useState([
    {
      id: 1,
      cantidad: 2,
      codigoBarras: "7501234567890",
      articulo: "Coca Cola 600ml",
      presentacion: "Botella PET",
      precioMenudeo: 15.0,
      iva: 16,
      descuento: 0,
      precio: 15.0,
      importe: 30.0,
    },
  ])

  const [formaPago, setFormaPago] = React.useState("efectivo") // 'efectivo', 'tarjeta', 'ambas'
  const [efectivo, setEfectivo] = React.useState(0)
  const [tarjeta, setTarjeta] = React.useState(0)
  const [focusArea, setFocusArea] = React.useState("grilla") // 'grilla' o 'pago'
  const grillaRef = React.useRef(null)
  const pagoRef = React.useRef(null)

  const subtotal = items.reduce((acc, item) => acc + item.importe, 0)
  const ivaTotal = items.reduce((acc, item) => acc + (item.importe * item.iva) / 100, 0)
  const descuentoTotal = items.reduce((acc, item) => acc + item.descuento, 0)
  const total = subtotal + ivaTotal
  const granTotal = total - descuentoTotal

  const totalRecibido = formaPago === "efectivo" ? efectivo : formaPago === "tarjeta" ? tarjeta : efectivo + tarjeta
  const cambio = Math.max(0, totalRecibido - granTotal)

  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "F11") {
        e.preventDefault()
        setFocusArea((prev) => {
          const newArea = prev === "grilla" ? "pago" : "grilla"
          setTimeout(() => {
            if (newArea === "grilla" && grillaRef.current) {
              const firstInput = grillaRef.current.querySelector("input")
              firstInput?.focus()
            } else if (newArea === "pago" && pagoRef.current) {
              const firstInput = pagoRef.current.querySelector("input")
              firstInput?.focus()
            }
          }, 100)
          return newArea
        })
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  const agregarItem = () => {
    const nuevoItem = {
      id: items.length + 1,
      cantidad: 1,
      codigoBarras: "",
      articulo: "",
      presentacion: "",
      precioMenudeo: 0,
      iva: 16,
      descuento: 0,
      precio: 0,
      importe: 0,
    }
    setItems([...items, nuevoItem])
  }

  const eliminarItem = (id) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const actualizarItem = (id, campo, valor) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const itemActualizado = { ...item, [campo]: valor }
          if (campo === "cantidad" || campo === "precio") {
            itemActualizado.importe = itemActualizado.cantidad * itemActualizado.precio
          }
          return itemActualizado
        }
        return item
      }),
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            Ventas de Contado
          </h2>
          <p className="text-muted-foreground mt-1">Registra ventas en efectivo - Presiona F11 para cambiar foco</p>
        </div>
        <Button onClick={agregarItem} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500">
          <Plus className="w-4 h-4" />
          Agregar Producto
        </Button>
      </div>

      <div
        ref={grillaRef}
        className={`bg-card border rounded-lg overflow-hidden shadow-sm transition-all duration-500 ${
          focusArea === "grilla" ? "ring-2 ring-emerald-500/50 shadow-emerald-500/20 shadow-lg" : ""
        }`}
      >
        <div className="flex">
          {/* Columnas con scroll (Cantidad, Código Barras, Artículo) */}
          <div className="overflow-x-auto border-r border-border">
            <table className="border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold w-20">Cant.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold w-32">Cód. Barras</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold w-48">Artículo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-muted/30 ${index % 2 === 0 ? "bg-transparent" : "bg-muted/10"}`}
                  >
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(item.id, "cantidad", Number.parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        min="1"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="text"
                        value={item.codigoBarras}
                        onChange={(e) => actualizarItem(item.id, "codigoBarras", e.target.value)}
                        className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        maxLength={20}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="text"
                        value={item.articulo}
                        onChange={(e) => actualizarItem(item.id, "articulo", e.target.value)}
                        className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        maxLength={40}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Columnas congeladas */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold w-32">Presentación</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold w-24">P. Menudeo</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold w-20">IVA %</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold w-24">Desc.</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold w-24">Precio</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold w-28">Importe</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-muted/30 ${index % 2 === 0 ? "bg-transparent" : "bg-muted/10"}`}
                  >
                    <td className="px-2 py-1">
                      <Input
                        type="text"
                        value={item.presentacion}
                        onChange={(e) => actualizarItem(item.id, "presentacion", e.target.value)}
                        className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        maxLength={30}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        value={item.precioMenudeo}
                        onChange={(e) => {
                          const valor = Number.parseFloat(e.target.value) || 0
                          actualizarItem(item.id, "precioMenudeo", valor)
                          actualizarItem(item.id, "precio", valor)
                        }}
                        className="h-8 text-xs text-right border-0 bg-transparent focus-visible:ring-1"
                        step="0.01"
                        max="99999.99"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        value={item.iva}
                        onChange={(e) => actualizarItem(item.id, "iva", Number.parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right border-0 bg-transparent focus-visible:ring-1 opacity-70"
                        step="0.01"
                        max="999.99"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        value={item.descuento}
                        onChange={(e) => actualizarItem(item.id, "descuento", Number.parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right border-0 bg-transparent focus-visible:ring-1 opacity-70"
                        step="0.01"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        value={item.precio}
                        onChange={(e) => actualizarItem(item.id, "precio", Number.parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right border-0 bg-transparent focus-visible:ring-1"
                        step="0.01"
                        max="99999.99"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold">${item.importe.toFixed(2)}</td>
                    <td className="px-2 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => eliminarItem(item.id)}
                        className="hover:bg-destructive/10 hover:text-destructive h-7 w-7"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Resumen del Ticket y Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Resumen del Ticket</h3>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-sm">Subtotal:</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1 opacity-60">
              <span className="text-muted-foreground text-sm">IVA:</span>
              <span className="font-semibold">${ivaTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-sm">Total:</span>
              <span className="font-semibold">${total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1 opacity-60">
              <span className="text-muted-foreground text-sm">Descuento:</span>
              <span className="font-semibold text-destructive">-${descuentoTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="text-lg font-bold">Gran Total:</span>
              <span className="text-2xl font-bold text-primary">${granTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div
          ref={pagoRef}
          className={`bg-card border rounded-lg p-6 space-y-4 transition-all duration-500 ${
            focusArea === "pago" ? "ring-2 ring-emerald-500/50 shadow-emerald-500/20 shadow-lg" : ""
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold">Forma de Pago</h3>
          </div>

          {/* Botones de selección de forma de pago */}
          <div className="flex gap-2">
            <Button
              variant={formaPago === "efectivo" ? "default" : "outline"}
              onClick={() => setFormaPago("efectivo")}
              className="flex-1 gap-2"
            >
              <Wallet className="w-4 h-4" />
              Efectivo
            </Button>
            <Button
              variant={formaPago === "tarjeta" ? "default" : "outline"}
              onClick={() => setFormaPago("tarjeta")}
              className="flex-1 gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Tarjeta
            </Button>
            <Button
              variant={formaPago === "ambas" ? "default" : "outline"}
              onClick={() => setFormaPago("ambas")}
              className="flex-1 gap-2"
            >
              Ambas
            </Button>
          </div>

          <div className="space-y-3">
            {(formaPago === "efectivo" || formaPago === "ambas") && (
              <div>
                <Label htmlFor="efectivo" className="text-sm font-medium mb-1 block">
                  Efectivo Recibido:
                </Label>
                <Input
                  id="efectivo"
                  type="number"
                  value={efectivo}
                  onChange={(e) => setEfectivo(Number.parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold h-11"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            )}

            {(formaPago === "tarjeta" || formaPago === "ambas") && (
              <div>
                <Label htmlFor="tarjeta" className="text-sm font-medium mb-1 block">
                  Monto con Tarjeta:
                </Label>
                <Input
                  id="tarjeta"
                  type="number"
                  value={tarjeta}
                  onChange={(e) => setTarjeta(Number.parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold h-11"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            )}

            {formaPago !== "tarjeta" && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Cambio:</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${cambio.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button className="w-full h-11 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Procesar Venta
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
