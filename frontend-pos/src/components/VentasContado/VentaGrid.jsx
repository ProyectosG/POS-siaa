"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSettingsStore } from "@/store/useSettingsStore"
import toast from "react-hot-toast"

const cellActiveClass = (row, col, activeCell) =>
  activeCell.row === row && activeCell.col === col
    ? "ring-2 ring-emerald-500 bg-emerald-50"
    : ""

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function VentaGrid({
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
  abrirMenuPrecios,
  mostrarLista,
  mostrarPrecios,
}) {
  const grillaActiva = focusArea === "grilla"
  const settings = useSettingsStore((s) => s.settings)

  return (
    <div
      className={`
        rounded-md transition-all duration-300
        ${
          grillaActiva
            ? `border-2 border-emerald-500 ring-4 ring-emerald-400/30 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]`
            : `border border-neutral-300 ring-0 shadow-sm`
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
            <th className="text-center px-3">Cant.</th>
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
            <tr key={i.id} className={i.stock <= 0 ? "bg-rose-50/30" : ""}>
              {/* CANTIDAD */}
              <td>
                <Input
                  data-row={index}
                  data-col="cantidad"
                  value={i.cantidad}
                  onFocus={(e) => {
                    e.target.select(); // Selecciona todo al entrar
                    setActiveCell({ row: index, col: "cantidad" });
                  }}
                  onChange={(e) => {
                    const nuevaCant = Number(e.target.value) || 0;
                    const stockDisponible = Number(i.stock) || 0;
                    if (nuevaCant > stockDisponible && !settings?.allow_negative_balance) {
                        toast.error(`Stock insuficiente: ${stockDisponible} disponibles`);
                        return;
                    }
                    actualizarItem(i.id, "cantidad", nuevaCant);
                  }}
                  onKeyDown={(e) => manejarTeclas(e, index, "cantidad")}
                  className={`h-7 w-[7ch] ${cellActiveClass(index, "cantidad", activeCell)}`}
                />
              </td>

              {/* CÓDIGO */}
              <td>
                <Input
                  data-row={index}
                  data-col="codigoBarras"
                  value={i.codigoBarras}
                  onFocus={(e) => {
                    e.target.select();
                    setActiveCell({ row: index, col: "codigoBarras" });
                  }}
                  onChange={(e) => actualizarItem(i.id, "codigoBarras", e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    manejarTeclas(e, index, "codigoBarras")
                    if (e.key === "Enter") {
                      e.preventDefault()
                      buscarProductoPorCodigo(i.id, i.codigoBarras, index)
                    }
                  }}
                  className={`h-7 w-[18ch] ${cellActiveClass(index, "codigoBarras", activeCell)}`}
                />
              </td>

              {/* ARTÍCULO - CORRECCIÓN PARA BORRAR */}
              <td>
                <Input
                  data-row={index}
                  data-col="articulo"
                  value={i.articulo}
                  onFocus={(e) => {
                    e.target.select();
                    setActiveCell({ row: index, col: "articulo" });
                  }}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    // 1. Actualizamos el item siempre para que el input responda al teclado
                    actualizarItem(i.id, "articulo", val);
                    
                    // 2. Solo disparamos la búsqueda si hay contenido para no trabar el borrado
                    if (val.trim().length > 0) {
                        buscarProductoPorNombre(val, index);
                    }
                  }}
                  onKeyDown={(e) => manejarTeclas(e, index, "articulo")}
                  className={`h-7 w-[30ch] ${cellActiveClass(index, "articulo", activeCell)}`}
                />
              </td>

              <td>
                <Input value={i.presentacion} disabled className="w-[15ch] h-7 text-[10px] uppercase font-bold" />
              </td>

              {/* PRECIO */}
              <td>
                <Input
                  data-row={index}
                  data-col="precio"
                  value={fmt(i.precio)}
                  readOnly
                  onKeyDown={(e) => {
                    if (mostrarLista) { e.preventDefault(); return; }
                    if (e.key.toLowerCase() === "p") {
                      abrirMenuPrecios(index, i.precios)
                    } else if (!mostrarPrecios) {
                      manejarTeclas(e, index, "precio")
                    }
                  }}
                  onFocus={() => setActiveCell({ row: index, col: "precio" })}
                  className={`h-7 text-right bg-muted/20 w-[10ch] font-mono ${cellActiveClass(index, "precio", activeCell)}`}
                />
              </td>

              {/* DESCUENTO - CORRECCIÓN TOPE */}
              {mostrarDescuento && (
                <td>
                  <Input
                    data-row={index}
                    data-col="descuentoPct"
                    value={i.descuentoPct}
                    onFocus={(e) => {
                      e.target.select();
                      setActiveCell({ row: index, col: "descuentoPct" });
                    }}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      const maxPermitido = Number(settings?.max_discount_without_auth) || 0;

                      if (val > maxPermitido) {
                        toast.error(`Máximo permitido: ${maxPermitido}%`, { id: 'desc-limit' });
                        actualizarItem(i.id, "descuentoPct", maxPermitido);
                      } else {
                        actualizarItem(i.id, "descuentoPct", val);
                      }
                    }}
                    onKeyDown={(e) => manejarTeclas(e, index, "descuentoPct")}
                    className={`h-7 text-right text-blue-600 w-[6ch] font-bold ${cellActiveClass(index, "descuentoPct", activeCell)}`}
                  />
                </td>
              )}

              <td className="text-right font-mono font-bold w-[12ch]">
                ${fmt(i.importe)}
              </td>

              <td className="pl-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminarItemSeguro(i.id)}>
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