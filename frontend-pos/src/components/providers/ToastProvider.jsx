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
        background: "var(--exito)",
        color: "#fff",
      },
    },
    error: {
      style: {
        background: "var(--error)",
        color: "#fff",
      },
    },
  }}
/>

  )
}
