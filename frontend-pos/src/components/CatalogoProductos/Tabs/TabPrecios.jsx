"use client"

import { useRef } from "react"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DollarSign } from "lucide-react"

/* ===== ESTILO REUTILIZABLE FOCUS VERDE ===== */
const focusGreen = `
  transition-all duration-200
  focus-visible:ring-1
  focus-visible:ring-emerald-500
  focus-visible:border-emerald-500
  focus-visible:ring-offset-0
  focus-visible:ring-offset-transparent
`

export default function TabPrecios({ formData, onChange }) {
  /* =====================================================
     REFS DE NAVEGACIÓN CON ENTER
     ===================================================== */
  const menudeoRef = useRef(null)
  const mayoreoRef = useRef(null)
  const especialRef = useRef(null)
  const ofertaRef = useRef(null)
  const ivaRef = useRef(null)
  const iepsRef = useRef(null)

  /* =====================================================
     MANEJO CENTRALIZADO DE ENTER
     ===================================================== */
  const handleEnterFocus = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault()
      nextRef?.current?.focus()
      nextRef?.current?.select?.()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center justify-center">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          Precios
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6">

        {/* ================= PRECIOS ================= */}
        <div className="grid md:grid-cols-2 gap-6 justify-center">

          {/* MENÚDEO */}
          <div className="space-y-2 text-center">
            <Label>Precio Menudeo</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <Input
                ref={menudeoRef}
                className={`w-[15ch] pl-7 text-right ${focusGreen}`}
                value={formData.precio_menudeo}
                onKeyDown={(e) => handleEnterFocus(e, mayoreoRef)}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) {
                    onChange("precio_menudeo", v)
                  }
                }}
              />
            </div>
          </div>

          {/* MAYOREO */}
          <div className="space-y-2 text-center">
            <Label>Precio Mayoreo</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <Input
                ref={mayoreoRef}
                className={`w-[15ch] pl-7 text-right ${focusGreen}`}
                value={formData.precio_mayoreo}
                onKeyDown={(e) => handleEnterFocus(e, especialRef)}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) {
                    onChange("precio_mayoreo", v)
                  }
                }}
              />
            </div>
          </div>

          {/* ESPECIAL */}
          <div className="space-y-2 text-center">
            <Label>Precio Especial</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <Input
                ref={especialRef}
                className={`w-[15ch] pl-7 text-right ${focusGreen}`}
                value={formData.precio_especial}
                onKeyDown={(e) => handleEnterFocus(e, ofertaRef)}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) {
                    onChange("precio_especial", v)
                  }
                }}
              />
            </div>
          </div>

          {/* OFERTA */}
          <div className="space-y-2 text-center">
            <Label>Precio Oferta</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <Input
                ref={ofertaRef}
                className={`w-[15ch] pl-7 text-right ${focusGreen}`}
                value={formData.precio_oferta}
                onKeyDown={(e) => handleEnterFocus(e, ivaRef)}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) {
                    onChange("precio_oferta", v)
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* ================= SEPARADOR ================= */}
        <hr className="w-full border-t border-muted-foreground/40 my-4" />

        {/* ================= IVA / IEPS ================= */}
        <div className="flex gap-10 justify-center">

          {/* IVA */}
          <div className="space-y-2 text-center">
            <Label>IVA %</Label>
            <Input
              ref={ivaRef}
              className={`w-[10ch] text-right ${focusGreen}`}
              value={formData.iva}
              onKeyDown={(e) => handleEnterFocus(e, iepsRef)}
              onChange={(e) => onChange("iva", e.target.value)}
            />
          </div>

          {/* IEPS */}
          <div className="space-y-2 text-center">
            <Label>IEPS %</Label>
            <Input
              ref={iepsRef}
              className={`w-[10ch] text-right ${focusGreen}`}
              value={formData.ieps}
              onChange={(e) => onChange("ieps", e.target.value)}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
