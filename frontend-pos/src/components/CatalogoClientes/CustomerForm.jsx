"use client"

import { useState } from "react"
import { 
  User, Mail, Phone, MapPin, CreditCard, X, DollarSign 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import toast from "react-hot-toast"
import { useSettingsStore } from "@/store/useSettingsStore"


export default function CustomerForm({
  initialData = {},
  onSubmit,
  onCancel,
  isEditing = false
}) {
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
    ...initialData
  })

  // 🟢 CONSUMIMOS SETTINGS GLOBALES
    const settings = useSettingsStore((s) => s.settings)
    const FORM_MODE = settings.customer_form_mode || "complete" // 🟢 ahora también desde settings globales
  

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === "current_balance" ? Number(value) || 0 : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.first_name || !formData.last_name_paternal) {
      toast.error("Nombre y apellido paterno son obligatorios")
      return
    }

    try {
      await onSubmit(formData)
      onCancel()
    } catch (err) {
      toast.error(err.message || "Error al guardar el cliente")
    }
  }

  const isBasic = FORM_MODE === "basic"

  return (
<div className="flex justify-center items-start p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
  <div
    className={`w-full max-w-4xl flex flex-col overflow-hidden rounded-lg shadow-lg ${
      isBasic ? "max-h-[75vh]" : "max-h-[90vh]"
    }`}
  >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
            </h2>
            <p className="text-slate-400 mt-1">
              {isEditing
                ? "Actualiza la información del cliente"
                : "Completa el formulario para registrar un cliente"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm flex-1 overflow-y-auto">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="cliente_id" className="text-slate-200">
                    ID del Cliente
                  </Label>
                  <Input
                    id="cliente_id"
                    value={initialData.id || ""}
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
                      value={formData.first_name || ""}
                      onChange={handleChange}
                      maxLength={50}
                      required
                      placeholder="Juan"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name_paternal" className="text-slate-200">
                      Apellido Paterno <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="last_name_paternal"
                      name="last_name_paternal"
                      value={formData.last_name_paternal || ""}
                      onChange={handleChange}
                      maxLength={50}
                      required
                      placeholder="García"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name_maternal" className="text-slate-200">
                      Apellido Materno
                    </Label>
                    <Input
                      id="last_name_maternal"
                      name="last_name_maternal"
                      value={formData.last_name_maternal || ""}
                      onChange={handleChange}
                      maxLength={50}
                      placeholder="López"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
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
                    <Label htmlFor="phone" className="text-slate-200">Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone || ""}
                        onChange={handleChange}
                        maxLength={15}
                        placeholder="5551234567"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email || ""}
                        onChange={handleChange}
                        placeholder="cliente@email.com"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dirección y fiscal */}
              {!isBasic && (
                <>
                  <div className="space-y-4 pt-6 border-t border-slate-700">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-400" />
                      Dirección
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-slate-200">Dirección Completa</Label>
                        <Input
                          id="address"
                          name="address"
                          value={formData.address || ""}
                          onChange={handleChange}
                          maxLength={200}
                          placeholder="Calle, Número, Colonia"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-slate-200">Ciudad</Label>
                          <Input
                            id="city"
                            name="city"
                            value={formData.city || ""}
                            onChange={handleChange}
                            maxLength={100}
                            placeholder="Ciudad de México"
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postal_code" className="text-slate-200">Código Postal</Label>
                          <Input
                            id="postal_code"
                            name="postal_code"
                            value={formData.postal_code || ""}
                            onChange={handleChange}
                            maxLength={10}
                            placeholder="06000"
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-700">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-amber-400" />
                      Información Fiscal y Saldo
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rfc" className="text-slate-200">RFC</Label>
                        <Input
                          id="rfc"
                          name="rfc"
                          value={formData.rfc || ""}
                          onChange={handleChange}
                          maxLength={13}
                          placeholder="GALJ850101ABC"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 uppercase"
                        />
                      </div>

                      <div className="flex justify-center">
                        <div className="space-y-2 w-auto">
                          <Label htmlFor="current_balance" className="text-slate-200 text-center block">Saldo Actual</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              id="current_balance"
                              name="current_balance"
                              type="number"
                              step="0.01"
                              value={formData.current_balance || 0}
                              disabled
                              readOnly
                              className="bg-slate-900/50 border-slate-600 text-slate-400 placeholder:text-slate-500 pl-10 w-40 text-center cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-6 border-t border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isEditing ? "Actualizar Cliente" : "Crear Cliente"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
