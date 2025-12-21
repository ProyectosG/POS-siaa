"use client"

import { useState } from "react"
import { User, Mail, Phone, Lock, Shield, Upload, X, Search, Edit2, Trash2, Plus, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CatalogoUsuarios() {
  const [users, setUsers] = useState([
    {
      id: 1,
      nickname: "admin",
      full_name: "Carlos Rodríguez",
      phone: "5551234567",
      email: "carlos@example.com",
      password: "********",
      access_level: "Administrador",
      photo_url: "/cashier.png",
    },
  ])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)

  const [formData, setFormData] = useState({
    nickname: "",
    full_name: "",
    phone: "",
    email: "",
    password: "",
    access_level: "Cajero",
    photo_url: null,
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
        setFormData((prev) => ({
          ...prev,
          photo_url: reader.result,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingUser) {
      setUsers(
        users.map((user) =>
          user.id === editingUser.id
            ? { ...formData, id: user.id, password: formData.password || user.password }
            : user,
        ),
      )
    } else {
      const newUser = {
        ...formData,
        id: users.length + 1,
        password: "********",
      }
      setUsers([...users, newUser])
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      nickname: "",
      full_name: "",
      phone: "",
      email: "",
      password: "",
      access_level: "Cajero",
      photo_url: null,
    })
    setImagePreview(null)
    setIsFormOpen(false)
    setEditingUser(null)
    setShowPassword(false)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      nickname: user.nickname,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      password: "",
      access_level: user.access_level,
      photo_url: user.photo_url,
    })
    setImagePreview(user.photo_url)
    setIsFormOpen(true)
  }

  const handleDelete = (id) => {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      setUsers(users.filter((user) => user.id !== id))
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (isFormOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h2>
              <p className="text-slate-400 mt-1">
                {editingUser ? "Actualiza la información del usuario" : "Completa el formulario para crear un usuario"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetForm}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información Principal */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-400" />
                    Información del Usuario
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nickname" className="text-slate-200">
                        Nickname <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="nickname"
                        name="nickname"
                        value={formData.nickname}
                        onChange={handleInputChange}
                        maxLength={20}
                        required
                        placeholder="usuario123"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-slate-200">
                        Nombre Completo <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        maxLength={50}
                        required
                        placeholder="Juan Pérez García"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-200">
                        Teléfono <span className="text-red-400">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          maxLength={15}
                          required
                          placeholder="5551234567"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-200">
                        Email <span className="text-red-400">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder="usuario@example.com"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-200">
                        Contraseña {editingUser ? "" : <span className="text-red-400">*</span>}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleInputChange}
                          required={!editingUser}
                          placeholder={editingUser ? "Dejar vacío para mantener" : "********"}
                          className="bg-slate-700/50 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="access_level" className="text-slate-200">
                        Nivel de Acceso <span className="text-red-400">*</span>
                      </Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          id="access_level"
                          name="access_level"
                          value={formData.access_level}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Cajero">Cajero</option>
                          <option value="Supervisor">Supervisor</option>
                          <option value="Administrador">Administrador</option>
                          <option value="Gerente">Gerente</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Foto del Usuario */}
                <div className="space-y-4 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Upload className="h-5 w-5 text-purple-400" />
                    Foto del Usuario
                  </h3>

                  <div className="flex flex-col items-center gap-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Preview"
                          className="w-32 h-32 rounded-full object-cover border-4 border-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null)
                            setFormData((prev) => ({ ...prev, photo_url: null }))
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-600">
                        <User className="h-12 w-12 text-slate-500" />
                      </div>
                    )}

                    <Label htmlFor="photo" className="cursor-pointer">
                      <div className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {imagePreview ? "Cambiar Foto" : "Subir Foto"}
                      </div>
                      <Input id="photo" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </Label>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-6 border-t border-slate-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {editingUser ? "Actualizar Usuario" : "Crear Usuario"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

 return (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
    <div className="max-w-7xl mx-auto">
      {/* Header con título, botón y buscador */}
      <div className="flex flex-col items-center gap-4 mb-8">
        {/* Título */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Catálogo de Usuarios</h1>
          <p className="text-slate-400 mt-1">Gestiona los usuarios del sistema</p>
        </div>

        {/* Botón Nuevo Usuario */}
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>

        {/* Buscador */}
        <div className="w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400 pl-10 focus:border-blue-500 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="flex justify-center gap-3 mb-8">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white w-24">
          <CardHeader className="pb-1 pt-2 px-2 text-center">
            <CardDescription className="text-blue-100 text-[9px]">Total</CardDescription>
            <CardTitle className="text-lg">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 text-white w-24">
          <CardHeader className="pb-1 pt-2 px-2 text-center">
            <CardDescription className="text-purple-100 text-[9px]">Admins</CardDescription>
            <CardTitle className="text-lg">
              {users.filter((u) => u.access_level === "Administrador").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 text-white w-24">
          <CardHeader className="pb-1 pt-2 px-2 text-center">
            <CardDescription className="text-emerald-100 text-[9px]">Cajeros</CardDescription>
            <CardTitle className="text-lg">{users.filter((u) => u.access_level === "Cajero").length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de usuarios */}
      <div className="max-w-md mx-auto space-y-4">
        {filteredUsers.map((user) => (
          <Card
            key={user.id}
            className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-all"
          >
         <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <img
                    src={user.photo_url || "/placeholder.svg?height=80&width=80"}
                    alt={user.full_name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-600"
                  />
                  <div className="w-full">
                    <h3 className="text-lg font-semibold text-white">{user.full_name}</h3>
                    <p className="text-sm text-blue-400">@{user.nickname}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <Shield className="h-3 w-3 text-purple-400" />
                        <span className="text-xs text-purple-400 font-medium">{user.access_level}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-slate-700">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(user)}
                    className="w-24 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(user.id)}
                    className="w-24 border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No se encontraron usuarios</p>
          </CardContent>
        </Card>
      )}
    </div>
  </div>
)}
