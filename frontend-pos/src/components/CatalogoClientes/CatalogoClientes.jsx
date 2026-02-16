"use client"

import { useState, useEffect } from "react"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import CustomerForm from "./CustomerForm"
import CustomerList from "./CustomerList"
import CustomerDetail from "./CustomerDetail"
import { useCustomers } from "@/components/hooks/useCustomer.jsx"

export default function CatalogoClientes() {
  const {
    customers,
    loading,
    createCustomer,
    updateCustomer,
    deleteCustomer
  } = useCustomers()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (customers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(customers[0])
    }
  }, [customers])

  const filteredCustomers = customers.filter(c => {
    const fullName =
      `${c.first_name} ${c.last_name_paternal} ${c.last_name_maternal || ""}`.toLowerCase()
    const email = (c.email || "").toLowerCase()
    const phone = c.phone || ""
    const term = searchTerm.toLowerCase()

    return (
      fullName.includes(term) ||
      email.includes(term) ||
      phone.includes(term)
    )
  })

if (isFormOpen) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl flex flex-col overflow-hidden rounded-lg shadow-lg max-h-[95vh]">
        <div className="flex-1 overflow-y-auto">
          <CustomerForm
            initialData={editingCustomer || {}}
            isEditing={!!editingCustomer}
            onSubmit={
              editingCustomer
                ? (data) => updateCustomer(editingCustomer.id, data)
                : createCustomer
            }
            onCancel={() => {
              setIsFormOpen(false)
              setEditingCustomer(null)
            }}
          />
        </div>
      </div>
    </div>
  )
}


  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-white">
              Catálogo de Clientes
            </h1>
            <p className="text-slate-400">
              Gestión de clientes
            </p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>

          <div className="w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Panel izquierdo */}
          <CustomerList
            customers={filteredCustomers}
            selectedCustomer={selectedCustomer}
            onSelect={setSelectedCustomer}
            loading={loading}
          />

          {/* Panel derecho (más ancho) */}
          <CustomerDetail
            customer={selectedCustomer}
            onEdit={(c) => {
              setEditingCustomer(c)
              setIsFormOpen(true)
            }}
            onDelete={deleteCustomer}
          />
        </div>
      </div>
    </div>
  )
}
