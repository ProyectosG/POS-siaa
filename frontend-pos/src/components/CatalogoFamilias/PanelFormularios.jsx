"use client"

import { useEffect, useState } from "react"
import { Plus, FolderPlus, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PanelFormularios({
  nuevaFamilia,
  setNuevaFamilia,
  familiaSeleccionada,
  setFamiliaSeleccionada,
  nuevaSubfamilia,
  setNuevaSubfamilia,
  uniqueFamilies,
  categories,
  handleAgregarFamilia,
  handleAgregarSubfamilia,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      className={`
        space-y-6
        transition-all duration-500 ease-out
        ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      {/* Agregar Familia */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm transition-all duration-500 ease-out hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:border-blue-500/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-blue-400" />
            Agregar Familia
          </CardTitle>
          <CardDescription className="text-slate-400">
            Crea una nueva categoría principal de productos
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nuevaFamilia" className="text-slate-200">
              Nombre de la Familia
            </Label>
            <Input
              id="nuevaFamilia"
              value={nuevaFamilia}
              onChange={(e) => setNuevaFamilia(e.target.value.toUpperCase())}
              maxLength={30}
              placeholder="EJ: BEBIDAS, ABARROTES..."
              className="bg-slate-700/50 border-slate-600 text-white uppercase placeholder:text-slate-400 focus:border-blue-500 transition-all duration-300"
              onKeyPress={(e) => e.key === "Enter" && handleAgregarFamilia()}
            />
          </div>

          <Button
            onClick={handleAgregarFamilia}
            disabled={!nuevaFamilia.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Guardar Familia
          </Button>
        </CardContent>
      </Card>

      {/* Agregar Subfamilia */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm transition-all duration-500 ease-out hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-500/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-purple-400" />
            Agregar Subfamilia
          </CardTitle>
          <CardDescription className="text-slate-400">
            Añade una subcategoría a una familia existente
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">
              Seleccionar Familia <span className="text-red-400">*</span>
            </Label>
            <Select value={familiaSeleccionada} onValueChange={setFamiliaSeleccionada}>
              <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-white focus:border-purple-500 transition-all duration-300">
                <SelectValue placeholder="Elige una familia..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {uniqueFamilies.map(f => (
                  <SelectItem
                    key={f}
                    value={f}
                    className="text-white hover:bg-slate-700 uppercase"
                  >
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Nombre de la Subfamilia</Label>
            <Input
              value={nuevaSubfamilia}
              onChange={(e) => setNuevaSubfamilia(e.target.value.toUpperCase())}
              maxLength={30}
              placeholder="EJ: REFRESCOS, CEREALES..."
              disabled={!familiaSeleccionada}
              className="bg-slate-700/50 border-slate-600 text-white uppercase placeholder:text-slate-400 focus:border-purple-500 disabled:opacity-50 transition-all duration-300"
              onKeyPress={(e) => e.key === "Enter" && handleAgregarSubfamilia()}
            />
          </div>

          <Button
            onClick={handleAgregarSubfamilia}
            disabled={!familiaSeleccionada || !nuevaSubfamilia.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Guardar Subfamilia
          </Button>
        </CardContent>
      </Card>


    {/* Estadísticas */}
      {/* Estadísticas */}
<div className="grid grid-cols-2 gap-3 justify-center">
  <Card className="h-20 bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 text-white">
    <CardHeader className="py-1 px-3">
      <CardDescription className="text-emerald-100 text-[10px] text-center">
        Total Familias
      </CardDescription>
      <CardTitle className="text-xl leading-tight text-center">
        {uniqueFamilies.length}
      </CardTitle>
    </CardHeader>
  </Card>

  <Card className="h-20 bg-gradient-to-br from-violet-600 to-violet-700 border-0 text-white">
    <CardHeader className="py-1 px-3">
      <CardDescription className="text-violet-100 text-[10px] text-center">
        Total Subfamilias
      </CardDescription>
      <CardTitle className="text-xl leading-tight text-center">
        {categories.length}
      </CardTitle>
    </CardHeader>
  </Card>
</div>

    </div>
  )
}
