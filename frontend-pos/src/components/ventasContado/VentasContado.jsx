"use client"

import * as React from "react"
import { useVentasContado } from "./hooks/useVentasContado"
import { useGridNavigation } from "./hooks/useGridNavigation"

import Resumen from "./Resumen"
import Pago from "./Pago"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

const API_URL = process.env.NEXT_PUBLIC_API_URL

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

  /* ===== COLUMNAS NAVEGABLES ===== */
  const columnas = React.useMemo(() => {
    const base = ["cantidad", "codigoBarras", "articulo", "precio"]
    if (mostrarDescuento) base.push("descuentoPct")
    return base
  }, [mostrarDescuento])

  const { activeCell, setActiveCell, manejarTeclas } =
    useGridNavigation({ columnas, items })

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

  /* ===== APLICAR FOCO POST-RENDER ===== */
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

  /* ===== BUSCAR PRODUCTO ===== */
  const buscarProductoPorCodigo = async (itemId, codigo, fila) => {
    if (!codigo) return

    try {
      const res = await fetch(`${API_URL}/products/barcode/${codigo}`)

      // ❌ NO encontrado → mover a Artículo
      if (!res.ok) {
        setTimeout(() => {
          document.querySelector(
            `input[data-row="${fila}"][data-col="articulo"]`
          )?.focus()
        }, 0)
        return
      }

      // ✅ ENCONTRADO
      const p = await res.json()

      actualizarItem(itemId, "codigoBarras", p.codigo_barras || "")
      actualizarItem(itemId, "articulo", p.articulo || "")
      actualizarItem(itemId, "presentacion", p.presentacion || "")
      actualizarItem(itemId, "precio", Number(p.precio_menudeo) || 0)
      actualizarItem(itemId, "ivaPct", p.iva ? 16 : 0)

      // ➕ nueva fila
      agregarItem()

      // 🎯 foco a código de la nueva fila
      setFocusPendiente({
        row: fila + 1,
        col: "codigoBarras",
      })
    } catch (err) {
      console.error("Error buscando producto:", err)
    }
  }

  const recibido =
    formaPago === "efectivo"
      ? efectivo
      : formaPago === "tarjeta"
      ? tarjeta
      : efectivo + tarjeta

  const cambio = Math.max(0, recibido - granTotal)

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
                      actualizarItem(
                        i.id,
                        "cantidad",
                        Number(e.target.value) || 0
                      )
                    }
                    onKeyDown={(e) =>
                      manejarTeclas(e, index, "cantidad")
                    }
                    onFocus={() =>
                      setActiveCell({ row: index, col: "cantidad" })
                    }
                    className={`h-7 w-[7ch] ${cellActiveClass(
                      index,
                      "cantidad",
                      activeCell
                    )}`}
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
                        buscarProductoPorCodigo(
                          i.id,
                          i.codigoBarras,
                          index
                        )
                      }
                    }}
                    onFocus={() =>
                      setActiveCell({
                        row: index,
                        col: "codigoBarras",
                      })
                    }
                    className={`h-7 w-[18ch] ${cellActiveClass(
                      index,
                      "codigoBarras",
                      activeCell
                    )}`}
                  />
                </td>

                <td>
                  <Input
                    data-row={index}
                    data-col="articulo"
                    value={i.articulo}
                    onChange={(e) =>
                      actualizarItem(i.id, "articulo", e.target.value)
                    }
                    onKeyDown={(e) =>
                      manejarTeclas(e, index, "articulo")
                    }
                    onFocus={() =>
                      setActiveCell({ row: index, col: "articulo" })
                    }
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
                    onChange={() => {}}
                    onKeyDown={(e) =>
                      manejarTeclas(e, index, "precio")
                    }
                    onFocus={() =>
                      setActiveCell({ row: index, col: "precio" })
                    }
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
                      value={i.descuentoPct}
                      onChange={(e) =>
                        actualizarItem(
                          i.id,
                          "descuentoPct",
                          Number(e.target.value) || 0
                        )
                      }
                      onKeyDown={(e) =>
                        manejarTeclas(e, index, "descuentoPct")
                      }
                      onFocus={() =>
                        setActiveCell({
                          row: index,
                          col: "descuentoPct",
                        })
                      }
                      className={`h-7 text-right text-blue-600 w-[6ch] ${cellActiveClass(
                        index,
                        "descuentoPct",
                        activeCell
                      )}`}
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
        />
      </div>
    </div>
  )
}
