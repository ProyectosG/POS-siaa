"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Pencil, Trash2, ArrowLeft, Package } from "lucide-react"
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import CatalogoProductosForm from "@/components/CatalogoProductos/CatalogoProductosForm"
import { apiFetch } from "@/lib/apiFetch"
import { pesos } from "@/lib/formato"
import ListaVacia from "@/components/ui/lista-vacia"
import { EsqueletoFilas } from "@/components/ui/esqueleto"


function EtiquetaExistencia({ stock }) {
  const n = Number(stock || 0)
  const [texto, clase] = n > 50 ? ["Disponible", "bg-exito-suave text-exito"] : n > 10 ? ["Bajo", "bg-aviso-suave text-aviso"] : ["Crítico", "bg-aviso text-white"]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${clase}`}>{texto}</span>
}

export default function CatalogoProductos() {
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [productToDelete, setProductToDelete] = useState(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await apiFetch(`/products`)
      if (!res.ok) throw new Error("Error al cargar productos")
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p =>
    p.articulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.presentacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo_barras?.includes(searchTerm)
  )

  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0)
  const totalValue = products.reduce((acc, p) => acc + (p.stock || 0) * (p.precio_menudeo || 0), 0)

  const handleSaveSuccess = () => {
    fetchProducts()
    setShowForm(false)
    setCurrentProduct(null)
  }

  const handleDeleteConfirm = async () => {
    try {
      const res = await apiFetch(`/products/${productToDelete.id}`, { method: "DELETE" })
      // Un producto con movimientos no se borra (409): el servidor dice que se desactive
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Error al eliminar")
      }
      setError("")
      fetchProducts()
    } catch (err) {
      setError(err.message || "Error al eliminar")
    } finally {
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  // Si el formulario está abierto, mostrarlo con botón de regreso
  if (showForm) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Botón para regresar */}
          <Button variant="ghost" onClick={() => setShowForm(false)} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver al catálogo
          </Button>

          <CatalogoProductosForm 
            product={currentProduct} 
            onSave={handleSaveSuccess} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto space-y-6">
        <EncabezadoPantalla
          titulo="Catálogo de Productos"
          subtitulo="Precios, existencias y datos de cada producto"
          icono={Package}
          className="mb-0"
          acciones={
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo Producto
            </Button>
          }
        />

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <p className="text-sm font-medium text-emerald-600 dark:text-exito">Total Productos</p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-exito">{products.length}</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg">
            <p className="text-sm font-medium text-blue-600 dark:text-primario">Stock Total</p>
            <p className="text-3xl font-bold text-blue-700 dark:text-primario">{totalStock}</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 rounded-lg">
            <p className="text-sm font-medium text-violet-600 dark:text-violet-700">Valor Inventario</p>
            <p className="text-3xl font-bold text-violet-700 dark:text-violet-700">{pesos(totalValue)}</p>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, presentación o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background text-foreground"
          />
        </div>

        {error && <div className="p-4 bg-error-suave border border-red-500/50 rounded-lg text-error text-center">{error}</div>}

        {/* Tabla */}


{loading ? (
  <EsqueletoFilas filas={6} />
) : filteredProducts.length === 0 ? (
  <ListaVacia titulo="No hay productos" mensaje={searchTerm ? "Ningún producto coincide con la búsqueda." : "Agrega el primero con Nuevo Producto."} />
) : (
  <>
    {/* Celular: una tarjeta por producto */}
    <ul className="space-y-3 md:hidden">
      {filteredProducts.map((p) => (
        <li key={p.id} className="rounded-tarjeta border bg-card p-4 shadow-suave">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold break-words">{p.articulo}</p>
              <p className="text-xs text-muted-foreground">{p.presentacion || "—"} · <span className="font-mono">{p.codigo_barras || "sin código"}</span></p>
            </div>
            <EtiquetaExistencia stock={p.stock} />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div><dt className="text-xs text-muted-foreground">Menudeo</dt><dd className="font-semibold">{pesos(p.precio_menudeo)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Mayoreo</dt><dd className="font-semibold">{pesos(p.precio_mayoreo)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Stock</dt><dd className="font-semibold">{p.stock || 0}</dd></div>
          </dl>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => { setCurrentProduct(p); setShowForm(true) }}>
              <Pencil className="w-4 h-4" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="text-error" onClick={() => { setProductToDelete(p); setIsDeleteDialogOpen(true) }}>
              <Trash2 className="w-4 h-4" /> Eliminar
            </Button>
          </div>
        </li>
      ))}
    </ul>

    {/* Tablet y escritorio: tabla */}
    <div className="hidden md:block border rounded-tarjeta bg-card overflow-hidden shadow-suave">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 border-b border-border">
            <TableHead className="text-foreground font-semibold">Artículo</TableHead>
            <TableHead className="text-foreground font-semibold">Presentación</TableHead>
            <TableHead className="text-foreground font-semibold">Código</TableHead>
            <TableHead className="text-right text-foreground font-semibold">P. Menudeo</TableHead>
            <TableHead className="text-right text-foreground font-semibold">P. Mayoreo</TableHead>
            <TableHead className="text-right text-foreground font-semibold">Stock</TableHead>
            <TableHead className="text-foreground font-semibold">Estado</TableHead>
            <TableHead className="text-right text-foreground font-semibold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((p) => (
            <TableRow
              key={p.id}
              className="hover:bg-primario-suave/60 transition-colors border-b border-border/50 last:border-b-0 focus-within:bg-primario-suave"
            >
              <TableCell className="font-medium text-foreground">{p.articulo}</TableCell>
              <TableCell className="text-foreground">{p.presentacion || "—"}</TableCell>
              <TableCell className="font-mono text-foreground">{p.codigo_barras || "—"}</TableCell>
              <TableCell className="monto">{pesos(p.precio_menudeo)}</TableCell>
              <TableCell className="monto">{pesos(p.precio_mayoreo)}</TableCell>
              <TableCell className="monto">{p.stock || 0}</TableCell>
              <TableCell><EtiquetaExistencia stock={p.stock} /></TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => { setCurrentProduct(p); setShowForm(true) }}
                    className="text-primario hover:text-primario hover:bg-primario-suave transition-colors"
                    aria-label={`Editar ${p.articulo}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => { setProductToDelete(p); setIsDeleteDialogOpen(true) }}
                    className="text-error hover:text-error hover:bg-error-suave transition-colors"
                    aria-label={`Eliminar ${p.articulo}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </>
)}

        {/* Diálogo eliminar */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará permanentemente "{productToDelete?.articulo}"
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
