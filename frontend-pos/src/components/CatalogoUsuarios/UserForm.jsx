"use client"

import { useState } from "react"
import { User, Mail, Phone, Lock, Shield, Upload, X, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
const MAX_IMAGE_SIZE = 700 * 1024 // 700 KB

export default function UserForm({ editingUser, onClose, onSuccess, setError }) {
  const [formData, setFormData] = useState({
    nickname: editingUser?.nickname || "",
    full_name: editingUser?.full_name || "",
    phone: editingUser?.phone || "",
    email: editingUser?.email || "",
    password: "",
    access_level: editingUser?.access_level || 1,
    photo_url: editingUser?.photo_url || "",
  })
  const [imagePreview, setImagePreview] = useState(editingUser?.photo_url || null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }


const handleImageSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  // 1️⃣ Validar peso antes de convertir
  if (file.size > MAX_IMAGE_SIZE) {
    alert("La imagen es demasiado pesada. Máximo permitido: 500 KB.")
    e.target.value = "" // reset input file
    return
  }

  // 2️⃣ Convertir a Base64
  const reader = new FileReader()
  reader.onloadend = () => {
    setImagePreview(reader.result)
    setFormData(prev => ({
      ...prev,
      photo_url: reader.result
    }))
  }

  reader.readAsDataURL(file)
}


  const removeImage = () => {
    setImagePreview(null)
    setFormData(prev => ({ ...prev, photo_url: "" }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    try {
      setLoading(true)
      const url = editingUser ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/users`
      const method = editingUser ? "PUT" : "POST"

      const body = {
        nickname: formData.nickname,
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        access_level: parseInt(formData.access_level),
        photo_url: formData.photo_url || null,
      }
      if (formData.password) body.password = formData.password

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Error al guardar")
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
  setFormData({
    nickname: "",
    full_name: "",
    phone: "",
    email: "",
    password: "",
    access_level: 1,
    photo_url: "",
  })
  setImagePreview(null)
  setShowPassword(false)
  onClose()
}
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h2>
            <p className="text-slate-400 mt-1">Completa el formulario</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-slate-400" />
          </Button>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Nickname *</Label>
                    <Input name="nickname" value={formData.nickname} onChange={handleInputChange} required className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Nombre Completo *</Label>
                    <Input name="full_name" value={formData.full_name} onChange={handleInputChange} required className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Teléfono *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input name="phone" value={formData.phone} onChange={handleInputChange} required className="pl-10 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input name="email" type="email" value={formData.email} onChange={handleInputChange} required className="pl-10 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Contraseña {editingUser ? "" : "*"}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        required={!editingUser}
                        placeholder={editingUser ? "Vacío para no cambiar" : "********"}
                        className="pl-10 pr-10 text-white"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Nivel de Acceso *</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select
                        name="access_level"
                        value={formData.access_level}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md py-2 pl-10 pr-4"
                      >
                        <option value="1">Cajero (1)</option>
                        <option value="50">Supervisor (50)</option>
                        <option value="90">Gerente (90)</option>
                        <option value="99">Administrador (99)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Upload className="h-5 w-5 text-purple-400" />
                    Foto del Usuario
                  </h3>
                  <div className="flex flex-col items-center gap-4">
                    {imagePreview || formData.photo_url ? (
                      <div className="relative">
                        <img src={imagePreview || formData.photo_url} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-slate-600" />
                        <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600">
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <Label htmlFor="photo" className="cursor-pointer">
                        <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-600 hover:border-purple-500 transition-colors">
                          <Upload className="h-8 w-8 text-slate-500 hover:text-purple-400" />
                        </div>
                        <Input id="photo" type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                      </Label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
                    {loading ? "Guardando..." : editingUser ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}