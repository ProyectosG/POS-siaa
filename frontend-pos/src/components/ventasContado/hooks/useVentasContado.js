// hooks/useVentasContado.js
import { useState } from "react"

export function useVentasContado() {
  const [items, setItems] = useState([])
  const [mostrarDescuento, setMostrarDescuento] = useState(false)

  const subtotal = items.reduce((a, i) => a + i.importe, 0)
  const descuentoTotal = items.reduce((a, i) => a + i.descuentoMonto, 0)

  const granTotal = subtotal

    const ivaTotal = items.reduce((a, i) => {
    if (!i.ivaPct) return a
    const base = i.importe / (1 + i.ivaPct / 100)
    return a + (i.importe - base)
  }, 0)

  
    /* =========================
       MANEJO ITEMS
    ========================= */
    const recalcular = (item) => {
      const descMonto = item.precio * (item.descuentoPct / 100)
      const precioConDesc = item.precio - descMonto
  
      return {
        ...item,
        descuentoMonto: descMonto,
        precioConDesc,
        importe: item.cantidad * precioConDesc,
      }
    }
    
  
    const actualizarItem = (id, campo, valor) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? recalcular({ ...i, [campo]: valor }) : i
        )
      )
    }
  
    const agregarItem = () => {
      setItems((p) => [
        ...p,
        {
          id: Date.now(),
          productId: null,   // 👈 CLAVE
          cantidad: 1,
          codigoBarras: "",
          articulo: "",
          presentacion: "",
          precio: 0,
          ivaPct: 16,
          descuentoPct: 0,
          descuentoMonto: 0,
          precioConDesc: 0,
          importe: 0,
        },
      ])
    }
  
    const eliminarItem = (id) =>
      setItems((p) => p.filter((i) => i.id !== id))
  
  

  return {
    items,
    setItems,
    mostrarDescuento,
    setMostrarDescuento,
    subtotal,
    ivaTotal,
    descuentoTotal,
    granTotal,
    actualizarItem,
    agregarItem,
    eliminarItem,
  }
}
