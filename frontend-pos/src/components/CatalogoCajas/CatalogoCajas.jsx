"use client"

import { useState } from "react"
import { BoxIcon, Plus, Edit2, Trash2, Key, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CatalogoCajas() {
  const [cajas, setCajas] = useState([
    { id: 1, numero_caja: "001", clave_caja: "1234" },
    { id: 2, numero_caja: "002", clave_caja: "5678" },
    { id: 3, numero_caja: "003", clave_caja: "9012" },
  ])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCaja, setEditingCaja] = useState(null)

  const [formData, setFormData] = useState({
    numero_caja: "",
    clave_caja: "",
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validar que no exista ya ese número de caja
    const cajaExistente = cajas.find(
      (c) => c.numero_caja === formData.numero_caja && (!editingCaja || c.id !== editingCaja.id),
    )

    if (cajaExistente) {
      alert("Ya existe una caja con ese número")
      return
    }

    if (editingCaja) {
      setCajas(cajas.map((caja) => (caja.id === editingCaja.id ? { ...formData, id: caja.id } : caja)))
    } else {
      const nuevaCaja = {
        ...formData,
        id: cajas.length > 0 ? Math.max(...cajas.map((c) => c.id)) + 1 : 1,
      }
      setCajas([...cajas, nuevaCaja])
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      numero_caja: "",
      clave_caja: "",
    })
    setIsFormOpen(false)
    setEditingCaja(null)
  }

  const handleEdit = (caja) => {
    setEditingCaja(caja)
    setFormData({
      numero_caja: caja.numero_caja,
      clave_caja: caja.clave_caja,
    })
    setIsFormOpen(true)
  }

  const handleDelete = (id) => {
    if (confirm("¿Estás seguro de eliminar esta caja?")) {
      setCajas(cajas.filter((caja) => caja.id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <BoxIcon className="h-8 w-8 text-cyan-400" />
            Catálogo de Cajas
          </h1>
          <p className="text-slate-400 mt-2">Gestiona las cajas del punto de venta</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Izquierdo - Formulario */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm transition-all duration-500 ease-out hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:border-cyan-500/50 focus-within:shadow-[0_0_30px_rgba(34,211,238,0.4)] focus-within:border-cyan-500/60">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-cyan-400" />
                  {editingCaja ? "Editar Caja" : "Nueva Caja"}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {editingCaja ? "Modifica los datos de la caja" : "Registra una nueva caja"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_caja" className="text-slate-200">
                      Número de Caja <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="numero_caja"
                        name="numero_caja"
                        value={formData.numero_caja}
                        onChange={handleInputChange}
                        maxLength={10}
                        required
                        placeholder="001"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-500 pl-10 transition-all duration-500 ease-out hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] focus:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clave_caja" className="text-slate-200">
                      Clave de Caja <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="clave_caja"
                        name="clave_caja"
                        type="password"
                        value={formData.clave_caja}
                        onChange={handleInputChange}
                        maxLength={20}
                        required
                        placeholder="••••"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-500 pl-10 transition-all duration-500 ease-out hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] focus:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    {editingCaja && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent"
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                    >
                      {editingCaja ? "Actualizar" : "Guardar"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Estadísticas */}
            <Card className="bg-gradient-to-br from-cyan-600 to-cyan-700 border-0 text-white mt-6">
              <CardHeader className="pb-3">
                <CardDescription className="text-cyan-100 text-sm">Total de Cajas</CardDescription>
                <CardTitle className="text-4xl">{cajas.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Panel Derecho - Lista de Cajas */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BoxIcon className="h-5 w-5 text-cyan-400" />
                  Cajas Registradas
                </CardTitle>
                <CardDescription className="text-slate-400">Listado de todas las cajas del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {cajas.length === 0 ? (
                  <div className="text-center py-12">
                    <BoxIcon className="h-16 w-16 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No hay cajas registradas</p>
                    <p className="text-sm text-slate-500 mt-1">Comienza agregando una nueva caja</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cajas.map((caja) => (
                      <Card
                        key={caja.id}
                        className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <BoxIcon className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Caja N°</p>
                                <p className="text-2xl font-bold text-white">{caja.numero_caja}</p>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Key className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm">Clave:</span>
                              <span className="text-sm font-mono">{"•".repeat(caja.clave_caja.length)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(caja)}
                              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-cyan-500"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(caja.id)}
                              className="flex-1 border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 hover:border-red-500"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
