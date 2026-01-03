import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useCajaStore = create(
  persist(
    (set) => ({
      caja: null, // { id, numero, tipo, abiertaEn }
      hydrated: false,

      setCaja: (caja) => set({ caja }),
      clearCaja: () => set({ caja: null }),
    }),
    {
      name: "pos-caja-storage",
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)