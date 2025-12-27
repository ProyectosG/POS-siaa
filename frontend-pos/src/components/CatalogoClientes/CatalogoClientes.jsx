"use client"

import { useState } from "react"
import { User, Mail, Phone, MapPin, CreditCard, DollarSign, Edit2, Trash2, Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CatalogoClientes() {
  const [clientes, setClientes] = useState([
    {
      id: 1,
      first_name: "Juan",
      last_name_paternal: "García",
      last_name_maternal: "López",
      phone: "5551234567",
      email: "juan.garcia@email.com",
      address: "Av. Juárez 123, Col. Centro",
      rfc: "GALJ850101ABC",
      postal_code: "06000",
      city: "Ciudad de México",
      current_balance: 1500.5,
    },
    {
      id: 2,
      first_name: "María",
      last_name_paternal: "Hernández",
      last_name_maternal: "Ramírez",
      phone: "5559876543",
      email: "maria.hernandez@email.com",
      address: "Calle Reforma 456",
      rfc: "HERM900215XYZ",
      postal_code: "03100",
      city: "Ciudad de México",
      current_balance: 0,
    },
    {
      id: 3,
      first_name: "Carlos",
      last_name_paternal: "Martínez",
      last_name_maternal: "Sánchez",
      phone: "5552345678",
      email: "carlos.martinez@email.com",
      address: "Insurgentes Sur 789",
      rfc: "MASC920320DEF",
      postal_code: "04100",
      city: "Ciudad de México",
      current_balance: 2800.75,
    },
  ])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCliente, setSelectedCliente] = useState(clientes[0])

  const [formData, setFormData] = useState({
    first_name: "",
    last_name_paternal: "",
    last_name_maternal: "",
    phone: "",
    email: "",
    address: "",
    rfc: "",
    postal_code: "",
    city: "",
    current_balance: 0,
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "current_balance" ? Number.parseFloat(value) || 0 : value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingCliente) {
      const updatedClientes = clientes.map((cliente) =>
        cliente.id === editingCliente.id ? { ...formData, id: cliente.id } : cliente,
      )
      setClientes(updatedClientes)
      if (selectedCliente?.id === editingCliente.id) {
        setSelectedCliente({ ...formData, id: editingCliente.id })
      }
    } else {
      const nuevoCliente = {
        ...formData,
        id: clientes.length > 0 ? Math.max(...clientes.map((c) => c.id)) + 1 : 1,
      }
      setClientes([...clientes, nuevoCliente])
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name_paternal: "",
      last_name_maternal: "",
      phone: "",
      email: "",
      address: "",
      rfc: "",
      postal_code: "",
      city: "",
      current_balance: 0,
    })
    setIsFormOpen(false)
    setEditingCliente(null)
  }

  const handleEdit = (cliente) => {
    setEditingCliente(cliente)
    setFormData({
      first_name: cliente.first_name,
      last_name_paternal: cliente.last_name_paternal,
      last_name_maternal: cliente.last_name_maternal,
      phone: cliente.phone,
      email: cliente.email,
      address: cliente.address,
      rfc: cliente.rfc,
      postal_code: cliente.postal_code,
      city: cliente.city,
      current_balance: cliente.current_balance,
    })
    setIsFormOpen(true)
  }

  const handleDelete = (id) => {
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
      setClientes(clientes.filter((cliente) => cliente.id !== id))
      if (selectedCliente?.id === id) {
        const remaining = clientes.filter((c) => c.id !== id)
        setSelectedCliente(remaining.length > 0 ? remaining[0] : null)
      }
    }
  }

  const filteredClientes = clientes.filter(
    (cliente) =>
      cliente.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.last_name_paternal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.last_name_maternal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.phone.includes(searchTerm),
  )

  const totalSaldo = clientes.reduce((acc, cliente) => acc + cliente.current_balance, 0)
  const clientesConSaldo = clientes.filter((c) => c.current_balance > 0).length

  if (isFormOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white">{editingCliente ? "Editar Cliente" : "Nuevo Cliente"}</h2>
              <p className="text-slate-400 mt-1">
                {editingCliente
                  ? "Actualiza la información del cliente"
                  : "Completa el formulario para registrar un cliente"}
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
                {editingCliente && (
                  <div className="space-y-2">
                    <Label htmlFor="cliente_id" className="text-slate-200">
                      ID del Cliente
                    </Label>
                    <Input
                      id="cliente_id"
                      value={editingCliente.id}
                      readOnly
                      disabled
                      className="bg-slate-900/50 border-slate-600 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Información Personal */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-400" />
                    Información Personal
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-slate-200">
                        Nombre <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        maxLength={50}
                        required
                        placeholder="Juan"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-500 ease-out"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name_paternal" className="text-slate-200">
                        Apellido Paterno <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="last_name_paternal"
                        name="last_name_paternal"
                        value={formData.last_name_paternal}
                        onChange={handleInputChange}
                        maxLength={50}
                        required
                        placeholder="García"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-500 ease-out"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name_maternal" className="text-slate-200">
                        Apellido Materno
                      </Label>
                      <Input
                        id="last_name_maternal"
                        name="last_name_maternal"
                        value={formData.last_name_maternal}
                        onChange={handleInputChange}
                        maxLength={50}
                        placeholder="López"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-500 ease-out"
                      />
                    </div>
                  </div>
                </div>

                {/* Información de Contacto */}
                <div className="space-y-4 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Phone className="h-5 w-5 text-emerald-400" />
                    Información de Contacto
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 pl-10 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-500 ease-out"
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
                          placeholder="cliente@email.com"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 pl-10 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-500 ease-out"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dirección */}
                <div className="space-y-4 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-purple-400" />
                    Dirección
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-slate-200">
                        Dirección Completa
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        maxLength={200}
                        placeholder="Calle, Número, Colonia"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-500 ease-out"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-slate-200">
                          Ciudad
                        </Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          maxLength={100}
                          placeholder="Ciudad de México"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-500 ease-out"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="postal_code" className="text-slate-200">
                          Código Postal
                        </Label>
                        <Input
                          id="postal_code"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleInputChange}
                          maxLength={10}
                          placeholder="06000"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-500 ease-out"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información Fiscal */}
                <div className="space-y-4 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-amber-400" />
                    Información Fiscal y Saldo
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rfc" className="text-slate-200">
                        RFC
                      </Label>
                      <Input
                        id="rfc"
                        name="rfc"
                        value={formData.rfc}
                        onChange={handleInputChange}
                        maxLength={13}
                        placeholder="GALJ850101ABC"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-all duration-500 ease-out uppercase"
                      />
                    </div>

                    <div className="flex justify-center">
                      <div className="space-y-2 w-auto">
                        <Label htmlFor="current_balance" className="text-slate-200 text-center block">
                          Saldo Actual
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="current_balance"
                            name="current_balance"
                            type="number"
                            step="0.01"
                            value={formData.current_balance}
                            disabled
                            readOnly
                            placeholder="0.00"
                            className="bg-slate-900/50 border-slate-600 text-slate-400 placeholder:text-slate-500 pl-10 w-40 text-center cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
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
                    {editingCliente ? "Actualizar Cliente" : "Crear Cliente"}
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
        <div className="flex flex-col lg:flex-row justify-center items-center gap-8 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Catálogo de Clientes</h1>
            <p className="text-slate-400 mt-1">Gestiona la información de tus clientes</p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white lg:ml-20 px-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>

          <div className="w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400 pl-10 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="flex justify-center gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white w-32">
            <CardHeader className="pb-2 pt-3 px-3 text-center">
              <CardDescription className="text-blue-100 text-[10px]">Total Clientes</CardDescription>
              <CardTitle className="text-2xl">{clientes.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 text-white w-32">
            <CardHeader className="pb-2 pt-3 px-3 text-center">
              <CardDescription className="text-emerald-100 text-[10px]">Con Saldo</CardDescription>
              <CardTitle className="text-2xl">{clientesConSaldo}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-amber-600 to-amber-700 border-0 text-white w-32">
            <CardHeader className="pb-2 pt-3 px-3 text-center">
              <CardDescription className="text-amber-100 text-[10px]">Saldo Total</CardDescription>
              <CardTitle className="text-xl">${totalSaldo.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Clientes - Lado Izquierdo */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Lista de Clientes</CardTitle>
                <CardDescription className="text-slate-400">
                  Selecciona un cliente para ver sus detalles
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredClientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      onClick={() => setSelectedCliente(cliente)}
                      className={`w-full text-left p-4 border-b border-slate-700 hover:bg-slate-700/50 transition-all ${
                        selectedCliente?.id === cliente.id ? "bg-slate-700/70 border-l-4 border-l-blue-500" : ""
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">ID: {cliente.id}</span>
                          {cliente.current_balance > 0 && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                              ${cliente.current_balance.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-white">{cliente.first_name}</div>
                        <div className="text-sm text-slate-300">
                          {cliente.last_name_paternal} {cliente.last_name_maternal}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle del Cliente - Lado Derecho */}
          <div className="lg:col-span-2">
            {selectedCliente ? (
              <Card className="bg-slate-700/60 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl text-white">
                        {selectedCliente.first_name} {selectedCliente.last_name_paternal}{" "}
                        {selectedCliente.last_name_maternal}
                      </CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        ID del Cliente: {selectedCliente.id}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(selectedCliente)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(selectedCliente.id)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Información de Contacto */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Phone className="h-5 w-5 text-emerald-400" />
                      Información de Contacto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      <div>
                        <Label className="text-slate-400 text-xs">Teléfono</Label>
                        <p className="text-white flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {selectedCliente.phone}
                        </p>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Email</Label>
                        <p className="text-white flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {selectedCliente.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dirección */}
                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-400" />
                      Dirección
                    </h3>
                    <div className="space-y-2 pl-7">
                      {selectedCliente.address && (
                        <div>
                          <Label className="text-slate-400 text-xs">Dirección Completa</Label>
                          <p className="text-white mt-1">{selectedCliente.address}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {selectedCliente.city && (
                          <div>
                            <Label className="text-slate-400 text-xs">Ciudad</Label>
                            <p className="text-white mt-1">{selectedCliente.city}</p>
                          </div>
                        )}
                        {selectedCliente.postal_code && (
                          <div>
                            <Label className="text-slate-400 text-xs">Código Postal</Label>
                            <p className="text-white mt-1">{selectedCliente.postal_code}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Información Fiscal y Saldo */}
                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-amber-400" />
                      Información Fiscal y Saldo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      {selectedCliente.rfc && (
                        <div>
                          <Label className="text-slate-400 text-xs">RFC</Label>
                          <p className="text-white mt-1">{selectedCliente.rfc}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-slate-400 text-xs">Saldo Actual</Label>
                        <p
                          className={`text-2xl font-bold mt-1 ${
                            selectedCliente.current_balance > 0 ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          ${selectedCliente.current_balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-full flex items-center justify-center">
                <CardContent className="text-center p-12">
                  <User className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Selecciona un cliente de la lista para ver sus detalles</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {filteredClientes.length === 0 && !isFormOpen && (
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm mt-8">
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No se encontraron clientes</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
