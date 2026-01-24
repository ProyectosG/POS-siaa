"use client"

import { Toaster } from "react-hot-toast"

export default function ToastProvider() {
  return (
 <Toaster
  position="top-center"
  toastOptions={{
    duration: 3000,
    style: {
      background: "#1f2937", // gris oscuro
      color: "#fff",
    },
    success: {
      style: {
        background: "#16a34a", // verde POS
        color: "#fff",
      },
    },
    error: {
      style: {
        background: "#dc2626", // rojo
        color: "#fff",
      },
    },
  }}
/>

  )
}
