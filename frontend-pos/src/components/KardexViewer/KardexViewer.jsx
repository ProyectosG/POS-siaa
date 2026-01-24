"use client"

import { useState } from "react"
import OverlayKardexProductosPorNombre from "./OverlayKardexProductosPorNombre"
import MovementTypeBadge from "./MovementTypeBadge"

import {
  Search,
  Barcode,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  FileText,
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// Función segura para formatear fecha YYYY-MM-DD sin desfase UTC
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  // Simplemente split y reorder: YYYY-MM-DD → DD/MM/YYYY
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function KardexViewer() {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchName, setSearchName] = useState("")
  const [searchBarcode, setSearchBarcode] = useState("")
  const [kardexMovements, setKardexMovements] = useState([])
  const [loading, setLoading] = useState(false)

  const [showOverlay, setShowOverlay] = useState(false)
  const [resultados, setResultados] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

  const searchProductByName = async (name) => {
    if (!name) return
    setLoading(true)

    try {
      const res = await fetch(
        `${API_URL}/products/search?term=${encodeURIComponent(name)}`
      )

      if (!res.ok) throw new Error("Error buscando producto")

      const products = await res.json()

      setResultados(products)
      setSelectedIndex(0)
      setShowOverlay(true)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const searchProductByBarcode = async (barcode) => {
    if (!barcode) return
    setLoading(true)

    try {
      const res = await fetch(
        `${API_URL}/products/barcode/${encodeURIComponent(barcode)}`
      )

      if (!res.ok) throw new Error("Producto no encontrado")

      const product = await res.json()

      const mappedProduct = {
        id: product.id,
        name: product.articulo,
        barcode: product.codigo_barras,
        current_stock: product.stock,
      }

      setSelectedProduct(mappedProduct)
      await loadKardex(product.id)
    } catch (error) {
      console.error("Error searching product by barcode:", error)
      setSelectedProduct(null)
      setKardexMovements([])
    } finally {
      setLoading(false)
    }
  }

  const loadKardex = async (productId) => {
    try {
      const res = await fetch(`${API_URL}/kardex/product/${productId}`)

      if (!res.ok) throw new Error("Error cargando kardex")

      const movements = await res.json()
      setKardexMovements(movements)
    } catch (error) {
      console.error("Error loading kardex:", error)
      setKardexMovements([])
    }
  }

  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'ENTRADA':
      case 'ALTA':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-300'

      case 'SALIDA':
      case 'BAJA':
        return 'bg-rose-100 text-rose-700 border border-rose-300'

      case 'INVENTARIO':
      case 'CAMBIO':
      default:
        return 'bg-muted text-muted-foreground border border-border'
    }
  }

  const getMovementIcon = (type) => {
    const t = type?.toUpperCase()

    if (["ENTRADA", "ALTA"].includes(t)) {
      return <TrendingUp className="w-4 h-4" />
    }

    if (["SALIDA", "BAJA"].includes(t)) {
      return <TrendingDown className="w-4 h-4" />
    }

    return <Package className="w-4 h-4" /> // INVENTARIO / CAMBIO
  }

  const onSelectProducto = async (product) => {
    setSelectedProduct({
      id: product.id,
      name: product.articulo,
      barcode: product.codigo_barras,
      current_stock: product.stock,
    })

    setShowOverlay(false)
    await loadKardex(product.id)
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Sistema de Kardex
          </h1>
          <p className="text-muted-foreground text-lg">
            Visualiza y analiza los movimientos de inventario de tus productos
          </p>
        </div>

        {/* Search Section */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Buscar por Nombre
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && searchProductByName(searchName)}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => searchProductByName(searchName)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                  >
                    Buscar
                  </button>
                </TooltipTrigger>
                <TooltipContent>Buscar producto por nombre</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="w-5 h-5" />
                Buscar por Código
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                value={searchBarcode}
                onChange={(e) => setSearchBarcode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && searchProductByBarcode(searchBarcode)}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => searchProductByBarcode(searchBarcode)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                  >
                    Buscar
                  </button>
                </TooltipTrigger>
                <TooltipContent>Buscar producto por código de barras</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </div>

        {/* Product Info */}
        {selectedProduct && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {selectedProduct.name}
                  </CardTitle>
                  <CardDescription>
                    Código: {selectedProduct.barcode}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Stock Actual</p>
                  <p className="text-3xl font-bold text-primary">
                    {selectedProduct.current_stock}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Kardex Table */}
        {selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando...</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Fecha</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Hora</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Tipo</th>
                      <th className="text-center p-3 text-sm font-semibold text-foreground">Stock Anterior</th>
                      <th className="text-center p-3 text-sm font-semibold text-foreground">Cantidad Movida</th>
                      <th className="text-center p-3 text-sm font-semibold text-foreground">Stock Nuevo</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Folio</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexMovements.map((movement) => (
                      <tr
                        key={movement.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        {/* FECHA - Formato seguro sin desfase UTC */}
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {formatDate(movement.date)}
                          </div>
                        </td>

                        {/* HORA */}
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {movement.time || "—"}
                          </div>
                        </td>

                        {/* TIPO MOVIMIENTO + RAZÓN */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <Badge
                              className={`${getMovementTypeColor(
                                movement.movement_type
                              )} flex items-center gap-1 w-fit`}
                            >
                              {getMovementIcon(movement.movement_type)}
                              <span className="font-semibold">
                                {movement.movement_type}
                              </span>
                            </Badge>

                            {movement.movement_reason && (
                              <span className="text-[10px] leading-tight text-muted-foreground">
                                {movement.movement_reason}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STOCK ANTERIOR */}
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-foreground font-semibold">
                            {movement.previous_stock}
                          </span>
                        </td>

                        {/* CANTIDAD MOVIDA */}
                        <td className="p-3 text-center">
                          {(() => {
                            const type = movement.movement_type?.toUpperCase()

                            const noSignTypes = ["ALTA", "INVENTARIO"]
                            const positiveTypes = ["ENTRADA"]
                            const negativeTypes = ["SALIDA", "BAJA"]

                            const isNoSign = noSignTypes.includes(type)
                            const isPositive = positiveTypes.includes(type)
                            const isNegative = negativeTypes.includes(type)

                            return (
                              <span
                                className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-bold ${
                                  isPositive
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : isNoSign
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                }`}
                              >
                                {!isNoSign && (isPositive ? "+" : isNegative ? "-" : "")}
                                {movement.moved_quantity}
                              </span>
                            )
                          })()}
                        </td>

                        {/* STOCK NUEVO */}
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-bold">
                            {movement.new_stock}
                          </span>
                        </td>

                        {/* FOLIO */}
                        <td className="p-3">
                          {movement.related_folio ? (
                            <div className="flex items-center gap-2 text-sm font-mono text-foreground bg-muted px-2 py-1 rounded w-fit">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              {movement.related_folio}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </td>

                        {/* USUARIO */}
                        <td className="p-3">
                          <span className="text-sm text-foreground font-medium">
                            {movement.nickname_user || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {showOverlay && (
        <OverlayKardexProductosPorNombre
          resultados={resultados}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          onSelect={onSelectProducto}
          onClose={() => setShowOverlay(false)}
        />
      )}
    </TooltipProvider>
  )
}