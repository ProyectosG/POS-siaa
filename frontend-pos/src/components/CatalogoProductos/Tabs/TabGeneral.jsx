"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Tag } from "lucide-react"
import { useState } from "react"

export default function TabGeneral({ formData, onChange, imagePreview, isEditing }) {
  const [barcodeEditable, setBarcodeEditable] = useState(!isEditing)
 console.log(isEditing)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-emerald-500" />
          Información General
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

          {/* === CÓDIGO DE BARRAS CON EMOJIS 🔑 🔒 === */}
          <div className="md:col-span-3 space-y-2">
            <Label>Código de Barras</Label>

            <div className="flex items-center gap-2">
              <Input
                readOnly={!barcodeEditable}
                className={`w-[20ch] transition-all ${
                  barcodeEditable
                    ? "border-emerald-500 ring-1 ring-emerald-500"
                    : "opacity-80"
                }`}
                value={formData.codigo_barras}
                onChange={e => onChange("codigo_barras", e.target.value)}
              />

              {isEditing && (
                <button
                  type="button"
                  onClick={() => setBarcodeEditable(v => !v)}
                  className={`
                    w-9 h-9 flex items-center justify-center
                    text-xs rounded-md border
                    transition-all duration-200
                    ${
                      barcodeEditable
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-muted hover:bg-muted/70"
                    }
                  `}

                  title={
                    barcodeEditable
                      ? "Bloquear edición del código de barras"
                      : "Habilitar edición del código de barras"
                  }
                >
                  {barcodeEditable ? "🔒" : "🔑"}
                </button>
              )}
            </div>
          </div>

          {/* Código Interno */}
          <div className="md:col-span-3 space-y-2">
            <Label>Código Interno</Label>
            <Input
              className="w-[20ch]"
              value={formData.codigo_interno}
              onChange={e => onChange("codigo_interno", e.target.value)}
            />
          </div>

          {/* Nombre */}
          <div className="md:col-span-3 space-y-2">
            <Label>Nombre del Producto *</Label>
            <Input
              required
              value={formData.articulo}
              onChange={e => onChange("articulo", e.target.value)}
            />
          </div>

          {/* Presentación */}
          <div className="md:col-span-2 space-y-2">
            <Label>Presentación</Label>
            <Input
              value={formData.presentacion}
              onChange={e => onChange("presentacion", e.target.value)}
            />
          </div>

          {/* Unidad */}
          <div className="md:col-span-1 space-y-2">
            <Label>Unidad</Label>
            <Select
              value={formData.unidad_medida}
              onValueChange={v => onChange("unidad_medida", v)}
            >
              <SelectTrigger>
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

        {/* Switch Activo */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div>
            <Label>Producto Activo</Label>
            <p className="text-xs text-muted-foreground">
              Disponible para venta
            </p>
          </div>
          <Switch
            checked={formData.activo}
            onCheckedChange={v => onChange("activo", v)}
          />
        </div>

        {/* Preview */}
        {imagePreview && (
          <div className="flex justify-center">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-24 h-24 object-cover border rounded"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
