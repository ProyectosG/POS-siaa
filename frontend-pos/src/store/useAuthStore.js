import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { id, nickname, role, photoUrl }
      token: null,
      isAuthenticated: false,
      hydrated: false,
      
      login: ({ user, token }) => {


        set({
          user,
          token,
          isAuthenticated: true,
        })
      },

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "pos-auth-storage",
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)
