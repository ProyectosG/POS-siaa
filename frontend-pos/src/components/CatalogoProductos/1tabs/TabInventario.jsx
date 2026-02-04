"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Package } from "lucide-react"
import { useState, useEffect } from "react"

export default function TabInventario({ formData, categories, subfamilies, onChange }) {
  const [animateSubfamily, setAnimateSubfamily] = useState(false)

  // Animación al cambiar familia
  useEffect(() => {
    if (formData.family) {
      setAnimateSubfamily(true)
      const timeout = setTimeout(() => setAnimateSubfamily(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [formData.family])

  // Actualiza category_id solo si cambia la selección real
  useEffect(() => {
    if (formData.family && formData.subfamily) {
      const selectedCategory = categories.find(
        c => c.family === formData.family && c.subfamily === formData.subfamily
      )
      if (selectedCategory && formData.category_id !== selectedCategory.id.toString()) {
        onChange("category_id", selectedCategory.id.toString())
      }
    } else if (formData.category_id !== "") {
      onChange("category_id", "") // limpia si no hay selección válida
    }
  }, [formData.family, formData.subfamily, categories, formData.category_id, onChange])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <Package className="w-5 h-5 text-violet-500" />
          Inventario
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-8">

        {/* Fila 1: Familia */}
        <div className="space-y-2">
          <Label>Familia</Label>
          <Select
            value={formData.family}
            onValueChange={(v) => onChange("family", v)}
          >
            <SelectTrigger className="w-[40ch] transition-all duration-200 focus:ring-2 focus:ring-violet-500 hover:border-violet-400">
              <SelectValue placeholder="Seleccione familia" />
            </SelectTrigger>
            <SelectContent>
              {[...new Set(categories.map((c) => c.family))].map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fila 2: Subfamilia */}
        <div className="space-y-2 pl-[20ch]">
          <Label>Subfamilia</Label>
          <Select
            key={formData.family}
            value={formData.subfamily}
            onValueChange={(v) => onChange("subfamily", v)}
            disabled={!formData.family}
          >
            <SelectTrigger
              className={`w-[40ch] transition-all duration-200 focus:ring-2 focus:ring-violet-500 hover:border-violet-400 
                ${animateSubfamily ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"}
              `}
            >
              <SelectValue
                placeholder={
                  formData.family
                    ? "Seleccione subfamilia"
                    : "Primero seleccione familia"
                }
              />
            </SelectTrigger>
            <SelectContent className="transition-all duration-300 ease-out">
              {subfamilies.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No hay subfamilias
                </div>
              ) : (
                subfamilies.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Fila 3: Stock */}
        <div className="flex justify-center">
          <div className="w-full max-w-sm p-6 bg-muted/40 border border-border rounded-xl text-center">
            <Label className="block mb-2">Stock Actual</Label>
            <p className="text-6xl font-bold">{formData.stock}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Unidades disponibles
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
