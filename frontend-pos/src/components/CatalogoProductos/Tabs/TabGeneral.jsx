"use client"

import { useState, useEffect, useRef } from "react"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Tag } from "lucide-react"

/* ============================================================================
   ESTILO PRO REUTILIZABLE
   - Unifica el focus verde en todos los inputs / triggers
   - Evita inconsistencias visuales entre tabs
============================================================================ */
const focusGreen = `
  transition-all duration-200
  focus-visible:ring-1
  focus-visible:ring-emerald-500
  focus-visible:border-emerald-500
  focus-visible:ring-offset-0
  focus-visible:ring-offset-transparent
`

export default function TabGeneral({
  formData,
  onChange,
  imagePreview,
  isEditing,
  onGoToPrecios, // 👈 callback para cambiar al tab de precios
}) {
  /* ==========================================================================
     REFS DE NAVEGACIÓN POR TECLADO (ENTER)
     Controlan el flujo tipo POS
  ========================================================================== */
  const barcodeRef = useRef(null)
  const codigoInternoRef = useRef(null)
  const nombreRef = useRef(null)
  const presentacionRef = useRef(null)
  const unidadRef = useRef(null)

  const [barcodeEditable, setBarcodeEditable] = useState(!isEditing)

  /* ==========================================================================
     FOCUS AUTOMÁTICO AL HABILITAR CÓDIGO DE BARRAS
  ========================================================================== */
  useEffect(() => {
    if (!barcodeEditable) return

    const timer = setTimeout(() => {
      barcodeRef.current?.focus()
      barcodeRef.current?.select()
    }, 0)

    return () => clearTimeout(timer)
  }, [barcodeEditable])

  /* ==========================================================================
     MANEJO DE ENTER
     - Avanza foco entre inputs
     - Para Select (Unidad) puede abrir automáticamente
  ========================================================================== */
  const handleEnterFocus = (e, nextRef, openSelect = false) => {
    if (e.key !== "Enter") return

    e.preventDefault()
    if (!nextRef?.current) return

    nextRef.current.focus()

    // Radix Select necesita click explícito para abrir
    if (openSelect) {
      setTimeout(() => {
        nextRef.current.click()
      }, 0)
    }
  }

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

          {/* ===============================================================
              CÓDIGO DE BARRAS
              ENTER → Código Interno
          =============================================================== */}
          <div className="md:col-span-3 space-y-2">
            <Label>Código de Barras</Label>

            <div className="flex items-center gap-2">
              <Input
                ref={barcodeRef}
                readOnly={!barcodeEditable}
                value={formData.codigo_barras}
                onKeyDown={(e) =>
                  handleEnterFocus(e, codigoInternoRef)
                }
                onChange={(e) =>
                  onChange(
                    "codigo_barras",
                    e.target.value.trim().toUpperCase()
                  )
                }
                className={`
                  w-[20ch]
                  ${barcodeEditable ? "border-emerald-500" : "opacity-80"}
                  ${focusGreen}
                `}
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

          {/* ===============================================================
              CÓDIGO INTERNO
              ENTER → Nombre
          =============================================================== */}
          <div className="md:col-span-3 space-y-2">
            <Label>Código Interno</Label>
            <Input
              ref={codigoInternoRef}
              className={`w-[20ch] ${focusGreen}`}
              value={formData.codigo_interno}
              onKeyDown={(e) =>
                handleEnterFocus(e, nombreRef)
              }
              onChange={(e) =>
                onChange("codigo_interno", e.target.value.toUpperCase())
              }
            />
          </div>

          {/* ===============================================================
              NOMBRE
              ENTER → Presentación
          =============================================================== */}
          <div className="md:col-span-3 space-y-2">
            <Label>Nombre del Producto *</Label>
            <Input
              ref={nombreRef}
              required
              className={focusGreen}
              value={formData.articulo}
              onKeyDown={(e) =>
                handleEnterFocus(e, presentacionRef)
              }
              onChange={(e) =>
                onChange("articulo", e.target.value.toUpperCase())
              }
            />
          </div>

          {/* ===============================================================
              PRESENTACIÓN
              ENTER → Unidad (abre Select)
          =============================================================== */}
          <div className="md:col-span-2 space-y-2">
            <Label>Presentación</Label>
            <Input
              ref={presentacionRef}
              className={focusGreen}
              value={formData.presentacion}
              onKeyDown={(e) =>
                handleEnterFocus(e, unidadRef, true)
              }
              onChange={(e) =>
                onChange("presentacion", e.target.value.toUpperCase())
              }
            />
          </div>

          {/* ===============================================================
              UNIDAD
              - ENTER o CLICK selecciona
              - Al seleccionar → TabPrecios
          =============================================================== */}
          <div className="md:col-span-1 space-y-2">
            <Label>Unidad</Label>

            <Select
              value={formData.unidad_medida}
              onValueChange={(v) => {
                onChange("unidad_medida", v)

                // 👉 Cambio automático al tab de precios
                onGoToPrecios?.()
              }}
            >
              <SelectTrigger
                ref={unidadRef}
                className={focusGreen}
              >
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

        {/* ===============================================================
            ACTIVO
        =============================================================== */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div>
            <Label>Producto Activo</Label>
            <p className="text-xs text-muted-foreground">
              Disponible para venta
            </p>
          </div>
          <Switch
            checked={formData.activo}
            onCheckedChange={(v) => onChange("activo", v)}
          />
        </div>

        {/* ===============================================================
            PREVIEW IMAGEN
        =============================================================== */}
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
