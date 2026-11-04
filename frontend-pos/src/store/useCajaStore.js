import { create } from "zustand"
import { persist } from "zustand/middleware"
import Cookies from "js-cookie"

export const useCajaStore = create(
  persist(
    (set) => ({
      caja: null, // { id, numero, tipo, abiertaEn, token }. El token va en X-Caja-Token: de ahí saca la caja el servidor
      hydrated: false,

      setCaja: (caja) => set({ caja }),
      clearCaja: () => {
        Cookies.remove("caja-id", { path: "/" })
        set({ caja: null })
      },
    }),
    {
      name: "pos-caja-storage",
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)