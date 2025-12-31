import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      role: null,
      token: null,
      caja: null,
      isAuthenticated: false,

      hydrated: false, // 👈 FLAG REAL

      login: (userData) =>
        set({
          user: userData,
          role: userData.role,
          token: userData.token,
          isAuthenticated: true,
        }),

      setCaja: (cajaData) => set({ caja: cajaData }),

      logout: () =>
        set({
          user: null,
          role: null,
          token: null,
          caja: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "pos-auth-storage",

      // 🔥 FORMA CORRECTA
      onRehydrateStorage: () => (state) => {
        state?.hydrated === false &&
          state &&
          (state.hydrated = true)
      },
    }
  )
)
