"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/apiFetch"
import { ES_DEMO } from "@/lib/demo"

// Vista previa de un ticket (texto del servidor) con opción de imprimirlo.
// Venta: saleId (null = cerrado). Otro ticket, como un corte: ruta base
// (`/cuts/5`, de donde salen /text y /print) y titulo. En la demo solo hay vista previa.
export default function VistaPreviaTicket({ saleId, ruta, titulo, onClose }) {
  const base = ruta || (saleId ? `/tickets/${saleId}` : null)
  const encabezado = titulo || `Ticket #${saleId}`
  const [texto, setTexto] = useState("")
  const [imprimiendo, setImprimiendo] = useState(false)

  useEffect(() => {
    if (!base) return
    setTexto("")
    apiFetch(`${base}/text`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el ticket")
        setTexto(data.ticketText)
      })
      .catch((err) => toast.error(err.message))
  }, [base])

  const imprimir = async () => {
    setImprimiendo(true)
    try {
      const res = await apiFetch(`${base}/print`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo imprimir")
      // El servidor dice si imprimió o si no encontró impresora (modo prueba)
      toast.success(data.message || `${encabezado} impreso`)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <Dialog open={Boolean(base)} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{encabezado}</DialogTitle>
        </DialogHeader>

        {/* Letra más chica en celular para que quepa la línea completa del ticket (hasta 48 caracteres) */}
        <div className="max-h-[60vh] overflow-auto rounded-lg border bg-card px-2 py-3 sm:p-4 font-mono text-[10px] leading-snug sm:text-xs whitespace-pre">
          {texto || "Cargando…"}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {!ES_DEMO && (
            <Button onClick={imprimir} disabled={!texto || imprimiendo}>
              {imprimiendo ? "Imprimiendo…" : "Imprimir"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
