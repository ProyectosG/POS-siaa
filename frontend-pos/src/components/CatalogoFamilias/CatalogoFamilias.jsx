"use client"

import { useState } from "react"
import { FolderTree, Plus, Trash2, FolderPlus, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CatalogoFamilias() {
  const [familias, setFamilias] = useState([
    {
      id: 1,
      nombre: "Bebidas",
      subfamilias: [
        { id: 1, nombre: "Refrescos" },
        { id: 2, nombre: "Aguas" },
        { id: 3, nombre: "Jugos" },
      ],
    },
    {
      id: 2,
      nombre: "Abarrotes",
      subfamilias: [
        { id: 4, nombre: "Cereales" },
        { id: 5, nombre: "Enlatados" },
      ],
    },
  ])

  const [nuevaFamilia, setNuevaFamilia] = useState("")
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState("")
  const [nuevaSubfamilia, setNuevaSubfamilia] = useState("")

  const handleAgregarFamilia = () => {
    if (nuevaFamilia.trim()) {
      const nuevaFam = {
        id: familias.length > 0 ? Math.max(...familias.map((f) => f.id)) + 1 : 1,
        nombre: nuevaFamilia.trim(),
        subfamilias: [],
      }
      setFamilias([...familias, nuevaFam])
      setNuevaFamilia("")
    }
  }

  const handleAgregarSubfamilia = () => {
    if (familiaSeleccionada && nuevaSubfamilia.trim()) {
      setFamilias(
        familias.map((fam) => {
          if (fam.id.toString() === familiaSeleccionada) {
            const maxSubId = fam.subfamilias.length > 0 ? Math.max(...fam.subfamilias.map((s) => s.id)) : 0
            return {
              ...fam,
              subfamilias: [
                ...fam.subfamilias,
                {
                  id: maxSubId + 1,
                  nombre: nuevaSubfamilia.trim(),
                },
              ],
            }
          }
          return fam
        }),
      )
      setNuevaSubfamilia("")
    }
  }

  const handleEliminarFamilia = (familiaId) => {
    if (confirm("¿Estás seguro de eliminar esta familia y todas sus subfamilias?")) {
      setFamilias(familias.filter((fam) => fam.id !== familiaId))
      if (familiaSeleccionada === familiaId.toString()) {
        setFamiliaSeleccionada("")
      }
    }
  }

  const handleEliminarSubfamilia = (familiaId, subfamiliaId) => {
    if (confirm("¿Estás seguro de eliminar esta subfamilia?")) {
      setFamilias(
        familias.map((fam) => {
          if (fam.id === familiaId) {
            return {
              ...fam,
              subfamilias: fam.subfamilias.filter((sub) => sub.id !== subfamiliaId),
            }
          }
          return fam
        }),
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <FolderTree className="h-8 w-8 text-cyan-400" />
            Catálogo de Familias y Subfamilias
          </h1>
          <p className="text-slate-400 mt-2">Gestiona la clasificación de tus productos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel Izquierdo - Formularios */}
          <div className="space-y-6">
            {/* Sección Familias */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm transition-all duration-500 ease-out hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:border-blue-500/50 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.4)] focus-within:border-blue-500/60">
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
                    onChange={(e) => setNuevaFamilia(e.target.value)}
                    maxLength={30}
                    placeholder="Ej: Bebidas, Abarrotes, Lácteos..."
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 transition-all duration-300"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAgregarFamilia()
                      }
                    }}
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

            {/* Sección Subfamilias */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm transition-all duration-500 ease-out hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-500/50 focus-within:shadow-[0_0_30px_rgba(168,85,247,0.4)] focus-within:border-purple-500/60">
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
                  <Label htmlFor="familiaSelect" className="text-slate-200">
                    Seleccionar Familia <span className="text-red-400">*</span>
                  </Label>
                  <Select value={familiaSeleccionada} onValueChange={setFamiliaSeleccionada}>
                    <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-white focus:border-purple-500 transition-all duration-300">
                      <SelectValue placeholder="Elige una familia..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {familias.map((fam) => (
                        <SelectItem key={fam.id} value={fam.id.toString()} className="text-white hover:bg-slate-700">
                          {fam.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nuevaSubfamilia" className="text-slate-200">
                    Nombre de la Subfamilia
                  </Label>
                  <Input
                    id="nuevaSubfamilia"
                    value={nuevaSubfamilia}
                    onChange={(e) => setNuevaSubfamilia(e.target.value)}
                    maxLength={30}
                    placeholder="Ej: Refrescos, Cereales, Yogurt..."
                    disabled={!familiaSeleccionada}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500 disabled:opacity-50 transition-all duration-300"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAgregarSubfamilia()
                      }
                    }}
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
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 text-white">
                <CardHeader className="pb-2 pt-4">
                  <CardDescription className="text-emerald-100 text-xs">Total Familias</CardDescription>
                  <CardTitle className="text-3xl">{familias.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-violet-600 to-violet-700 border-0 text-white">
                <CardHeader className="pb-2 pt-4">
                  <CardDescription className="text-violet-100 text-xs">Total Subfamilias</CardDescription>
                  <CardTitle className="text-3xl">
                    {familias.reduce((acc, fam) => acc + fam.subfamilias.length, 0)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Panel Derecho - Árbol */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-full transition-all duration-500 ease-out hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:border-cyan-500/50 focus-within:shadow-[0_0_30px_rgba(34,211,238,0.4)] focus-within:border-cyan-500/60">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-cyan-400" />
                  Árbol de Categorías
                </CardTitle>
                <CardDescription className="text-slate-400">Vista jerárquica de familias y subfamilias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                  {familias.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderTree className="h-16 w-16 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No hay familias registradas</p>
                      <p className="text-sm text-slate-500 mt-1">Comienza agregando una familia</p>
                    </div>
                  ) : (
                    familias.map((familia) => (
                      <div
                        key={familia.id}
                        className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 hover:bg-slate-700/50 transition-all duration-300 ease-out hover:shadow-lg"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FolderPlus className="h-5 w-5 text-blue-400" />
                            <h3 className="text-white font-semibold text-lg">{familia.nombre}</h3>
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                              {familia.subfamilias.length} sub
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEliminarFamilia(familia.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {familia.subfamilias.length > 0 ? (
                          <div className="ml-6 space-y-2 border-l-2 border-slate-600 pl-4">
                            {familia.subfamilias.map((subfamilia) => (
                              <div
                                key={subfamilia.id}
                                className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-2 group hover:bg-slate-800 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-purple-400"></div>
                                  <span className="text-slate-300 text-sm">{subfamilia.nombre}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEliminarSubfamilia(familia.id, subfamilia.id)}
                                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/20 h-6 w-6 p-0 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm ml-6 italic">Sin subfamilias</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
