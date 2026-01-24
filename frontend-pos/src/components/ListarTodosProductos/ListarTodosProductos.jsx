"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Package, Search, Filter } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function ListarTodosProductos() {
  const [productos, setProductos] = useState([])
  const [productosFiltrados, setProductosFiltrados] = useState([])
  const [cargando, setCargando] = useState(true)

  /* Filtros */
  const [busqueda, setBusqueda] = useState("")
  const [familiaseleccionada, setFamiliaseleccionada] = useState("todas")
  const [ordenarPor, setOrdenarPor] = useState("nombre")
  const [stockMinimo, setStockMinimo] = useState("")

  /* ================= CARGA DATOS ================= */
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await fetch(`${API_URL}/products`)
        const data = await res.json()

        setProductos(data)
        setProductosFiltrados(data)
      } catch (err) {
        console.error("Error cargando productos, usando mock", err)

        const mockProductos = [
          {
            id: 1,
            codigo_barras: "75010",
            articulo: "UHU #10",
            presentacion: "TUBO 25 GRS",
            precio_menudeo: 40,
            stock: 0,
            family: "PAPELERIA",
            subfamily: "PEGAMENTOS",
          },
          {
            id: 2,
            codigo_barras: "75020",
            articulo: "Cuaderno Profesional",
            presentacion: "100 hojas",
            precio_menudeo: 65,
            stock: 15,
            family: "PAPELERIA",
            subfamily: "CUADERNOS",
          },
        ]

        setProductos(mockProductos)
        setProductosFiltrados(mockProductos)
      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [])

  /* ================= FILTROS ================= */
  useEffect(() => {
    let data = [...productos]

    if (busqueda.trim()) {
      const t = busqueda.toLowerCase()
      data = data.filter(
        (p) =>
          p.codigo_barras?.toLowerCase().includes(t) ||
          p.articulo?.toLowerCase().includes(t)
      )
    }

    if (familiaseleccionada !== "todas") {
      data = data.filter((p) => {
        const value = `${p.family}|${p.subfamily || ""}`
        return value === familiaseleccionada
      })
    }

    if (stockMinimo && Number(stockMinimo) > 0) {
      data = data.filter((p) => p.stock >= Number(stockMinimo))
    }

    data.sort((a, b) => {
      switch (ordenarPor) {
        case "nombre":
          return a.articulo.localeCompare(b.articulo)
        case "nombre-desc":
          return b.articulo.localeCompare(a.articulo)
        case "codigo":
          return (a.codigo_barras || "").localeCompare(b.codigo_barras || "")
        case "codigo-desc":
          return (b.codigo_barras || "").localeCompare(a.codigo_barras || "")
        case "stock-asc":
          return a.stock - b.stock
        case "stock-desc":
          return b.stock - a.stock
        default:
          return 0
      }
    })

    setProductosFiltrados(data)
  }, [productos, busqueda, familiaseleccionada, ordenarPor, stockMinimo])

  /* ================= FAMILIAS ÚNICAS ================= */
  const familiasUnicas = Array.from(
    new Set(
      productos.map(
        (p) => `${p.family}|${p.subfamily || ""}`
      )
    )
  )

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            Lista de Productos
          </h1>
          <p className="text-slate-600">
            {productosFiltrados.length} de {productos.length} productos
          </p>
        </div>

        {/* FILTROS */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold">Filtros</h2>
          </div>

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-[minmax(30ch,1.5fr)_minmax(22ch,1fr)_minmax(20ch,1fr)_minmax(10ch,0.6fr)]
              gap-4
              items-end
            "
          >
            {/* BUSCAR */}
            <div>
              <label className="text-sm">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-10 h-12 text-base w-full"
                  placeholder="Código o nombre"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            {/* FAMILIA */}
            <div>
              <label className="text-sm">Familia</label>
              <Select
                value={familiaseleccionada}
                onValueChange={setFamiliaseleccionada}
              >
                <SelectTrigger className="h-12 text-base w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {familiasUnicas.map((f) => {
                    const [family, subfamily] = f.split("|")
                    return (
                      <SelectItem key={f} value={f}>
                        {family}
                        {subfamily && ` / ${subfamily}`}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* ORDENAR */}
            <div>
              <label className="text-sm">Ordenar</label>
              <Select value={ordenarPor} onValueChange={setOrdenarPor}>
                <SelectTrigger className="h-12 text-base w-full">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nombre">Nombre A-Z</SelectItem>
                  <SelectItem value="nombre-desc">Nombre Z-A</SelectItem>
                  <SelectItem value="codigo">Código ↑</SelectItem>
                  <SelectItem value="codigo-desc">Código ↓</SelectItem>
                  <SelectItem value="stock-asc">Stock menor</SelectItem>
                  <SelectItem value="stock-desc">Stock mayor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* STOCK */}
            <div>
              <label className="text-sm">Stock mínimo</label>
              <Input
                type="number"
                className="h-12 text-base w-full"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* TABLA */}
        <Card className="p-5">
          {cargando ? (
            <div className="py-16 text-center text-slate-500">
              Cargando productos...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-slate-500">
              <Package className="w-10 h-10 mb-3 text-slate-400" />
              <p className="font-semibold">No hay productos</p>
              <p className="text-sm">Ajusta los filtros</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosFiltrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell className="font-mono">{p.codigo_barras}</TableCell>
                    <TableCell className="font-semibold">{p.articulo}</TableCell>
                    <TableCell>{p.presentacion || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap">
                        <span className="font-semibold">{p.family}</span>
                        {p.subfamily && (
                          <span className="text-slate-500">
                            {" "}
                            / {p.subfamily}
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-800">
                      ${Number(p.precio_menudeo || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          p.stock === 0
                            ? "bg-red-100 text-red-700"
                            : p.stock < 10
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }
                      >
                        {p.stock}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
