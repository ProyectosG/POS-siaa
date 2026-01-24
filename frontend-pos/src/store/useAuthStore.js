// src/store/useAuthStore.js
"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import Cookies from 'js-cookie'           // ← Importar js-cookie
import { useRouter } from 'next/navigation'  // ← Importar useRouter (solo si lo usas aquí)

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // { id, nickname, role, photoUrl, isSuperDev }
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

      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        })

        // Limpiar todas las cookies
        Cookies.remove('auth-token')
        Cookies.remove('is-superdev')
        Cookies.remove('caja-id')

        // Redirigir a login (usamos window.location para evitar dependencias de router aquí)
        // Alternativa más limpia y sin importar useRouter
        window.location.href = '/login'
        // O si prefieres usar router: const router = useRouter(); router.replace('/login')
      },
    }),
    {
      name: "pos-auth-storage", // nombre en localStorage
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)