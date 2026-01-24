"use client"

import { useState, useEffect } from "react"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import UserForm from "./UserForm"
import UserCard from "./UserCard"
import UserStats from "./UserStats.jsx"
import { useAuthStore } from "@/store/useAuthStore"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function CatalogoUsuarios() {
  const logout = useAuthStore((s) => s.logout)

  const [users, setUsers] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/users`, {
        credentials: "include",
      })

      // 🔒 Sesión inválida
      if (res.status === 401 || res.status === 403) {
        logout()
        return
      }

      const data = await res.json()

      // 🛡️ Backend devolvió error
      if (data?.error) {
        console.warn("Backend error /users:", data)
        setUsers([])
        setError("No se pudieron cargar los usuarios")
        return
      }

      // 🛡️ Backend no devolvió array
      if (!Array.isArray(data)) {
        console.warn("Respuesta inesperada /users:", data)
        setUsers([])
        setError("Datos inválidos de usuarios")
        return
      }

      setUsers(data)
    } catch (err) {
      console.error("Fetch /users falló:", err)
      setUsers([])
      setError("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  // 🛡️ Blindaje TOTAL antes de filtrar
  const safeUsers = Array.isArray(users) ? users : []

  const filteredUsers = safeUsers.filter((u) =>
    u?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isFormOpen) {
    return (
      <UserForm
        editingUser={editingUser}
        onClose={() => {
          setIsFormOpen(false)
          setEditingUser(null)
        }}
        onSuccess={fetchUsers}
        setError={setError}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Catálogo de Usuarios</h1>
            <p className="text-slate-400 mt-1">Gestiona los usuarios del sistema</p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>

          <div className="w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-white"
            />
          </div>
        </div>

        {/* 🛡️ UserStats SIEMPRE recibe array */}
        <UserStats users={safeUsers} />

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            Cargando usuarios…
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No se encontraron usuarios
              </div>
            ) : (
              filteredUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onEdit={() => {
                    setEditingUser(user)
                    setIsFormOpen(true)
                  }}
                  onDelete={fetchUsers}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
