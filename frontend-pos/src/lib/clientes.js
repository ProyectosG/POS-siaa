"use client"

import { apiFetch } from "@/lib/apiFetch"

// Da de alta un cliente. El servidor responde { id, message } y todo cliente nuevo
// empieza con saldo 0 (el saldo solo lo mueve el servidor con moverSaldo).
// Devuelve el cliente listo para usarse; si el servidor falla, lanza el error.
export async function crearCliente(datos) {
  const { current_balance, ...campos } = datos
  const res = await apiFetch("/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campos),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "No se pudo crear el cliente")
  return { ...campos, id: data.id, current_balance: 0 }
}
