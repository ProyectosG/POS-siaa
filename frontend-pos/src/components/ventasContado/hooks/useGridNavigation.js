// hooks/useGridNavigation.js
import { useEffect, useState } from "react"

export function useGridNavigation({ columnas, items }) {
  const [activeCell, setActiveCell] = useState({ row: null, col: null })


const moverFoco = (fila, colIndex) => {
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
    const colIndex = columnas.indexOf(columna)
    if (colIndex === -1) return

    switch (e.key) {
      case "ArrowRight":
        if (colIndex < columnas.length - 1) {
          e.preventDefault()
          moverFoco(fila, colIndex + 1)
        }
        break

      case "ArrowLeft":
        if (colIndex > 0) {
          e.preventDefault()
          moverFoco(fila, colIndex - 1)
        }
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
