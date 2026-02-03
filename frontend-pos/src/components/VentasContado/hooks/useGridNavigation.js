import { useState } from "react"

export function useGridNavigation({
  columnas,
  items,
  onDeleteRow,
  disabled = false,
}) {
  const [activeCell, setActiveCell] = useState({ row: null, col: null })

  const moverFoco = (fila, colIndex) => {
    if (disabled) return

    const col = columnas[colIndex]

    const el = document.querySelector(
      `input[data-row="${fila}"][data-col="${col}"]`
    )

    if (el) {
      el.focus()
      setActiveCell({ row: fila, col })
    }
  }

  const manejarTeclas = (e, fila, columna) => {
    // 🚫 SOLO ignorar, NO bloquear
    if (disabled) return

    const colIndex = columnas.indexOf(columna)
    if (colIndex === -1) return

    // CTRL + DELETE
    if (e.ctrlKey && e.key === "Delete") {
      e.preventDefault()
      onDeleteRow?.(fila)
      return
    }

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault()
        moverFoco(fila, Math.min(colIndex + 1, columnas.length - 1))
        break

      case "ArrowLeft":
        e.preventDefault()
        moverFoco(fila, Math.max(colIndex - 1, 0))
        break

      case "ArrowDown":
        e.preventDefault()
        moverFoco(Math.min(fila + 1, items.length - 1), colIndex)
        break

      case "ArrowUp":
        e.preventDefault()
        moverFoco(Math.max(fila - 1, 0), colIndex)
        break
    }
  }

  return {
    activeCell,
    setActiveCell,
    manejarTeclas,
  }
}
