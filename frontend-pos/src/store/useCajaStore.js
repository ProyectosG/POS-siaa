import { create } from "zustand"

export const useCajaStore = create((set) => ({
  caja: null,
  setCaja: (caja) => set({ caja }),
  clearCaja: () => set({ caja: null }),
}))
