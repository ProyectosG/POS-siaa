// hooks/useVentasContado.js
import { useState } from "react"

export function useVentasContado() {
  const [items, setItems] = useState([])
  const [mostrarDescuento, setMostrarDescuento] = useState(false)

  /* =========================
     TOTALES
     (YA CON IVA INCLUIDO)
  ========================= */
  const subtotal = items.reduce((a, i) => a + (i.importeBase || 0), 0)
  const ivaTotal = items.reduce((a, i) => a + (i.ivaMonto || 0), 0)
  const descuentoTotal = items.reduce((a, i) => a + (i.descuentoMonto || 0), 0)
  const granTotal = items.reduce((a, i) => a + (i.importe || 0), 0)

  /* =========================
     RECÁLCULO POR LÍNEA
     👉 PRECIO YA INCLUYE IVA
  ========================= */
  const recalcular = (item) => {
    const cantidad = Number(item.cantidad || 0)
    const precio = Number(item.precio || 0) // 👈 precio FINAL (con IVA)
    const descuentoPct = Number(item.descuentoPct || 0)
    const ivaPct = Number(item.ivaPct || 0)

    // 1️⃣ Descuento por línea (sobre precio final)
    const descuentoMonto = cantidad * precio * (descuentoPct / 100)

    // 2️⃣ Precio unitario final con descuento
    const precioConDesc =
      cantidad > 0
        ? (cantidad * precio - descuentoMonto) / cantidad
        : 0

    // 3️⃣ Total línea (YA con IVA)
    const importe = cantidad * precioConDesc

    // 4️⃣ Desglose base / IVA desde precio final
    let importeBase = importe
    let ivaMonto = 0

    if (ivaPct > 0) {
      const divisor = 1 + ivaPct / 100
      importeBase = importe / divisor
      ivaMonto = importe - importeBase
    }

    return {
      ...item,
      descuentoMonto,
      precioConDesc,
      importeBase,
      ivaMonto,
      importe, // 👈 total línea FINAL
    }
  }

  /* =========================
     MANEJO DE ITEMS
  ========================= */
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
        productId: null,
        cantidad: 1,
        codigoBarras: "",
        articulo: "",
        presentacion: "",

        // 🔥 PRECIO FINAL (IVA INCLUIDO)
        precio: 0,

        // impuestos
        ivaPct: 16,
        ivaMonto: 0,

        // descuentos
        descuentoPct: 0,
        descuentoMonto: 0,

        // cálculos
        precioConDesc: 0,
        importeBase: 0,
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
    subtotal,        // base sin IVA
    ivaTotal,        // IVA desglosado
    descuentoTotal,
    granTotal,       // total final (NO se recalcula IVA)
    actualizarItem,
    agregarItem,
    eliminarItem,
  }
}
