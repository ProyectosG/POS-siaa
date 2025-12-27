"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import TabGeneral from "./tabs/TabGeneral"
import TabPrecios from "./tabs/TabPrecios"
import TabInventario from "./tabs/TabInventario"
import TabImagen from "./tabs/TabImagen"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function CatalogoProductosForm({ product, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    articulo: product?.articulo || "",
    presentacion: product?.presentacion || "",
    unidad_medida: product?.unidad_medida || "PZ",
    precio_menudeo: product?.precio_menudeo?.toString() || "",
    precio_mayoreo: product?.precio_mayoreo?.toString() || "",
    precio_especial: product?.precio_especial?.toString() || "",
    precio_oferta: product?.precio_oferta?.toString() || "",
    iva: product?.iva?.toString() || "16",
    ieps: product?.ieps?.toString() || "0",
    stock: product?.stock || 0,
    category_id: product?.category_id?.toString() || "",
    photo_url: product?.photo_url || "",
    codigo_barras: product?.codigo_barras || "",
    codigo_interno: product?.codigo_interno || "",
    activo: product?.activo ?? true,
    family: "",
    subfamily: "",
  })

  const [imagePreview, setImagePreview] = useState(product?.photo_url || "")
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(setCategories)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!product) {
      setFormData({
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
        photo_url: "",
        codigo_barras: "",
        codigo_interno: "",
        activo: true,
        family: "",
        subfamily: "",
      })
      setImagePreview("")
    } else {
      setFormData({
        articulo: product.articulo || "",
        presentacion: product.presentacion || "",
        unidad_medida: product.unidad_medida || "PZ",
        precio_menudeo: product.precio_menudeo?.toString() || "",
        precio_mayoreo: product.precio_mayoreo?.toString() || "",
        precio_especial: product.precio_especial?.toString() || "",
        precio_oferta: product.precio_oferta?.toString() || "",
        iva: product.iva?.toString() || "16",
        ieps: product.ieps?.toString() || "0",
        stock: product.stock || 0,
        category_id: product.category_id?.toString() || "",
        photo_url: product.photo_url || "",
        codigo_barras: product.codigo_barras || "",
        codigo_interno: product.codigo_interno || "",
        activo: product.activo ?? true,
        family: "",
        subfamily: "",
      })
      setImagePreview(product.photo_url || "")
    }
  }, [product])

  const subfamilies = useMemo(() => {
    if (!formData.family) return []
    return [...new Set(
      categories
        .filter(c => c.family === formData.family)
        .map(c => c.subfamily)
    )]
  }, [formData.family, categories])

  // Inicializa family y subfamily si hay product y categorías cargadas
  useEffect(() => {
    if (product && categories.length) {
      const cat = categories.find(c => c.id == product.category_id)
      if (cat) {
        setFormData(p => ({ ...p, family: cat.family, subfamily: cat.subfamily }))
      }
    }
  }, [product, categories])

  const update = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  // --- MODIFICACIÓN: Convertir imagen a base64 ---
  const handleImageSelect = e => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)      // Mostrar la imagen en la UI
      update("photo_url", reader.result)   // Guardar base64 en formData
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview("")
    update("photo_url", "")
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    const selectedCategory = categories.find(
      c => c.family === formData.family && c.subfamily === formData.subfamily
    )

    if (!selectedCategory) {
      alert("Debe seleccionar una familia y subfamilia válidas")
      setLoading(false)
      return
    }

    const method = product ? "PUT" : "POST"
    const url = product
      ? `${API_URL}/products/${product.id}`
      : `${API_URL}/products`

    const body = {
      ...formData,
      precio_menudeo: parseFloat(formData.precio_menudeo) || null,
      precio_mayoreo: parseFloat(formData.precio_mayoreo) || null,
      precio_especial: parseFloat(formData.precio_especial) || null,
      precio_oferta: parseFloat(formData.precio_oferta) || null,
      iva: parseFloat(formData.iva) || null,
      ieps: parseFloat(formData.ieps) || null,
      stock: parseInt(formData.stock) || 0,
      category_id: selectedCategory.id,
      // photo_url ya está en base64
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      onSave()
    } catch (err) {
      console.error(err)
      alert("Error al guardar producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {product ? "Editar Producto" : "Nuevo Producto"}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.family || !formData.subfamily}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="imagen">Imagen</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <TabGeneral
            formData={formData}
            onChange={update}
            imagePreview={imagePreview}
            isEditing={!!product}
          />
        </TabsContent>

        <TabsContent value="precios">
          <TabPrecios formData={formData} onChange={update} />
        </TabsContent>

        <TabsContent value="inventario">
          <TabInventario
            formData={formData}
            categories={categories}
            subfamilies={subfamilies}
            onChange={update}
          />
        </TabsContent>

        <TabsContent value="imagen">
          <TabImagen
            imagePreview={imagePreview}
            onSelect={handleImageSelect}
            onRemove={removeImage}
          />
        </TabsContent>
      </Tabs>
    </form>
  )
}
