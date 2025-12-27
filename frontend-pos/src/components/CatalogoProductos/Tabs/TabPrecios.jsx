"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DollarSign } from "lucide-react"

const FIELDS = [
  { key: "precio_menudeo", label: "Precio Menudeo" },
  { key: "precio_mayoreo", label: "Precio Mayoreo" },
  { key: "precio_especial", label: "Precio Especial" },
  { key: "precio_oferta", label: "Precio Oferta" },
]

export default function TabPrecios({ formData, onChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center justify-center">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          Precios
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6">

        {/* Precios */}
        <div className="grid md:grid-cols-2 gap-6 justify-center">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-2 flex flex-col items-center">
              <Label>{label}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  className="
                    w-[15ch] pl-7 text-right
                    transition-all duration-200
                    hover:border-emerald-400
                    focus:ring-2 focus:ring-emerald-500
                    focus:border-emerald-500
                  "
                  value={formData[key]}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) onChange(key, v)
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Separador */}
        <hr className="w-full border-t border-muted-foreground/40 my-4" />

        {/* IVA / IEPS */}
        <div className="flex gap-10 justify-center">
          <div className="space-y-2 text-center">
            <Label>IVA %</Label>
            <Input
              className="
                w-[10ch] text-right
                transition-all duration-200
                hover:border-emerald-400
                focus:ring-2 focus:ring-emerald-500
                focus:border-emerald-500
              "
              value={formData.iva}
              onChange={(e) => onChange("iva", e.target.value)}
            />
          </div>

          <div className="space-y-2 text-center">
            <Label>IEPS %</Label>
            <Input
              className="
                w-[10ch] text-right
                transition-all duration-200
                hover:border-emerald-400
                focus:ring-2 focus:ring-emerald-500
                focus:border-emerald-500
              "
              value={formData.ieps}
              onChange={(e) => onChange("ieps", e.target.value)}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
