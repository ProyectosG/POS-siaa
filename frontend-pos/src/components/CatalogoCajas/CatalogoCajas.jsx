"use client"

import { useState, useEffect } from "react"
import { BoxIcon, Plus, Edit2, Trash2, Key, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/apiFetch"


export default function CatalogoCajas() {
  const [cajas, setCajas] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCaja, setEditingCaja] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    numero_caja: "",
    password: "",
    tipo_caja: "Normal",
  })

  // Cargar cajas al montar
  useEffect(() => {
    fetchCajas()
  }, [])

  const fetchCajas = async () => {
    try {
      const res = await apiFetch(`/cash-registers`)
      const data = await res.json()
      setCajas(data)
    } catch (err) {
      setError("Error al cargar cajas")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    try {
      setLoading(true)
      const url = editingCaja
        ? `/cash-registers/${editingCaja.id}`
        : `/cash-registers`

      const method = editingCaja ? "PUT" : "POST"

      const body = {
        numero_caja: formData.numero_caja,
        password: formData.password,
        tipo_caja: formData.tipo_caja || "Normal",
      }

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Error al guardar")
      }

      await fetchCajas()
      resetForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ numero_caja: "", password: "", tipo_caja: "Normal" })
    setIsFormOpen(false)
    setEditingCaja(null)
  }

  const handleEdit = (caja) => {
    setEditingCaja(caja)
    setFormData({
      numero_caja: caja.numero_caja,
      password: "", // No mostrar contraseña real
      tipo_caja: caja.tipo_caja,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta caja?")) return

    try {
      await apiFetch(`/cash-registers/${id}`, { method: "DELETE" })
      await fetchCajas()
    } catch (err) {
      setError("Error al eliminar")
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            <BoxIcon className="h-8 w-8 text-primario" />
            Catálogo de Cajas
          </h1>
          <p className="text-muted-foreground mt-2">Gestiona las cajas del punto de venta</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-suave border border-red-500/50 rounded-lg text-error text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primario" />
                  {editingCaja ? "Editar Caja" : "Nueva Caja"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_caja" className="text-foreground">
                      Número de Caja <span className="text-error">*</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="numero_caja"
                        name="numero_caja"
                        value={formData.numero_caja}
                        onChange={handleInputChange}
                        required
                        placeholder="001"
                        className="bg-muted border-border text-foreground pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground">
                      Clave de Caja <span className="text-error">*</span>
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required={!editingCaja}
                        placeholder={editingCaja ? "Dejar vacío para no cambiar" : "••••"}
                        className="bg-muted border-border text-foreground pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_caja" className="text-foreground">
                      Tipo de Caja
                    </Label>
                    <select
                      id="tipo_caja"
                      name="tipo_caja"
                      value={formData.tipo_caja}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Extraordinaria">Extraordinaria</option>
                      <option value="Especial">Especial</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    {editingCaja && (
                      <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600">
                      {loading ? "Guardando..." : editingCaja ? "Actualizar" : "Guardar"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

           <Card className="bg-gradient-to-br from-cyan-600 to-cyan-700 border-0 text-white mt-6">
              <CardHeader className="pb-3 flex flex-col items-center text-center">
                <CardDescription className="text-cyan-100 text-sm">
                  Total de Cajas
                </CardDescription>
                <CardTitle className="text-4xl">
                  {cajas.length}
                </CardTitle>
              </CardHeader>
            </Card>

          </div>

          {/* Lista */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <BoxIcon className="h-5 w-5 text-primario" />
                  Cajas Registradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cajas.length === 0 ? (
                  <div className="text-center py-12">
                    <BoxIcon className="h-16 w-16 text-slate-600 mx-auto mb-3" />
                    <p className="text-muted-foreground">No hay cajas registradas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cajas.map((caja) => (
                      <Card key={caja.id} className="bg-muted border-border hover:bg-muted transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <BoxIcon className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Caja N°</p>
                                <p className="text-2xl font-bold text-foreground">{caja.numero_caja}</p>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4 p-3 bg-card rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Tipo: <span className="font-mono">{caja.tipo_caja}</span></p>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(caja)} className="flex-1">
                              <Edit2 className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(caja.id)} className="flex-1 border-red-900/50 text-error hover:bg-error-suave">
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