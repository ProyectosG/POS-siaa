"use client"

import { FolderTree, FolderPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ArbolFamilias({
  loading,
  familiasAgrupadas,
  categories,
  handleEliminar,
}) {
  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-full transition-all duration-500 ease-out hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:border-cyan-500/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-cyan-400" />
          Árbol de Categorías
        </CardTitle>
        <CardDescription className="text-slate-400">
          Vista jerárquica de familias y subfamilias
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            Cargando...
          </div>
        ) : familiasAgrupadas.length === 0 ? (
          <div className="text-center py-12">
            <FolderTree className="h-16 w-16 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No hay familias registradas</p>
            <p className="text-sm text-slate-500 mt-1">
              Comienza agregando una familia
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {familiasAgrupadas.map(familia => (
              <div
                key={familia.family}
                className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 hover:bg-slate-700/50 transition-all duration-300 ease-out hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="h-5 w-5 text-blue-400" />
                    <h3 className="text-white font-semibold text-lg">
                      {familia.family}
                    </h3>
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                      {familia.subfamilias.length} sub
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const ids = familia.subfamilias.map(s => s.id)
                      ids.forEach(id => handleEliminar(id))

                      const mainCat = categories.find(
                        c => c.family === familia.family && !c.subfamily
                      )
                      if (mainCat) handleEliminar(mainCat.id)
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

           {familia.subfamilias.filter(sub => sub.subfamily && sub.subfamily.trim() !== "").length > 0 ? (
  <div className="ml-6 space-y-2 border-l-2 border-slate-600 pl-4">
    {familia.subfamilias
      .filter(sub => sub.subfamily && sub.subfamily.trim() !== "")
      .map(sub => (
        <div
          key={sub.id}
          className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-2 group hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-400"></div>
            <span className="text-slate-300 text-sm">{sub.subfamily}</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEliminar(sub.id)}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/20 h-6 w-6 p-0 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
  </div>
) : (
  <p className="text-slate-500 text-sm ml-6 italic">Sin subfamilias</p>
)}

              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
