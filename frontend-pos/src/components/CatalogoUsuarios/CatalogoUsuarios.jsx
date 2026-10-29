"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Users } from "lucide-react"
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import UserForm from "./UserForm"
import UserCard from "./UserCard"
import UserStats from "./UserStats.jsx"
import { apiFetch } from "@/lib/apiFetch"
import ListaVacia from "@/components/ui/lista-vacia"
import { EsqueletoFilas } from "@/components/ui/esqueleto"


export default function CatalogoUsuarios() {
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
      const res = await apiFetch(`/users`, {
      })

      // 🔒 Sesión inválida: apiFetch ya cerró la sesión
      if (res.status === 401) return

      // 🔒 Sesión válida pero sin permiso (solo el Administrador ve usuarios): no se cierra la sesión
      if (res.status === 403) {
        setUsers([])
        setError("No tienes permiso para ver los usuarios")
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
    <div>
      <div className="max-w-7xl mx-auto">
        <EncabezadoPantalla
          titulo="Catálogo de Usuarios"
          subtitulo="Gestiona los usuarios del sistema y sus permisos"
          icono={Users}
          acciones={
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          }
        />
        <div className="flex flex-col gap-4 mb-6">
          <div className="w-full sm:w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-foreground"
            />
          </div>
        </div>

        {/* 🛡️ UserStats SIEMPRE recibe array */}
        <UserStats users={safeUsers} />

        {error && (
          <div className="mb-6 p-4 bg-error-suave border border-red-500/50 rounded-lg text-error text-center">
            {error}
          </div>
        )}

        {loading ? (
          <EsqueletoFilas filas={4} className="max-w-md mx-auto" />
        ) : (
          <div className="max-w-md mx-auto space-y-4">
            {filteredUsers.length === 0 ? (
              <ListaVacia titulo="No hay usuarios" mensaje="Ningún usuario coincide con la búsqueda." />
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
