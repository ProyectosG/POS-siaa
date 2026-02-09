// hooks/useCustomers.js
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const CUSTOMERS_URL = `${API_BASE}/customers`

export function useCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(CUSTOMERS_URL)
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

  const createCustomer = async (data) => {
    const res = await fetch(CUSTOMERS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Error al crear cliente')
    }

    const newCustomer = await res.json()
    setCustomers(prev => [...prev, newCustomer])
    return newCustomer
  }

  const updateCustomer = async (id, data) => {
    const res = await fetch(`${CUSTOMERS_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      throw new Error('Error al actualizar cliente')
    }

    const updated = await res.json()
    setCustomers(prev =>
      prev.map(c => (c.id === id ? updated : c))
    )
    return updated
  }

  const deleteCustomer = async (id) => {
    const res = await fetch(`${CUSTOMERS_URL}/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      throw new Error('Error al eliminar cliente')
    }

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