"use client"

// Reporte de utilidad (Gerente o superior). El servidor calcula todo: venta y
// costo sin IVA, utilidad y margen, con el costo guardado al momento de vender.
import { useEffect, useMemo, useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { TrendingUp, FileSpreadsheet, FileText, AlertTriangle, Clock } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla"
import ListaVacia from "@/components/ui/lista-vacia"
import { Esqueleto, EsqueletoFilas } from "@/components/ui/esqueleto"
import { apiFetch } from "@/lib/apiFetch"
import { pesos, fechaCorta } from "@/lib/formato"
import { cn } from "@/lib/utils"

const PERIODOS = [
  { id: "hoy", texto: "Hoy" },
  { id: "semana", texto: "Semana" },
  { id: "mes", texto: "Mes" },
  { id: "rango", texto: "Rango" },
]

const porcentaje = (m) => (m === null || m === undefined ? "—" : `${m.toFixed(1)} %`)
const colorUtilidad = (u) => (u < 0 ? "text-error" : "text-exito")

function Dato({ titulo, children, className, claseTarjeta }) {
  return (
    <Card className={cn("gap-1 p-4", claseTarjeta)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className={cn("text-2xl font-bold tabular", className)}>{children}</p>
    </Card>
  )
}

export default function ReporteUtilidad() {
  const [periodo, setPeriodo] = useState("semana")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [orden, setOrden] = useState("utilidad")

  useEffect(() => {
    if (periodo === "rango" && (!desde || !hasta)) return
    const consulta = periodo === "rango" ? `desde=${desde}&hasta=${hasta}` : `periodo=${periodo}`
    let vigente = true
    setCargando(true)
    setError("")
    apiFetch(`/reportes/utilidad?${consulta}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "No se pudo calcular la utilidad")
        if (vigente) setDatos(data)
      })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => { vigente = false }
  }, [periodo, desde, hasta])

  const productos = useMemo(() => {
    const lista = [...(datos?.productos || [])]
    return orden === "margen"
      ? lista.sort((a, b) => (b.margen ?? -Infinity) - (a.margen ?? -Infinity))
      : lista.sort((a, b) => b.utilidad - a.utilidad)
  }, [datos, orden])

  const textoPeriodo = datos
    ? datos.desde === datos.hasta ? fechaCorta(datos.desde) : `${fechaCorta(datos.desde)} al ${fechaCorta(datos.hasta)}`
    : ""
  const nombreArchivo = datos ? `utilidad_${datos.desde}_${datos.hasta}` : "utilidad"

  const exportarExcel = () => {
    const t = datos.totales
    const resumen = [
      { Concepto: "Periodo", Valor: textoPeriodo },
      { Concepto: "Ventas con costo", Valor: t.ventas },
      { Concepto: "Venta sin IVA", Valor: t.venta_sin_iva },
      { Concepto: "Costo sin IVA", Valor: t.costo },
      { Concepto: "Utilidad", Valor: t.utilidad },
      { Concepto: "Margen %", Valor: t.margen ?? "" },
      { Concepto: "Ventas sin costo (fuera del cálculo)", Valor: datos.sin_costo.ventas },
      { Concepto: "Importe sin costo (con IVA)", Valor: datos.sin_costo.importe },
      { Concepto: "Pendiente por cobrar (apartados y créditos)", Valor: datos.pendiente.monto },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productos.map((p) => ({
      Artículo: p.articulo, Cantidad: p.cantidad, "Venta sin IVA": p.venta_sin_iva,
      "Costo sin IVA": p.costo, Utilidad: p.utilidad, "Margen %": p.margen ?? "",
    }))), "Por producto")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datos.dias.map((d) => ({
      Fecha: d.fecha, Ventas: d.ventas, "Venta sin IVA": d.venta_sin_iva,
      "Costo sin IVA": d.costo, Utilidad: d.utilidad, "Margen %": d.margen ?? "",
    }))), "Por día")
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
  }

  const exportarPDF = () => {
    const t = datos.totales
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Reporte de Utilidad", 14, 18)
    doc.setFontSize(10)
    doc.text(`Periodo: ${textoPeriodo}`, 14, 25)
    autoTable(doc, {
      startY: 30,
      body: [
        ["Venta sin IVA", pesos(t.venta_sin_iva)],
        ["Costo sin IVA", pesos(t.costo)],
        ["Utilidad", pesos(t.utilidad)],
        ["Margen", porcentaje(t.margen)],
        ["Ventas con costo", String(t.ventas)],
        ["Pendiente por cobrar (apartados y créditos)", pesos(datos.pendiente.monto)],
      ],
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } },
      theme: "plain",
    })
    let y = doc.lastAutoTable.finalY + 6
    if (datos.sin_costo.ventas > 0) {
      doc.setTextColor(180, 83, 9)
      doc.text(`${datos.sin_costo.ventas} venta(s) por ${pesos(datos.sin_costo.importe)} no tienen costo y no entran en el cálculo.`, 14, y)
      doc.setTextColor(0, 0, 0)
      y += 6
    }
    const derecha = { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } }
    autoTable(doc, {
      startY: y,
      head: [["Artículo", "Cant.", "Venta sin IVA", "Costo", "Utilidad", "Margen"]],
      body: productos.map((p) => [p.articulo, p.cantidad, pesos(p.venta_sin_iva), pesos(p.costo), pesos(p.utilidad), porcentaje(p.margen)]),
      styles: { fontSize: 8 },
      columnStyles: derecha,
      headStyles: { fillColor: [37, 99, 235] },
    })
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Fecha", "Ventas", "Venta sin IVA", "Costo", "Utilidad", "Margen"]],
      body: datos.dias.map((d) => [fechaCorta(d.fecha), d.ventas, pesos(d.venta_sin_iva), pesos(d.costo), pesos(d.utilidad), porcentaje(d.margen)]),
      styles: { fontSize: 8 },
      columnStyles: derecha,
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`${nombreArchivo}.pdf`)
  }

  const t = datos?.totales
  const hayDatos = datos && (datos.productos.length > 0 || datos.sin_costo.renglones > 0)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <EncabezadoPantalla
        titulo="Reporte de Utilidad"
        subtitulo="Venta, costo y utilidad sin IVA, con el costo que tenía cada producto al venderse"
        icono={TrendingUp}
        className="mb-0"
        acciones={
          <>
            <Button variant="outline" onClick={exportarExcel} disabled={!hayDatos || cargando}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button variant="outline" onClick={exportarPDF} disabled={!hayDatos || cargando}>
              <FileText className="size-4" /> PDF
            </Button>
          </>
        }
      />

      {/* Periodo */}
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div role="group" aria-label="Periodo" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1 sm:inline-grid">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                // Rango empieza con las fechas del periodo que se estaba viendo
                if (p.id === "rango" && datos && periodo !== "rango") { setDesde(datos.desde); setHasta(datos.hasta) }
                setPeriodo(p.id)
              }}
              aria-pressed={periodo === p.id}
              className={cn(
                "rounded-md px-4 text-sm font-semibold transition",
                periodo === p.id ? "bg-primario text-white shadow-suave" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.texto}
            </button>
          ))}
        </div>
        {periodo === "rango" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Desde
              <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)}
                className="mt-1 block h-11 w-full rounded-lg border border-input bg-card px-3" />
            </label>
            <label className="text-sm font-medium">
              Hasta
              <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)}
                className="mt-1 block h-11 w-full rounded-lg border border-input bg-card px-3" />
            </label>
          </div>
        )}
        {datos && <p className="text-sm text-muted-foreground sm:ml-auto">Del <b className="text-foreground">{textoPeriodo}</b></p>}
      </Card>

      {error && (
        <div role="alert" className="rounded-tarjeta border border-error/30 bg-error-suave p-4 text-sm text-error">{error}</div>
      )}

      {cargando && !datos ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-24" />)}
          </div>
          <EsqueletoFilas filas={6} />
        </div>
      ) : datos && (
        <div className={cn("space-y-6 transition-opacity", cargando && "opacity-60")}>
          {/* Totales */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Dato titulo="Venta sin IVA">{pesos(t.venta_sin_iva)}</Dato>
            <Dato titulo="Costo sin IVA">{pesos(t.costo)}</Dato>
            <Dato titulo="Utilidad" className={colorUtilidad(t.utilidad)}>{pesos(t.utilidad)}</Dato>
            <Dato titulo="Margen" className={colorUtilidad(t.utilidad)}>{porcentaje(t.margen)}</Dato>
            <Dato titulo="Ventas con costo" claseTarjeta="col-span-2 lg:col-span-1">{t.ventas}</Dato>
          </div>

          {/* Avisos: ventas sin costo y pendiente por cobrar */}
          {datos.sin_costo.renglones > 0 && (
            <div role="status" className="flex gap-3 rounded-tarjeta border border-aviso/30 bg-aviso-suave p-4 text-sm">
              <AlertTriangle className="size-5 shrink-0 text-aviso" aria-hidden />
              <p>
                <b>{datos.sin_costo.ventas} {datos.sin_costo.ventas === 1 ? "venta" : "ventas"} por {pesos(datos.sin_costo.importe)}</b>{" "}
                ({datos.sin_costo.renglones} {datos.sin_costo.renglones === 1 ? "producto" : "productos"}){" "}
                {datos.sin_costo.ventas === 1 ? "no tiene costo y no entra" : "no tienen costo y no entran"} en el cálculo.
                Son ventas anteriores al campo Costo o de productos sin costo capturado.
              </p>
            </div>
          )}
          {datos.pendiente.ventas > 0 && (
            <div className="flex gap-3 rounded-tarjeta border bg-card p-4 text-sm shadow-suave">
              <Clock className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <p>
                Los apartados y créditos cuentan el día de la venta. De ellos, falta cobrar{" "}
                <b className="text-aviso">{pesos(datos.pendiente.monto)}</b> ({datos.pendiente.ventas}{" "}
                {datos.pendiente.ventas === 1 ? "venta" : "ventas"}).
              </p>
            </div>
          )}

          {!hayDatos ? (
            <ListaVacia titulo="Sin ventas en el periodo" mensaje="No hay ventas registradas en estas fechas." />
          ) : (
            <>
              {/* Por producto */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Por producto</h2>
                  <div role="group" aria-label="Ordenar" className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">Ordenar por</span>
                    {[["utilidad", "Utilidad"], ["margen", "Margen"]].map(([id, texto]) => (
                      <Button key={id} size="sm" variant={orden === id ? "default" : "outline"} aria-pressed={orden === id} onClick={() => setOrden(id)}>
                        {texto}
                      </Button>
                    ))}
                  </div>
                </div>
                {productos.length === 0 ? (
                  <ListaVacia titulo="Ningún producto con costo" mensaje="Las ventas del periodo son de productos sin costo." />
                ) : (
                  <>
                    <ul className="space-y-3 md:hidden">
                      {productos.map((p) => (
                        <li key={p.product_id} className="rounded-tarjeta border bg-card p-4 shadow-suave">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 font-semibold break-words">{p.articulo}</p>
                            <p className={cn("monto text-lg font-bold", colorUtilidad(p.utilidad))}>{pesos(p.utilidad)}</p>
                          </div>
                          <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                            <div><dt className="text-xs text-muted-foreground">Cantidad</dt><dd className="tabular">{p.cantidad}</dd></div>
                            <div><dt className="text-xs text-muted-foreground">Venta</dt><dd className="tabular">{pesos(p.venta_sin_iva)}</dd></div>
                            <div><dt className="text-xs text-muted-foreground">Margen</dt><dd className="tabular">{porcentaje(p.margen)}</dd></div>
                          </dl>
                        </li>
                      ))}
                    </ul>
                    <div className="hidden overflow-hidden rounded-tarjeta border bg-card shadow-suave md:block">
                      <Table>
                        <TableHeader className="bg-muted/60">
                          <TableRow>
                            <TableHead>Artículo</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="text-right">Venta sin IVA</TableHead>
                            <TableHead className="text-right">Costo sin IVA</TableHead>
                            <TableHead className="text-right">Utilidad</TableHead>
                            <TableHead className="text-right">Margen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productos.map((p) => (
                            <TableRow key={p.product_id}>
                              <TableCell className="font-medium">{p.articulo}</TableCell>
                              <TableCell className="monto">{p.cantidad}</TableCell>
                              <TableCell className="monto">{pesos(p.venta_sin_iva)}</TableCell>
                              <TableCell className="monto">{pesos(p.costo)}</TableCell>
                              <TableCell className={cn("monto font-semibold", colorUtilidad(p.utilidad))}>{pesos(p.utilidad)}</TableCell>
                              <TableCell className="monto">{porcentaje(p.margen)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </section>

              {/* Por día */}
              {datos.dias.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">Por día</h2>
                  <div className="overflow-hidden rounded-tarjeta border bg-card shadow-suave">
                    <Table>
                      <TableHeader className="bg-muted/60">
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Ventas</TableHead>
                          <TableHead className="text-right">Venta sin IVA</TableHead>
                          <TableHead className="text-right">Costo</TableHead>
                          <TableHead className="text-right">Utilidad</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {datos.dias.map((d) => (
                          <TableRow key={d.fecha}>
                            <TableCell className="whitespace-nowrap">{fechaCorta(d.fecha)}</TableCell>
                            <TableCell className="monto">{d.ventas}</TableCell>
                            <TableCell className="monto">{pesos(d.venta_sin_iva)}</TableCell>
                            <TableCell className="monto">{pesos(d.costo)}</TableCell>
                            <TableCell className={cn("monto font-semibold", colorUtilidad(d.utilidad))}>{pesos(d.utilidad)}</TableCell>
                            <TableCell className="monto">{porcentaje(d.margen)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
