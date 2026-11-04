"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { AlertTriangle, Database, Download } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { apiFetch } from "@/lib/apiFetch"

const PERIODOS = [
  { valor: "diario", titulo: "Diario", detalle: "Al realizar el Corte Z" },
  { valor: "semanal", titulo: "Semanal", detalle: "Al realizar el Corte Z (semana de lunes a domingo)" },
]

const tamaño = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil((bytes || 0) / 1024)} KB`

// Sección de Configuración (solo Administrador; en la demo no se muestra). El
// interruptor y la periodicidad se guardan con el botón de Configuración.
export default function RespaldoAutomatico({ settings, onChange }) {
  const [respaldos, setRespaldos] = useState([])
  const [bajando, setBajando] = useState(null)
  const encendido = Boolean(settings.respaldo_auto)

  useEffect(() => {
    apiFetch("/settings/respaldos")
      .then(async (res) => {
        if (!res.ok) throw new Error()
        setRespaldos(await res.json())
      })
      .catch(() => toast.error("No se pudo leer la lista de respaldos"))
  }, [])

  const descargar = async (nombre) => {
    setBajando(nombre)
    try {
      const res = await apiFetch(`/settings/respaldos/${encodeURIComponent(nombre)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "No se pudo descargar el respaldo")
      }
      const url = URL.createObjectURL(await res.blob())
      const enlace = document.createElement("a")
      enlace.href = url
      enlace.download = nombre
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
      toast.success(`Respaldo descargado: ${nombre}. Guárdalo en un lugar privado: contiene todos los datos del negocio`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBajando(null)
    }
  }

  return (
    <Card className="bg-card shadow-suave border-border p-6 rounded-tarjeta">
      <div className="flex items-center gap-2 text-primario font-black text-[11px] uppercase tracking-[0.2em] border-b border-border pb-4 mb-4">
        <Database className="w-4 h-4" /> Respaldo automático
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-2xl border border-border">
          <div>
            <Label className="text-[13px] text-foreground font-black uppercase tracking-tight">Respaldar al hacer el Corte Z</Label>
            <p className="text-xs text-muted-foreground">Encendido respalda; apagado no.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase ${encendido ? "text-exito" : "text-muted-foreground"}`}>
              {encendido ? "Encendido" : "Apagado"}
            </span>
            <Switch
              aria-label="Respaldo automático"
              checked={encendido}
              onCheckedChange={(v) => onChange("respaldo_auto", v ? 1 : 0)}
              className="data-[state=checked]:bg-primario"
            />
          </div>
        </div>

        <fieldset disabled={!encendido} className={`grid gap-2 sm:grid-cols-2 ${encendido ? "" : "opacity-50"}`}>
          <legend className="mb-2 text-xs font-bold uppercase text-muted-foreground">Periodicidad</legend>
          {PERIODOS.map((p) => {
            const elegido = (settings.respaldo_periodo || "diario") === p.valor
            return (
              <button
                key={p.valor}
                type="button"
                aria-pressed={elegido}
                onClick={() => onChange("respaldo_periodo", p.valor)}
                className={`rounded-xl border-2 px-4 py-3 text-left transition disabled:cursor-not-allowed ${
                  elegido ? "border-primario bg-primario-suave" : "border-border bg-card"
                }`}
              >
                <span className="block font-bold text-foreground">{p.titulo}</span>
                <span className="block text-xs text-muted-foreground">{p.detalle}</span>
              </button>
            )
          })}
        </fieldset>

        {settings.respaldo_ultimo_error ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-aviso/40 bg-aviso-suave px-3 py-2 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-aviso" />
            Último error: {settings.respaldo_ultimo_error}
          </p>
        ) : null}
        <p className="text-sm text-foreground">
          {settings.respaldo_ultimo_fecha
            ? <>Último respaldo: <b>{settings.respaldo_ultimo_fecha}</b> · {tamaño(settings.respaldo_ultimo_bytes)}</>
            : "Todavía no hay respaldos automáticos."}
        </p>

        <p className="flex items-start gap-2 rounded-lg border border-aviso/40 bg-aviso-suave px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-aviso" />
          El respaldo vive en el mismo disco que la base, así que no protege contra una falla del disco. Descarga una copia a otro lugar.
        </p>

        <Button
          type="button"
          onClick={() => descargar(respaldos[0].nombre)}
          disabled={respaldos.length === 0 || Boolean(bajando)}
          className="w-full gap-2 sm:w-auto"
        >
          <Download className="size-4" /> Descargar el último
        </Button>

        {respaldos.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {respaldos.map((r) => (
              <li key={r.nombre} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block break-all font-mono text-xs text-foreground">{r.nombre}</span>
                  <span className="block text-xs text-muted-foreground">{r.fecha} · {tamaño(r.bytes)}</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => descargar(r.nombre)}
                  disabled={Boolean(bajando)}
                  aria-label={`Descargar ${r.nombre}`}
                >
                  <Download className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
