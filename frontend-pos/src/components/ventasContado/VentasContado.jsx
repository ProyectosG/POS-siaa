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

/* =========================
   UTILIDADES
========================= */
const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/* =========================
   COMPONENTE
========================= */
export default function VentasContado() {
  /* ===== NEGOCIO ===== */
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

  /* ===== PAGO ===== */
  const [formaPago, setFormaPago] = React.useState("efectivo")
  const [efectivo, setEfectivo] = React.useState(0)
  const [tarjeta, setTarjeta] = React.useState(0)

  /* ===== FOCO GENERAL ===== */
  const [focusArea, setFocusArea] = React.useState("grilla")

  /* ===== COLUMNAS (ANTES DEL HOOK) ===== */
  const columnas = React.useMemo(() => {
    const base = ["cantidad", "codigoBarras", "articulo", "precio"]
    if (mostrarDescuento) base.push("descuento")
    return base
  }, [mostrarDescuento])

  /* ===== NAVEGACIÓN ===== */
  const { activeCell, setActiveCell, manejarTeclas } =
    useGridNavigation({ columnas, items })

  /* =========================
     ATAJO F11
  ========================= */
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

  /* =========================
     CÁLCULOS
  ========================= */
  const recibido =
    formaPago === "efectivo"
      ? efectivo
      : formaPago === "tarjeta"
      ? tarjeta
      : efectivo + tarjeta

  const cambio = Math.max(0, recibido - granTotal)

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-emerald-600">
            Ventas de Contado
          </h2>
          <p className="text-sm text-muted-foreground">
            F11 cambia foco
          </p>
        </div>

        <Button
          onClick={agregarItem}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </Button>
      </div>

      {/* TOGGLE DESCUENTO */}
      <div className="flex items-center gap-3">
        <Switch
          checked={mostrarDescuento}
          onCheckedChange={setMostrarDescuento}
        />
        <span className="text-sm">Mostrar descuentos</span>
      </div>

      {/* GRILLA */}
      <div
        className={`border rounded-md overflow-hidden ${
          focusArea === "grilla" ? "ring-2 ring-emerald-500" : ""
        }`}
      >
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-1 w-14 text-center">Cant.</th>
              <th className="p-1 w-36">Código</th>
              <th className="p-1">Artículo</th>
              <th className="p-1 w-28">Present.</th>
              <th className="p-1 w-24 text-right">Precio</th>
              {mostrarDescuento && (
                <>
                  <th className="p-1 w-20 text-right text-blue-600">
                    Desc %
                  </th>
                  <th className="p-1 w-24 text-right text-blue-600">
                    Precio c/desc
                  </th>
                </>
              )}
              <th className="p-1 w-28 text-right">Importe</th>
              <th className="p-1 w-10"></th>
            </tr>
          </thead>

          <tbody>
            {items.map((i, index) => (
              <tr key={i.id} className="hover:bg-muted/20">
                {/* Cantidad */}
                <td className="p-[2px]">
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
                    className={`h-7 text-center ${
                      activeCell.row === index &&
                      activeCell.col === "cantidad"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  />
                </td>

                {/* Código */}
                <td className="p-[2px]">
                  <Input
                    data-row={index}
                    data-col="codigoBarras"
                    value={i.codigoBarras}
                    onChange={(e) =>
                      actualizarItem(
                        i.id,
                        "codigoBarras",
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      manejarTeclas(e, index, "codigoBarras")
                    }
                    onFocus={() =>
                      setActiveCell({
                        row: index,
                        col: "codigoBarras",
                      })
                    }
                    className={`h-7 ${
                      activeCell.row === index &&
                      activeCell.col === "codigoBarras"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  />
                </td>

                {/* Artículo */}
                <td className="p-[2px]">
                  <Input
                    data-row={index}
                    data-col="articulo"
                    value={i.articulo}
                    onChange={(e) =>
                      actualizarItem(
                        i.id,
                        "articulo",
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      manejarTeclas(e, index, "articulo")
                    }
                    onFocus={() =>
                      setActiveCell({ row: index, col: "articulo" })
                    }
                    className={`h-7 ${
                      activeCell.row === index &&
                      activeCell.col === "articulo"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  />
                </td>

                {/* Presentación */}
                <td className="p-[2px]">
                  <Input
                    value={i.presentacion}
                    disabled
                    className="h-7"
                  />
                </td>

                {/* Precio */}
                <td className="p-[2px]">
                  <Input
                    data-row={index}
                    data-col="precio"
                    value={fmt(i.precio)}
                    readOnly
                    onKeyDown={(e) =>
                      manejarTeclas(e, index, "precio")
                    }
                    onFocus={() =>
                      setActiveCell({ row: index, col: "precio" })
                    }
                    className={`h-7 text-right bg-muted/20 ${
                      activeCell.row === index &&
                      activeCell.col === "precio"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  />
                </td>

                {/* Descuento */}
                {mostrarDescuento && (
                  <>
                    <td className="p-[2px]">
                      <Input
                        data-row={index}
                        data-col="descuento"
                        value={i.descuentoPct}
                        onChange={(e) =>
                          actualizarItem(
                            i.id,
                            "descuentoPct",
                            Number(e.target.value) || 0
                          )
                        }
                        onKeyDown={(e) =>
                          manejarTeclas(e, index, "descuento")
                        }
                        onFocus={() =>
                          setActiveCell({
                            row: index,
                            col: "descuento",
                          })
                        }
                        className={`h-7 text-right text-blue-600 ${
                          activeCell.row === index &&
                          activeCell.col === "descuento"
                            ? "ring-2 ring-emerald-500 bg-emerald-50"
                            : ""
                        }`}
                      />
                    </td>

                    <td className="p-[2px]">
                      <Input
                        value={fmt(i.precioConDesc)}
                        readOnly
                        className="h-7 text-right bg-muted/20"
                      />
                    </td>
                  </>
                )}

                {/* Importe */}
                <td className="p-1 text-right font-semibold">
                  ${fmt(i.importe)}
                </td>

                {/* Eliminar */}
                <td className="p-[2px] text-center">
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

      {/* RESUMEN + PAGO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
