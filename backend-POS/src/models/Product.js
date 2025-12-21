"use client"

import * as React from "react"
import { Save, X, Upload, Barcode, DollarSign, Package, Tag, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProductFormData {
  id?: number
  articulo: string
  presentacion: string
  unidad_medida: string
  precio_menudeo: number
  precio_mayoreo: number
  precio_especial: number
  precio_oferta: number
  iva: number
  ieps: number
  stock: number
  category_id: number | null
  photo_url: string | null
  codigo_barras?: string
  codigo_interno?: string // Agregado campo código interno
  activo: boolean
}

interface CatalogoProductosFormProps {
  product?: ProductFormData
  onSave: (data: ProductFormData) => void
  onCancel: () => void
}

export function CatalogoProductosForm({ product, onSave, onCancel }: CatalogoProductosFormProps) {
  const [formData, setFormData] = React.useState<ProductFormData>(
    product || {
      articulo: "",
      presentacion: "",
      unidad_medida: "PZ",
      precio_menudeo: 0,
      precio_mayoreo: 0,
      precio_especial: 0,
      precio_oferta: 0,
      iva: 16,
      ieps: 0,
      stock: 0,
      category_id: null,
      photo_url: null,
      codigo_barras: "",
      codigo_interno: "", // Agregado campo código interno
      activo: true,
    },
  )

  const [imagePreview, setImagePreview] = React.useState<string | null>(product?.photo_url || null)

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setImagePreview(result)
        handleInputChange("photo_url", result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{product ? "Editar Producto" : "Nuevo Producto"}</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete la información del producto</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="gap-2 bg-transparent">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button type="submit" className="gap-2 bg-gradient-to-r from-primary to-accent">
            <Save className="w-4 h-4" />
            Guardar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="w-5 h-5 text-emerald-500" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo_barras" className="text-sm font-medium flex items-center gap-2">
                    <Barcode className="w-4 h-4" />
                    Código de Barras
                  </Label>
                  <Input
                    id="codigo_barras"
                    value={formData.codigo_barras}
                    onChange={(e) => handleInputChange("codigo_barras", e.target.value)}
                    placeholder="Ej: 7501234567890"
                    maxLength={20}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo_interno" className="text-sm font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Código Interno
                  </Label>
                  <Input
                    id="codigo_interno"
                    value={formData.codigo_interno}
                    onChange={(e) => handleInputChange("codigo_interno", e.target.value)}
                    placeholder="Ej: PROD-001"
                    maxLength={15}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="articulo" className="text-sm font-medium">
                    Nombre del Artículo *
                  </Label>
                  <Input
                    id="articulo"
                    value={formData.articulo}
                    onChange={(e) => handleInputChange("articulo", e.target.value)}
                    placeholder="Ej: Coca Cola 600ml"
                    maxLength={40}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="presentacion" className="text-sm font-medium">
                    Presentación
                  </Label>
                  <Input
                    id="presentacion"
                    value={formData.presentacion}
                    onChange={(e) => handleInputChange("presentacion", e.target.value)}
                    placeholder="Ej: 600ml, 1L, Caja 12 pzas"
                    maxLength={30}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidad_medida" className="text-sm font-medium">
                    Unidad de Medida
                  </Label>
                  <Select
                    value={formData.unidad_medida}
                    onValueChange={(value) => handleInputChange("unidad_medida", value)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PZ">Pieza (PZ)</SelectItem>
                      <SelectItem value="KG">Kilogramo (KG)</SelectItem>
                      <SelectItem value="LT">Litro (LT)</SelectItem>
                      <SelectItem value="MT">Metro (MT)</SelectItem>
                      <SelectItem value="CJ">Caja (CJ)</SelectItem>
                      <SelectItem value="PQ">Paquete (PQ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="activo" className="text-sm font-medium">
                    Producto Activo
                  </Label>
                  <p className="text-xs text-muted-foreground">El producto estará disponible para la venta</p>
                </div>
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => handleInputChange("activo", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="w-5 h-5 text-cyan-500" />
                Imagen del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-32 h-32 bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                  {imagePreview ? (
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ImageIcon className="w-10 h-10 mb-1 opacity-40" />
                      <p className="text-xs">Sin imagen</p>
                    </div>
                  )}
                </div>
                <div className="w-full max-w-xs">
                  <Label
                    htmlFor="photo_upload"
                    className="flex items-center justify-center gap-2 cursor-pointer w-full py-2 px-4 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Subir Imagen
                  </Label>
                  <Input
                    id="photo_upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="precios" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Configuración de Precios
              </CardTitle>
              <CardDescription>Defina los diferentes precios de venta para este producto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="precio_menudeo" className="text-sm font-medium">
                    Precio Menudeo *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="precio_menudeo"
                      type="number"
                      step="0.01"
                      min="0"
                      max="99999.99"
                      value={formData.precio_menudeo}
                      onChange={(e) => handleInputChange("precio_menudeo", Number.parseFloat(e.target.value))}
                      placeholder="0.00"
                      required
                      className="pl-8 bg-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Precio de venta al público</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_mayoreo" className="text-sm font-medium">
                    Precio Mayoreo
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="precio_mayoreo"
                      type="number"
                      step="0.01"
                      min="0"
                      max="99999.99"
                      value={formData.precio_mayoreo}
                      onChange={(e) => handleInputChange("precio_mayoreo", Number.parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="pl-8 bg-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Para compras en cantidad</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_especial" className="text-sm font-medium">
                    Precio Especial
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="precio_especial"
                      type="number"
                      step="0.01"
                      min="0"
                      max="99999.99"
                      value={formData.precio_especial}
                      onChange={(e) => handleInputChange("precio_especial", Number.parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="pl-8 bg-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Para clientes preferenciales</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_oferta" className="text-sm font-medium">
                    Precio Oferta
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="precio_oferta"
                      type="number"
                      step="0.01"
                      min="0"
                      max="99999.99"
                      value={formData.precio_oferta}
                      onChange={(e) => handleInputChange("precio_oferta", Number.parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="pl-8 bg-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Precio promocional temporal</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Sugerencia de Precios</h4>
                    <p className="text-xs text-muted-foreground">
                      Asegúrese de que el precio de mayoreo sea menor al de menudeo para incentivar compras en volumen.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-violet-500" />
                Control de Inventario
              </CardTitle>
              <CardDescription>Gestione el stock y control de existencias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-sm font-medium">
                    Stock Actual
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleInputChange("stock", Number.parseInt(e.target.value))}
                    placeholder="0"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Cantidad disponible en inventario</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id" className="text-sm font-medium">
                    Categoría / Familia
                  </Label>
                  <Input
                    id="category_name"
                    placeholder="Ej: Bebidas, Abarrotes, Lácteos"
                    maxLength={30}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Clasificación del producto</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iva" className="text-sm font-medium">
                    IVA (%)
                  </Label>
                  <Input
                    id="iva"
                    type="number"
                    step="0.01"
                    min="0"
                    max="999.99"
                    value={formData.iva}
                    onChange={(e) => handleInputChange("iva", Number.parseFloat(e.target.value))}
                    placeholder="16.00"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Impuesto al valor agregado</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ieps" className="text-sm font-medium">
                    IEPS (%)
                  </Label>
                  <Input
                    id="ieps"
                    type="number"
                    step="0.01"
                    min="0"
                    max="999.99"
                    value={formData.ieps}
                    onChange={(e) => handleInputChange("ieps", Number.parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Impuesto especial sobre producción y servicios</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Stock Disponible</span>
                    <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formData.stock}</p>
                  <p className="text-xs text-muted-foreground mt-1">Unidades en almacén</p>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Valor Total</span>
                    <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    ${(formData.stock * formData.precio_menudeo).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Valor de inventario</p>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Estado</span>
                    <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {formData.stock > 10 ? "OK" : formData.stock > 0 ? "Bajo" : "Agotado"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Estado del stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  )
}
