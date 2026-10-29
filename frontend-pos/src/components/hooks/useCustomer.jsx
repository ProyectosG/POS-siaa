// hooks/useCustomers.js
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from "@/lib/apiFetch"

const CUSTOMERS_URL = '/customers'

export function useCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiFetch(CUSTOMERS_URL)
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`)
      }
      const data = await res.json()
      setCustomers(data || [])
    } catch (err) {
      const msg = err.message || 'No se pudieron cargar los clientes'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // El servidor responde { id, message } al crear y { message } al editar, no el
  // cliente: se vuelve a leer para que la lista y el detalle muestren lo guardado
  const leerCliente = async (id) => {
    const res = await apiFetch(`/customers/${id}`)
    if (!res.ok) throw new Error('No se pudo leer el cliente guardado')
    return res.json()
  }

  const errorDe = async (res, porOmision) => {
    const errData = await res.json().catch(() => ({}))
    return new Error(errData.error || porOmision)
  }

  const createCustomer = async (data) => {
    const res = await apiFetch(CUSTOMERS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) throw await errorDe(res, 'Error al crear cliente')

    const { id } = await res.json()
    const newCustomer = await leerCliente(id)
    setCustomers(prev => [...prev, newCustomer])
    return newCustomer
  }

  const updateCustomer = async (id, data) => {
    const res = await apiFetch(`/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) throw await errorDe(res, 'Error al actualizar cliente')

    const updated = await leerCliente(id)
    setCustomers(prev =>
      prev.map(c => (c.id === id ? updated : c))
    )
    return updated
  }

  const deleteCustomer = async (id) => {
    const res = await apiFetch(`/customers/${id}`, {
      method: 'DELETE',
    })

    // Por ejemplo 409: el cliente tiene ventas o movimientos de saldo
    if (!res.ok) throw await errorDe(res, 'Error al eliminar cliente')

    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  return {
    customers,
    loading,
    error,
    loadCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
}