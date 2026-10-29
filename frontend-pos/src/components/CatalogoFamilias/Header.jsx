"use client"

import { FolderTree } from "lucide-react"
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla"

export default function Header() {
  return (
    <EncabezadoPantalla
      titulo="Familias y Subfamilias"
      subtitulo="Gestiona la clasificación de tus productos"
      icono={FolderTree}
    />
  )
}
