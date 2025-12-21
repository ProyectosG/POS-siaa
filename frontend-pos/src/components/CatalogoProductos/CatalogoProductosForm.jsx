"use client"

import * as React from "react"
import {
  Save,
  X,
  Upload,
  Barcode,
  DollarSign,
  Package,
  Tag,
  ImageIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function CatalogoProductosForm({ product, onSave, onCancel }) {
  const [formData, setFormData] = React.useState(
    product || {
      articulo: "",
      presentacion: "",
      unidad_medida: "PZ",
      precio_menudeo: "",
      precio_mayoreo: "",
      precio_especial: "",
      precio_oferta: "",
      iva: "16",
      ieps: "0",
      stock: 0,
      category_id: "",
      photo_url: null,
      codigo_barras: "",
      codigo_interno: "",
      activo: true,
    }
  )

  const [imagePreview, setImagePreview] = React.useState(
    product?.photo_url || null
  )

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
      handleInputChange("photo_url", reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Complete la información del producto
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit">
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
     <TabsList className="grid grid-cols-4 gap-2 max-w-full sm:max-w-lg">
  <TabsTrigger value="general">General</TabsTrigger>
  <TabsTrigger value="precios">Precios</TabsTrigger>
  <TabsTrigger value="inventario">Inventario</TabsTrigger>
  <TabsTrigger value="imagen">Imagen</TabsTrigger> {/* <- NUEVO */}
</TabsList>



    {/* ================= TAB GENERAL ================= */}
<TabsContent value="general" className="space-y-6 mt-6 flex flex-col items-center">
  <Card className="w-full max-w-4xl">
    <CardHeader>
      <CardTitle className="flex gap-2 items-center">
        <Tag className="w-5 h-5 text-emerald-500" />
        Información General
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

        {/* Código de Barras */}
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="codigo_barras">Código de Barras</Label>
          <Input
            id="codigo_barras"
            className="w-[20ch]"
            value={formData.codigo_barras}
            onChange={(e) => handleInputChange("codigo_barras", e.target.value)}
            maxLength={20}
          />
        </div>

        {/* Código Interno */}
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="codigo_interno">Código Interno</Label>
          <Input
            id="codigo_interno"
            className="w-[20ch]"
            value={formData.codigo_interno}
            onChange={(e) => handleInputChange("codigo_interno", e.target.value)}
            maxLength={15}
          />
        </div>

        {/* Nombre del Producto */}
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="articulo">Nombre del Producto *</Label>
          <Input
            id="articulo"
            required
            className="w-full"
            value={formData.articulo}
            onChange={(e) => handleInputChange("articulo", e.target.value)}
            maxLength={40}
          />
        </div>

        {/* Presentación */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="presentacion">Presentación</Label>
          <Input
            id="presentacion"
            className="w-full"
            value={formData.presentacion}
            onChange={(e) => handleInputChange("presentacion", e.target.value)}
            maxLength={30}
          />
        </div>

        {/* Unidad de Medida */}
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="unidad_medida">Unidad</Label>
          <Select
            value={formData.unidad_medida}
            onValueChange={(v) => handleInputChange("unidad_medida", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PZ">Pieza</SelectItem>
              <SelectItem value="KG">Kilogramo</SelectItem>
              <SelectItem value="LT">Litro</SelectItem>
              <SelectItem value="CJ">Caja</SelectItem>
              <SelectItem value="PQ">Paquete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activo */}
      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
        <div>
          <Label>Producto Activo</Label>
          <p className="text-xs text-muted-foreground">
            Disponible para venta
          </p>
        </div>
        <Switch
          checked={formData.activo}
          onCheckedChange={(v) => handleInputChange("activo", v)}
        />
      </div>

      {/* Miniatura de Imagen */}
      {imagePreview && (
        <div className="flex justify-center mt-4">
          <div className="w-24 h-24 border rounded overflow-hidden">
            <img src={imagePreview} className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

{/* ================= TAB IMAGEN ================= */}
<TabsContent value="imagen" className="mt-6 flex flex-col items-center">
  <Card className="w-full max-w-md">
    <CardHeader>
      <CardTitle className="flex gap-2 items-center">
        <ImageIcon className="w-5 h-5 text-cyan-500" />
        Imagen del Producto
      </CardTitle>
    </CardHeader>

    <CardContent className="flex flex-col items-center gap-4">
      {/* Preview de la imagen */}
      <div className="w-32 h-32 border-dashed border rounded flex items-center justify-center">
        {imagePreview ? (
          <img src={imagePreview} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="opacity-40" />
        )}
      </div>

      {/* Controles: subir y eliminar */}
      <div className="flex gap-2">
        {/* Botón subir imagen */}
        <Label className="cursor-pointer flex items-center">
          <Upload className="inline mr-2" />
          Subir imagen
          <Input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </Label>

        {/* Botón eliminar imagen, visible solo si hay imagen */}
        {imagePreview && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setImagePreview(null)
              handleInputChange("photo_url", null)
            }}
          >
            Eliminar
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
</TabsContent>



        {/* ================= TAB PRECIOS ================= */}
        <TabsContent
          value="precios"
          className="mt-6 flex justify-center"
        >
          <div className="w-full max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  Precios
                </CardTitle>
                <CardDescription>
                  Defina los precios de venta
                </CardDescription>
              </CardHeader>

<CardContent className="grid md:grid-cols-2 gap-6">
  {[
    "precio_menudeo",
    "precio_mayoreo",
    "precio_especial",
    "precio_oferta",
  ].map((field) => (
    <div
      key={field}
      className="space-y-2 flex flex-col items-center"
    >
      <Label>{field.replace("precio_", "Precio ")}</Label>

      <div className="relative">
        {/* Símbolo $ fijo */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          $
        </span>

        <Input
          className="w-[15ch] text-right font-mono pl-6"
          inputMode="decimal"
          value={formData[field]}
          onChange={(e) => {
            if (/^\d{0,6}(\.\d{0,2})?$/.test(e.target.value)) {
              handleInputChange(field, e.target.value)
            }
          }}
        />
      </div>
    </div>
  ))}
</CardContent>



      </Card>
    </div>
  </TabsContent>

        {/* ================= TAB INVENTARIO ================= */}
        <TabsContent
          value="inventario"
          className="mt-6 flex justify-center"
        >
          <div className="w-full max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <Package className="w-5 h-5 text-violet-500" />
                  Inventario
                </CardTitle>
              </CardHeader>

              <CardContent className="grid md:grid-cols-2 gap-6 justify-items-center">
                {/* Categoría */}
                <div className="space-y-2">
                  <Label>Categoría / Familia</Label>
                  <select
                    className="w-[30ch] border rounded px-3 py-2"
                    value={formData.category_id}
                    onChange={(e) =>
                      handleInputChange("category_id", e.target.value)
                    }
                  >
                    <option value="">Seleccione</option>
                    <option value="1">Bebidas</option>
                    <option value="2">Abarrotes</option>
                    <option value="3">Lácteos</option>
                  </select>
                </div>

                {/* IVA + IEPS */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>IVA %</Label>
                    <Input
                      className="w-[7ch] text-right font-mono"
                      value={formData.iva}
                      onChange={(e) =>
                        handleInputChange("iva", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>IEPS %</Label>
                    <Input
                      className="w-[7ch] text-right font-mono"
                      value={formData.ieps}
                      onChange={(e) =>
                        handleInputChange("ieps", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Stock - Solo lectura */}
                <div className="md:col-span-2 flex justify-center">
                  <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-muted/40 border border-border rounded-2xl text-center scale-[0.75]">
                      <Label className="text-sm sm:text-base text-muted-foreground mb-2">
                        Stock Actual
                      </Label>

                      <div className="font-mono font-bold text-4xl sm:text-5xl md:text-6xl text-foreground leading-none">
                        {formData.stock}
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                        Unidades disponibles
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  )
}
