"use client"

import { useAuthStore } from "@/store/useAuthStore"

// URL base del backend, por ejemplo http://localhost:5000/api
export const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Única función para llamar al API.
 * - Antepone NEXT_PUBLIC_API_URL a la ruta ("/products" → ".../api/products")
 * - Agrega Authorization: Bearer <token> con el token de la sesión
 * - Si el servidor responde 401 con una sesión abierta, cierra la sesión
 *
 * Devuelve el Response de fetch, igual que fetch.
 */
export async function apiFetch(ruta, opciones = {}) {
  const url = /^https?:\/\//.test(ruta) ? ruta : `${API_URL}${ruta}`
  const token = useAuthStore.getState().token

  const headers = new Headers(opciones.headers || {})
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(url, { ...opciones, headers })

  // Token vencido o inválido: fuera de la sesión
  if (res.status === 401 && token) {
    useAuthStore.getState().logout()
  }

  return res
}
