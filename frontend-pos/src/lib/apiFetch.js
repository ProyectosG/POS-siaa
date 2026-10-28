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

/**
 * Clave única para UNA operación que mueve dinero o inventario (venta, abono,
 * entrada, salida). Va en el encabezado Idempotency-Key: si la misma clave llega
 * dos veces (doble clic, reintento sin red), el servidor registra una sola vez.
 * Se genera al primer intento y se reusa en los reintentos de esa operación.
 * (getRandomValues funciona también abriendo la app por IP en la red local, sin https)
 */
export function nuevaClaveOperacion() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * POST de una operación con Idempotency-Key. claveRef es un useRef del
 * componente que guarda la clave de ESTA operación: si se pierde la red, la
 * clave se conserva y el reintento no registra dos veces; en cuanto el servidor
 * responde (bien o mal) se libera para la siguiente operación.
 * Devuelve { ok, status, data }.
 */
export async function enviarOperacion(ruta, body, claveRef) {
  if (!claveRef.current) claveRef.current = nuevaClaveOperacion()

  const res = await apiFetch(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": claveRef.current },
    body: JSON.stringify(body),
  })
  claveRef.current = null

  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
