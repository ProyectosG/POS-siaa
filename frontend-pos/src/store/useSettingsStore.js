"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * Store para la configuración del sistema.
 * Mapeado 1:1 con la tabla 'settings' de SQLite.
 */
export const useSettingsStore = create(
  persist(
    (set) => ({
      // Estado inicial basado en la estructura de tu DB
      settings: {
        id: 1,
        // Ticket Header (4 líneas)
        ticket_header_line1: "",
        ticket_header_line2: "",
        ticket_header_line3: "",
        ticket_header_line4: "",

        // Ticket Subheader (4 líneas)
        ticket_subheader_line1: "",
        ticket_subheader_line2: "",
        ticket_subheader_line3: "",
        ticket_subheader_line4: "",

        // Ticket Footer (2 líneas)
        ticket_footer_line1: "",
        ticket_footer_line2: "",

        // Ticket Config
        ticket_width: 58,           // 58mm o 80mm
        auto_print_ticket: 1,       // 1 = Sí, 0 = No

        // Sales & Security Config
        allow_discounts: 1,
        max_discount_without_auth: 0,
        allow_negative_balance: 0,
        dynamic_price_auth_key: "1234",

        // Customer Config
        customer_form_mode: "basic",

        // Card Config
        card_payment_max_reprints: 1,
      },
      
      hydrated: false,

      /**
       * Sincroniza todo el objeto de configuración (útil al cargar desde API)
       */
      setSettings: (settings) => set({ settings }),

      /**
       * Actualiza un solo campo del ticket o de la configuración
       * Ejemplo: updateSetting('ticket_header_line1', 'Abarrotes Doña Juana')
       */
      updateSetting: (field, value) =>
        set((state) => ({
          settings: { 
            ...state.settings, 
            [field]: value 
          },
        })),

      /**
       * Resetea la configuración a los valores por defecto
       */
      clearSettings: () => set({ 
        settings: {
          id: 1,
          ticket_header_line1: "", ticket_header_line2: "", ticket_header_line3: "", ticket_header_line4: "",
          ticket_subheader_line1: "", ticket_subheader_line2: "", ticket_subheader_line3: "", ticket_subheader_line4: "",
          ticket_footer_line1: "", ticket_footer_line2: "",
          ticket_width: 58,
          auto_print_ticket: 1,
          allow_discounts: 1,
          max_discount_without_auth: 0,
          allow_negative_balance: 0,
          dynamic_price_auth_key: "1234",
          customer_form_mode: "basic",
          card_payment_max_reprints: 1
        } 
      }),
    }),
    {
      name: "pos-settings-storage", // Se guarda en localStorage del equipo
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)