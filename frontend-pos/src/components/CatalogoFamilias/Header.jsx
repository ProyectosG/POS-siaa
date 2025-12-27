"use client"

import { FolderTree, ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function Header() {
  const router = useRouter()

  return (
    <div className="text-center mb-8 relative">
      {/* Botones navegación */}
      <div className="absolute left-0 top-0 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          title="Regresar"
        >
          <ArrowLeft className="h-5 w-5 text-slate-300" />
        </Button>


      </div>

      <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
        <FolderTree className="h-8 w-8 text-cyan-400" />
        Catálogo de Familias y Subfamilias
      </h1>
      <p className="text-slate-400 mt-2">
        Gestiona la clasificación de tus productos
      </p>
    </div>
  )
}
