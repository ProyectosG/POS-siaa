"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"



const cellActiveClass = (row, col, activeCell) =>
  activeCell.row === row && activeCell.col === col
    ? "ring-2 ring-emerald-500 bg-emerald-50"
    : ""

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function VentaApartadoGrid({
  /* 🔥 CONTROL DE FOCO */
  focusArea,

  items,
  columnas,
  mostrarDescuento,
  activeCell,
  setActiveCell,
  manejarTeclas,

  actualizarItem,
  eliminarItemSeguro,

  buscarProductoPorCodigo,
  buscarProductoPorNombre,
  construirMenuPrecios,

  mostrarLista,
  mostrarPrecios,
  abrirMenuPrecios,
}) {
  const grillaActiva = focusArea === "grilla"

  return (
    <div
      className={`
        rounded-md transition-all duration-300
        ${
          grillaActiva
            ? `
              border-2 bg-gradient-to-r via-pink-100
              ring-4 ring-purple-400/30
              shadow-[0_0_0_3px_rgba(168,85,247,0.25)]
            `
            : `
              border border-neutral-300
              ring-0
              shadow-sm
            `
        }
      `}
    >
   <table className="w-full text-sm">
  <colgroup>
    <col style={{ width: "7ch" }} />
    <col style={{ width: "18ch" }} />
    <col style={{ width: "30ch" }} />
    <col style={{ width: "15ch" }} />
    <col style={{ width: "10ch" }} />
    <col style={{ width: mostrarDescuento ? "6ch" : "0ch" }} />
    <col style={{ width: "12ch" }} />
    <col style={{ width: "4ch" }} />
  </colgroup>

<thead className="bg-muted/40">
  <tr>
    <th className="text-centerpx-3">Cant.</th>
    <th className="text-center px-3">Código</th>
    <th className="text-center px-3">Artículo</th>
    <th className="text-center px-3">Presentacion</th>
    <th className="text-center px-3">Precio</th>
    {mostrarDescuento && (
      <th className="text-right px-3 text-blue-600">Desc %</th>
    )}
    <th className="text-right px-3">Importe</th>
    <th />
  </tr>
</thead>


        <tbody>
          {items.map((i, index) => (
            <tr key={i.id}>
              {/* CANTIDAD */}
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
                  className={`h-7 w-[7ch] ${cellActiveClass(
                    index,
                    "cantidad",
                    activeCell
                  )}`}
                />
              </td>

              {/* CÓDIGO */}
              <td>
                <Input
                  data-row={index}
                  data-col="codigoBarras"
                  value={i.codigoBarras}
                  onChange={(e) =>
                    actualizarItem(i.id, "codigoBarras", e.target.value.toUpperCase())
                  }
                  onKeyDown={(e) => {
                    manejarTeclas(e, index, "codigoBarras")
                    if (e.key === "Enter") {
                      e.preventDefault()
                      buscarProductoPorCodigo(i.id, i.codigoBarras, index)
                    }
                  }}
                  onFocus={() =>
                    setActiveCell({ row: index, col: "codigoBarras" })
                  }
                  className={`h-7 w-[18ch] ${cellActiveClass(
                    index,
                    "codigoBarras",
                    activeCell
                  )}`}
                />
              </td>

              {/* ARTÍCULO */}
              <td>
                <Input
                  data-row={index}
                  data-col="articulo"
                  value={i.articulo}
                  onChange={(e) => {
                    buscarProductoPorNombre(e.target.value.toUpperCase(), index)
                    if (!i.precios || i.precios.length === 0) {
                      actualizarItem(i.id, "articulo", e.target.value.toUpperCase())
                    }
                  }}
                  onKeyDown={(e) => manejarTeclas(e, index, "articulo")}
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
                <Input
                  value={i.presentacion}
                  disabled
                  className="w-[15ch]"
                />
              </td>

              {/* PRECIO */}
              <td>
                <Input
                  data-row={index}
                  data-col="precio"
                  value={fmt(i.precio)}
                  readOnly
                  onKeyDown={(e) => {
                    if (mostrarLista) {
                      e.preventDefault()
                      return
                    }
                    if (e.key.toLowerCase() === "p") {
                      abrirMenuPrecios(index, i.precios)
                    } else if (!mostrarPrecios) {
                      manejarTeclas(e, index, "precio")
                    }
                  }}
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
                    className="h-7 text-right text-blue-600 w-[6ch]"
                  />
                </td>
              )}

              <td className="text-right font-semibold w-[12ch]">
                ${fmt(i.importe)}
              </td>

             <td className="pl-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => eliminarItemSeguro(i.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
