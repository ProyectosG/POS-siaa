"use client"

import { FolderTree, FolderPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ArbolFamilias({
  loading,
  familiasAgrupadas,
  categories,
  handleEliminar,
  handleEliminarFamilia,
}) {
  return (
    <Card className="bg-card border-border backdrop-blur-sm h-full transition-all duration-500 ease-out hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:border-cyan-500/50">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primario" />
          Árbol de Categorías
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Vista jerárquica de familias y subfamilias
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Cargando...
          </div>
        ) : familiasAgrupadas.length === 0 ? (
          <div className="text-center py-12">
            <FolderTree className="h-16 w-16 text-slate-600 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay familias registradas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Comienza agregando una familia
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto overflow-x-hidden sm:pr-2">
            {familiasAgrupadas.map(familia => (
              <div
                key={familia.family}
                className="bg-muted border border-border rounded-lg p-3 sm:p-4 hover:bg-muted transition-all duration-300 ease-out hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FolderPlus className="h-5 w-5 shrink-0 text-primario" />
                    <h3 className="min-w-0 break-words text-foreground font-semibold text-lg">
                      {familia.family}
                    </h3>
                    <span className="shrink-0 whitespace-nowrap text-xs bg-primario-suave text-primario px-2 py-1 rounded-full">
                      {familia.subfamilias.length} sub
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEliminarFamilia(familia.family)}
                    aria-label={`Eliminar familia ${familia.family}`}
                    className="text-error hover:text-error hover:bg-error-suave h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

           {familia.subfamilias.filter(sub => sub.subfamily && sub.subfamily.trim() !== "").length > 0 ? (
  <div className="ml-2 sm:ml-6 space-y-2 border-l-2 border-border pl-2 sm:pl-4">
    {familia.subfamilias
      .filter(sub => sub.subfamily && sub.subfamily.trim() !== "")
      .map(sub => (
        <div
          key={sub.id}
          className="flex items-center justify-between gap-2 bg-card rounded px-3 py-2 group hover:bg-muted transition-colors"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400"></div>
            <span className="min-w-0 break-words text-muted-foreground text-sm">{sub.subfamily}</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEliminar(sub.id)}
            aria-label={`Eliminar subfamilia ${sub.subfamily}`}
            // Con mouse aparece al pasar encima; en pantallas táctiles (sin hover) siempre se ve
            className="[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-error hover:text-error hover:bg-error-suave h-6 w-6 p-0 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
  </div>
) : (
  <p className="text-muted-foreground text-sm ml-2 sm:ml-6 italic">Sin subfamilias</p>
)}

              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
