"use client"

import { useState, useEffect } from "react"
import Header from "./Header"
import PanelFormularios from "./PanelFormularios"
import ArbolFamilias from "./ArbolFamilias"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function CatalogoFamilias() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [nuevaFamilia, setNuevaFamilia] = useState("")
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState("")
  const [nuevaSubfamilia, setNuevaSubfamilia] = useState("")

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/categories`)
      const data = await res.json()
      setCategories(data)
    } catch {
      setError("Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const uniqueFamilies = [...new Set(categories.map(c => c.family))]
  const familiasAgrupadas = uniqueFamilies.map(family => ({
    family,
    subfamilias: categories.filter(c => c.family === family),
  }))

  const handleAgregarFamilia = async () => {
    if (!nuevaFamilia.trim()) return
    await fetch(`${API_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family: nuevaFamilia.trim() }),
    })
    setNuevaFamilia("")
    fetchCategories()
  }

  const handleAgregarSubfamilia = async () => {
    if (!familiaSeleccionada || !nuevaSubfamilia.trim()) return
    await fetch(`${API_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        family: familiaSeleccionada,
        subfamily: nuevaSubfamilia.trim(),
      }),
    })
    setNuevaSubfamilia("")
    fetchCategories()
  }

  const handleEliminar = async (id) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return
    await fetch(`${API_URL}/categories/${id}`, { method: "DELETE" })
    fetchCategories()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Header />

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PanelFormularios
            nuevaFamilia={nuevaFamilia}
            setNuevaFamilia={setNuevaFamilia}
            familiaSeleccionada={familiaSeleccionada}
            setFamiliaSeleccionada={setFamiliaSeleccionada}
            nuevaSubfamilia={nuevaSubfamilia}
            setNuevaSubfamilia={setNuevaSubfamilia}
            uniqueFamilies={uniqueFamilies}
            categories={categories}
            handleAgregarFamilia={handleAgregarFamilia}
            handleAgregarSubfamilia={handleAgregarSubfamilia}
          />

          <ArbolFamilias
            loading={loading}
            familiasAgrupadas={familiasAgrupadas}
            categories={categories}
            handleEliminar={handleEliminar}
          />
        </div>
      </div>
    </div>
  )
}
