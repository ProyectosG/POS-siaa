"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useVentaStore = create(
  persist(
    (set, get) => ({
      carrito: [], 
      cliente: null, 
      tipoVenta: "contado", // 'contado', 'apartado', 'credito'
      efectivoRecibido: 0,
      descuentoTotal: 0,
      hydrated: false,

      // Acción: Agregar producto basado en tu tabla 'products'
      addProducto: (prod) => set((state) => {
        const existe = state.carrito.find((item) => item.id === prod.id);
        if (existe) {
          return {
            carrito: state.carrito.map((item) =>
              item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item
            ),
          };
        }
        return { 
          carrito: [...state.carrito, { 
            id: prod.id,
            articulo: prod.articulo,
            precio: prod.precio_menudeo, // Por defecto menudeo
            precio_original: prod.precio_menudeo,
            iva: prod.iva || 0,
            ieps: prod.ieps || 0,
            cantidad: 1,
            stock_actual: prod.stock
          }] 
        };
      }),

      // Cálculos automáticos para tu tabla 'sales' y 'sale_details'
      getTotales: () => {
        const { carrito, descuentoTotal } = get();
        const subtotal = carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
        const tax_total = carrito.reduce((acc, p) => {
          const base = p.precio * p.cantidad;
          return acc + (base * (p.iva / 100)) + (base * (p.ieps / 100));
        }, 0);
        const total = (subtotal + tax_total) - descuentoTotal;
        return { subtotal, tax_total, total };
      },

      updateCantidad: (id, cant) => set((state) => ({
        carrito: state.carrito.map((p) => p.id === id ? { ...p, cantidad: cant } : p)
      })),

      removeProducto: (id) => set((state) => ({
        carrito: state.carrito.filter((p) => p.id !== id)
      })),

      setCliente: (cliente) => set({ cliente }),
      setEfectivo: (monto) => set({ efectivoRecibido: monto }),
      
      clearVenta: () => set({ 
        carrito: [], 
        cliente: null, 
        tipoVenta: "contado", 
        efectivoRecibido: 0, 
        descuentoTotal: 0 
      }),
    }),
    {
      name: "pos-venta-storage",
      onRehydrateStorage: () => (state) => { if (state) state.hydrated = true },
    }
  )
)