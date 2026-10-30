"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/apiFetch"
import { ES_DEMO } from "@/lib/demo"

// Vista previa del ticket de una venta (texto del servidor) con opción de
// imprimirlo. saleId null = cerrado. En la demo solo hay vista previa.
export default function VistaPreviaTicket({ saleId, onClose }) {
  const [texto, setTexto] = useState("")
  const [imprimiendo, setImprimiendo] = useState(false)

  useEffect(() => {
    if (!saleId) return
    setTexto("")
    apiFetch(`/tickets/${saleId}/text`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el ticket")
        setTexto(data.ticketText)
      })
      .catch((err) => toast.error(err.message))
  }, [saleId])

  const imprimir = async () => {
    setImprimiendo(true)
    try {
      const res = await apiFetch(`/tickets/${saleId}/print`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo imprimir")
      // El servidor dice si imprimió o si no encontró impresora (modo prueba)
      toast.success(data.message || `Ticket #${saleId} impreso`)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <Dialog open={Boolean(saleId)} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ticket #{saleId}</DialogTitle>
        </DialogHeader>

        {/* Letra más chica en celular para que quepa la línea completa del ticket (42 caracteres) */}
        <div className="max-h-[60vh] overflow-auto rounded-lg border bg-card p-3 sm:p-4 font-mono text-[10px] leading-snug sm:text-xs whitespace-pre">
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
