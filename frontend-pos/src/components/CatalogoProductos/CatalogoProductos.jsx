"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import  {CatalogoProductosForm}  from "@/components/CatalogoProductos/CatalogoProductosForm";

export function CatalogoProductos() {
  const [products, setProducts] = React.useState([
    {
      id: 1,
      articulo: "Coca Cola 600ml",
      presentacion: "Botella PET",
      unidad_medida: "PZ",
      precio_menudeo: 15.0,
      precio_mayoreo: 12.0,
      precio_especial: 10.0,
      precio_oferta: 13.5,
      iva: 16,
      ieps: 8,
      stock: 150,
      category_id: 1,
      photo_url: null,
      codigo_barras: "7501234567890",
      descripcion: "Bebida refrescante de cola",
      activo: true,
    },
    {
      id: 2,
      articulo: "Sabritas Original 45g",
      presentacion: "Bolsa",
      unidad_medida: "PZ",
      precio_menudeo: 18.0,
      precio_mayoreo: 15.0,
      precio_especial: 14.0,
      precio_oferta: 16.0,
      iva: 16,
      ieps: 0,
      stock: 89,
      category_id: 2,
      photo_url: null,
      codigo_barras: "7501055300001",
      descripcion: "Papas fritas sabor original",
      activo: true,
    },
  ]);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [currentProduct, setCurrentProduct] = React.useState(null);
  const [productToDelete, setProductToDelete] = React.useState(null);

  const filteredProducts = products.filter(
    (product) =>
      product.articulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.presentacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.codigo_barras && product.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenForm = (product) => {
    setCurrentProduct(product || null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setCurrentProduct(null);
  };

  const handleSaveProduct = (data) => {
    if (currentProduct && currentProduct.id) {
      // Editar producto existente
      setProducts((prev) => prev.map((p) => (p.id === currentProduct.id ? { ...data, id: currentProduct.id } : p)));
    } else {
      // Crear nuevo producto
      const newProduct = {
        ...data,
        id: products.length > 0 ? Math.max(...products.map((p) => p.id || 0)) + 1 : 1,
      };
      setProducts((prev) => [...prev, newProduct]);
    }
    handleCloseForm();
  };

  const handleDeleteProduct = () => {
    if (productToDelete) {
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleCloseForm} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Button>
        <CatalogoProductosForm
          product={currentProduct || undefined}
          onSave={handleSaveProduct}
          onCancel={handleCloseForm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Catálogo de Productos
          </h2>
          <p className="text-muted-foreground mt-1">Gestiona tu inventario de productos</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2 bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Productos</span>
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{products.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Productos registrados</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Stock Total</span>
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
            {products.reduce((acc, p) => acc + p.stock, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Unidades en inventario</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Valor Inventario</span>
            <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">
            ${products.reduce((acc, p) => acc + p.stock * p.precio_menudeo, 0).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Valor total del stock</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nombre, presentación o código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      {/* Products Table */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Artículo</TableHead>
              <TableHead className="font-semibold">Presentación</TableHead>
              <TableHead className="font-semibold">Código</TableHead>
              <TableHead className="text-right font-semibold">P. Menudeo</TableHead>
              <TableHead className="text-right font-semibold">P. Mayoreo</TableHead>
              <TableHead className="text-right font-semibold">Stock</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">No se encontraron productos</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Intenta con otros términos de búsqueda</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{product.articulo}</TableCell>
                  <TableCell className="text-muted-foreground">{product.presentacion}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {product.codigo_barras || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">${product.precio_menudeo.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${product.precio_mayoreo.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">{product.stock}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.stock > 50 ? "default" : product.stock > 10 ? "secondary" : "destructive"}
                      className="font-medium"
                    >
                      {product.stock > 50 ? "Disponible" : product.stock > 10 ? "Bajo" : "Crítico"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenForm(product)}
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setProductToDelete(product);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el producto "{productToDelete?.articulo}". Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
