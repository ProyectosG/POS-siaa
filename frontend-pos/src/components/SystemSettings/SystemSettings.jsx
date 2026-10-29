"use client"

import { useEffect, useState } from "react"
import { useSettingsStore } from "@/store/useSettingsStore"
import { Save, Settings, Receipt, CreditCard, Users, Shield, Database, Hash, Percent, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
import TicketPreview from "./TicketPreview"
import { apiFetch } from "@/lib/apiFetch"
import EncabezadoPantalla from "@/components/ui/encabezado-pantalla"
import { Esqueleto, EsqueletoFilas } from "@/components/ui/esqueleto"


export default function SystemSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const setGlobalSettings = useSettingsStore((s) => s.setSettings)

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`/settings`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSettings(data)
      setGlobalSettings(data) // 👈 Sincroniza con el store global
    } catch (err) { toast.error("Error al cargar núcleo") }
    finally { setLoading(false) }
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { created_at, updated_at, id, ...payload } = settings;
      const res = await apiFetch(`/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error()
      // El servidor responde la configuración guardada, sin la clave de precios
      const guardada = await res.json()
      setSettings(guardada)
      toast.success("Configuración Sincronizada")
      setGlobalSettings(guardada) // 👈 Sincroniza con el store global
    } catch (err) { toast.error("Error en persistencia") }
    finally { setSaving(false) }
  }

  if (loading || !settings) return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Esqueleto className="h-9 w-72" />
      <div className="grid gap-6 lg:grid-cols-2">
        <EsqueletoFilas filas={8} />
        <EsqueletoFilas filas={8} />
      </div>
    </div>
  )

  return (
    <div className="text-foreground">
      <div className="max-w-7xl mx-auto space-y-6">
        <EncabezadoPantalla
          titulo="Configuración del sistema"
          subtitulo="Ticket, descuentos, clientes, inventario y clave de precios"
          icono={Settings}
          className="mb-0"
          acciones={
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? "Guardando…" : "Guardar configuración"}
            </Button>
          }
        />

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* COLUMNA IZQUIERDA: MENSAJERÍA, VENTAS Y VOUCHERS */}
          <div className="flex flex-col justify-between gap-6">
            <div className="space-y-6">
                <Card className="bg-card shadow-suave border-border rounded-tarjeta overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/40 flex items-center gap-3">
                        <Receipt className="text-exito w-6 h-6" />
                        <h2 className="font-black uppercase text-[12px] tracking-[0.3em] text-foreground">Mensajería Maestro</h2>
                    </div>
                    <CardContent className="p-8 space-y-8">
                        {['Encabezado Principal', 'Identidad Sucursal', 'Pie de Ticket'].map((label, idx) => (
                        <div key={idx} className="space-y-4">
                            <Label className="inline-block px-4 py-1 rounded-md bg-primario-suave border border-primario/20 text-primario font-black text-[11px] uppercase tracking-widest">{label}</Label>
                            <div className="grid gap-2">
                            {[1, 2, (idx < 2 ? 3 : 0), (idx < 2 ? 4 : 0)].filter(n => n !== 0).map((n) => {
                                const field = idx === 0 ? 'header' : idx === 1 ? 'subheader' : 'footer';
                                return (
                                <Input key={`${field}${n}`} value={settings[`ticket_${field}_line${n}`] || ""} onChange={(e) => handleChange(`ticket_${field}_line${n}`, e.target.value)} maxLength={40} className="bg-muted/50 border-border text-foreground font-mono w-full h-10 focus:border-primario transition-all rounded-xl text-sm" />
                                );
                            })}
                            </div>
                        </div>
                        ))}
                    </CardContent>
                </Card>
<Card className="bg-card shadow-suave border-border p-6 rounded-tarjeta">
    <div className="flex items-center gap-2 text-primario font-black text-[11px] uppercase tracking-[0.2em] border-b border-border pb-4 mb-4">
        <Shield className="w-4 h-4" /> Configuración de Descuentos 🏷️
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-2xl border border-border">
        <div className="flex flex-col gap-1">
            <Label className="text-[13px] text-foreground font-black uppercase tracking-tight">Habilitar Descuentos</Label>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter italic leading-none">Permisos de terminal</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Switch con estado dinámico */}
            <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors duration-300 ${settings.allow_discounts ? "text-exito" : "text-muted-foreground"}`}>
                    {settings.allow_discounts ? "Activado" : "Desactivado"}
                </span>
                <Switch 
                    checked={!!settings.allow_discounts} 
                    onCheckedChange={(v) => handleChange("allow_discounts", v ? 1 : 0)} 
                    className="data-[state=checked]:bg-primario" 
                />
            </div>

            {/* Grupo de Descuento Máximo */}
            <div className="flex items-center gap-3 bg-muted p-1.5 px-3 rounded-xl border border-border">
                <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest whitespace-nowrap">Desc. Max:</Label>
                <div className="relative w-20">
                    <Input 
                        type="text" 
                        value={settings.max_discount_without_auth} 
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ""); // Solo números
                            if (val.length <= 3) handleChange("max_discount_without_auth", val);
                        }}
                        maxLength={3}
                        className="bg-card border-border h-8 font-mono text-md text-right pr-7 rounded-lg text-exito focus:border-primario/50 transition-all shadow-inner" 
                    />
                    <Percent className="absolute right-2 top-2 w-3 h-3 text-muted-foreground" />
                </div>
            </div>
        </div>
    </div>
</Card>
            </div>

            {/* VOUCHERS ANCLADOS AL FINAL DE LA IZQUIERDA */}
            <Card className="bg-card shadow-suave border-border p-6 rounded-tarjeta">
                <div className="flex items-center gap-2 text-primario font-black text-[11px] uppercase tracking-[0.2em] border-b border-border pb-4 mb-4">
                    <CreditCard className="w-4 h-4" /> Vouchers & Copias 📚
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-2xl border border-border">
                    <Label className="text-[13px] text-muted-foreground font-bold uppercase shrink-0">Copias a Imprimir</Label>
                    <div className="relative w-24">
                        <Input type="text" value={settings.card_payment_max_reprints} 
                        onChange={(e) => { if (e.target.value === "" || /^[0-3]$/.test(e.target.value)) handleChange("card_payment_max_reprints", e.target.value) }}
                        className="bg-card border-border h-10 font-mono text-lg text-right pr-9 rounded-xl text-primario" />
                        <Hash className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    </div>
                </div>
            </Card>
          </div>

{/* COLUMNA DERECHA: PREVIEW, CLIENTES Y SEGURIDAD */}
<div className="flex flex-col justify-between gap-6">
  <div className="space-y-6">
    {/* CARD: LIVE PREVIEW */}
    <Card className="bg-card shadow-suave border-border rounded-tarjeta overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/50 text-center text-[11px] font-black text-muted-foreground uppercase tracking-[0.5em]">Live Terminal Preview</div>
      <CardContent className="p-8">
        <div className="bg-white p-2 rounded-sm mb-8 ring-1 ring-border">
          <TicketPreview settings={settings} />
        </div>
<div className="grid grid-cols-3 gap-4">
  {[57, 58, 80].map(size => (
    <button 
      key={size} 
      onClick={() => handleChange("ticket_width", size)} 
      className={`relative h-24 rounded-2xl border-2 font-black transition-all duration-500 flex flex-col items-center justify-center gap-1 overflow-hidden group ${
        settings.ticket_width === size 
        ? "border-primario bg-primario-suave text-primario" 
        : "border-border bg-card text-muted-foreground hover:border-primario/40 hover:text-foreground"
      }`}
    >
      {/* Indicador visual superior solo cuando está activo */}
      {settings.ticket_width === size && (
        <div className="absolute top-0 w-full h-1 bg-primario/60" />
      )}
      
      <span className={`text-2xl tracking-tighter transition-transform duration-300 ${settings.ticket_width === size ? "scale-110" : "group-hover:scale-105"}`}>
        {size}
      </span>
      <span className="text-[10px] opacity-60 uppercase tracking-[0.2em] font-bold">
        Ancho MM
      </span>
    </button>
  ))}
</div>
      </CardContent>
    </Card>

    {/* CARD: FORMULARIO DE CLIENTES (ACTUALIZADA) */}
    <Card className="bg-card shadow-suave border-border rounded-tarjeta overflow-hidden">
      <CardContent className="p-8 space-y-8">
        <div className="flex items-center gap-2 text-primario font-black text-[11px] uppercase tracking-wider border-b border-border pb-4">
          <Users className="w-5 h-5" /> Formulario de Clientes
        </div>
        
        {/* MODO DE REGISTRO */}
        <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-muted/50 rounded-tarjeta border border-border gap-4">
          <div className="flex flex-col gap-1 w-full">
            <Label className="text-[14px] text-foreground font-black uppercase tracking-tight leading-none">Modo de Registro</Label>
            <p className="text-[11px] text-muted-foreground font-bold italic leading-tight uppercase tracking-tighter">Configuración de campos</p>
          </div>
          <div className="flex bg-muted p-1.5 rounded-xl border border-border w-full md:w-auto">
            {['basic', 'complete'].map((m) => (
              <button 
                key={m} 
                onClick={() => handleChange("customer_form_mode", m)}
                className={`flex-1 md:flex-none px-8 py-2.5 rounded-lg text-[11px] font-black uppercase transition-all duration-300 ${
                  settings.customer_form_mode === m 
                  ? "bg-primario text-white shadow-suave" 
                  : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === 'basic' ? 'Basic' : 'Complete'}
              </button>
            ))}
          </div>
        </div>

        {/* VENTA EN NEGATIVO */}
        <div className="flex items-center justify-between p-6 bg-muted/50 rounded-tarjeta border border-border">
          <div className="flex flex-col gap-1">
            <Label className="text-[14px] text-foreground font-black uppercase tracking-tight italic">Permitir ventas con stock negativo</Label>
            <p className="text-[10px] text-aviso font-bold uppercase tracking-widest leading-none">
              {settings.allow_negative_balance ? "⚠️ Riesgo de descuadre activo" : "✓ Control de inventario estricto"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-black uppercase tracking-tighter ${settings.allow_negative_balance ? "text-exito" : "text-muted-foreground"}`}>
              {settings.allow_negative_balance ? "Activado" : "Desactivado"}
            </span>
            <Switch 
              checked={!!settings.allow_negative_balance} 
              onCheckedChange={(v) => handleChange("allow_negative_balance", v ? 1 : 0)} 
              className="data-[state=checked]:bg-primario" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* CARD DE SEGURIDAD - ANCLADA AL FINAL DERECHO */}
<Card className="bg-card shadow-suave border-border p-6 rounded-tarjeta">
  <div className="flex items-center gap-2 text-primario font-black text-[11px] uppercase tracking-[0.2em] border-b border-border pb-4 mb-4">
    <Lock className="w-4 h-4 text-primario" /> Seguridad: Precio Dinámico 🔐
  </div>
  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-2xl border border-border">
    <div className="flex flex-col">
      <Label className="text-[13px] text-muted-foreground font-bold uppercase shrink-0 tracking-tight">Nueva Clave de Autorización</Label>
      <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase italic">Vacía = no se cambia</span>
    </div>
    <div className="relative w-32 group">
      {/* Brillo sutil al enfocar */}
      <div className="absolute -inset-1 bg-primario/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
      
      <Input 
        type="password" 
        value={settings.dynamic_price_auth_key ?? ""}
        autoComplete="new-password"
        onChange={(e) => handleChange("dynamic_price_auth_key", e.target.value)}
        className="relative bg-card border-border h-10 font-mono text-center rounded-xl text-exito tracking-widest text-lg focus:border-primario/50 transition-all" 
        placeholder="****" 
      />
    </div>
  </div>
</Card>
</div>

        </div>
      </div>
    </div>
  )
}