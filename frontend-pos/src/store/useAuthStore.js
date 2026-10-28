// src/store/useAuthStore.js
"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import Cookies from 'js-cookie'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // { id, nickname, role, accessLevel, photoUrl, isSuperDev }
      token: null, // JWT del backend; apiFetch lo manda en Authorization
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

        // Limpiar cookies (is-superdev ya no se usa; se borra por si quedó de antes)
        Cookies.remove('auth-token')
        Cookies.remove('is-superdev')
        Cookies.remove('caja-id')

        // Redirigir a login (window.location para no depender del router aquí)
        window.location.href = '/login'
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
