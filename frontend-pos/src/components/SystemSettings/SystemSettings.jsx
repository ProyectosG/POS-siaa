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

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function SystemSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const setGlobalSettings = useSettingsStore((s) => s.setSettings)

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`)
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
      const res = await fetch(`${API_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error()
      toast.success("Configuración Sincronizada")
    setGlobalSettings(settings) // 👈 Sincroniza con el store global
    } catch (err) { toast.error("Error en persistencia") }
    finally { setSaving(false) }
  }

  if (loading || !settings) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 font-mono">
      <div className="w-24 h-1 bg-emerald-950 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 animate-pulse" />
      </div>
      <span className="text-emerald-500 text-[10px] tracking-[0.4em] uppercase">Kernel: Reinicializando Esquema</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-8 text-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER CON STATUS SQLITE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/20 p-8 rounded-[2.5rem] border border-slate-800/40 backdrop-blur-3xl shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 ring-8 ring-emerald-500/5">
              <Settings className="text-emerald-400 w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Settings Arch</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <p className="text-[10px] text-emerald-500 font-mono tracking-[0.3em] font-bold uppercase">Database Active: SQLite v3.0</p>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-12 h-14 rounded-2xl transition-all shadow-xl shadow-emerald-900/40 active:scale-95 text-md tracking-widest border-b-4 border-emerald-800 uppercase">
            {saving ? "Persistiendo..." : "Sincronizar DB"}
          </Button>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* COLUMNA IZQUIERDA: MENSAJERÍA, VENTAS Y VOUCHERS */}
          <div className="flex flex-col justify-between gap-6">
            <div className="space-y-6">
                <Card className="bg-slate-900/40 border-slate-800 shadow-2xl rounded-[2rem] overflow-hidden">
                    <div className="p-6 border-b border-slate-800 bg-slate-800/10 flex items-center gap-3">
                        <Receipt className="text-emerald-400 w-6 h-6" />
                        <h2 className="font-black uppercase text-[12px] tracking-[0.3em] text-white">Mensajería Maestro</h2>
                    </div>
                    <CardContent className="p-8 space-y-8">
                        {['Encabezado Principal', 'Identidad Sucursal', 'Pie de Ticket'].map((label, idx) => (
                        <div key={idx} className="space-y-4">
                            <Label className="inline-block px-4 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 font-black text-[11px] uppercase tracking-widest">{label}</Label>
                            <div className="grid gap-2">
                            {[1, 2, (idx < 2 ? 3 : 0), (idx < 2 ? 4 : 0)].filter(n => n !== 0).map((n) => {
                                const field = idx === 0 ? 'header' : idx === 1 ? 'subheader' : 'footer';
                                return (
                                <Input key={`${field}${n}`} value={settings[`ticket_${field}_line${n}`] || ""} onChange={(e) => handleChange(`ticket_${field}_line${n}`, e.target.value)} maxLength={40} className="bg-black/40 border-slate-800 text-white font-mono w-full h-10 focus:border-purple-500 transition-all rounded-xl text-sm" />
                                );
                            })}
                            </div>
                        </div>
                        ))}
                    </CardContent>
                </Card>
<Card className="bg-slate-900/40 border-slate-800 p-6 rounded-[2rem] shadow-xl">
    <div className="flex items-center gap-2 text-cyan-400 font-black text-[11px] uppercase tracking-[0.2em] border-b border-slate-800 pb-4 mb-4">
        <Shield className="w-4 h-4" /> Configuración de Descuentos 🏷️
    </div>
    <div className="flex flex-row items-center justify-between gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
        <div className="flex flex-col gap-1">
            <Label className="text-[13px] text-white font-black uppercase tracking-tight">Habilitar Descuentos</Label>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic leading-none">Permisos de terminal</p>
        </div>
        
        <div className="flex items-center gap-6">
            {/* Switch con estado dinámico */}
            <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors duration-300 ${settings.allow_discounts ? "text-emerald-500" : "text-slate-500"}`}>
                    {settings.allow_discounts ? "Activado" : "Desactivado"}
                </span>
                <Switch 
                    checked={!!settings.allow_discounts} 
                    onCheckedChange={(v) => handleChange("allow_discounts", v ? 1 : 0)} 
                    className="data-[state=checked]:bg-emerald-500 shadow-lg shadow-emerald-900/20" 
                />
            </div>

            {/* Grupo de Descuento Máximo */}
            <div className="flex items-center gap-3 bg-black/50 p-1.5 px-3 rounded-xl border border-white/5">
                <Label className="text-[10px] text-purple-400 font-black uppercase tracking-widest whitespace-nowrap">Desc. Max:</Label>
                <div className="relative w-20">
                    <Input 
                        type="text" 
                        value={settings.max_discount_without_auth} 
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ""); // Solo números
                            if (val.length <= 3) handleChange("max_discount_without_auth", val);
                        }}
                        maxLength={3}
                        className="bg-black border-slate-800 h-8 font-mono text-md text-right pr-7 rounded-lg text-emerald-400 focus:border-purple-500/50 transition-all shadow-inner" 
                    />
                    <Percent className="absolute right-2 top-2 w-3 h-3 text-slate-600" />
                </div>
            </div>
        </div>
    </div>
</Card>
            </div>

            {/* VOUCHERS ANCLADOS AL FINAL DE LA IZQUIERDA */}
            <Card className="bg-slate-900/40 border-slate-800 p-6 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-2 text-cyan-400 font-black text-[11px] uppercase tracking-[0.2em] border-b border-slate-800 pb-4 mb-4">
                    <CreditCard className="w-4 h-4" /> Vouchers & Copias 📚
                </div>
                <div className="flex flex-row items-center justify-between gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
                    <Label className="text-[13px] text-slate-300 font-bold uppercase shrink-0">Copias a Imprimir</Label>
                    <div className="relative w-24">
                        <Input type="text" value={settings.card_payment_max_reprints} 
                        onChange={(e) => { if (e.target.value === "" || /^[0-3]$/.test(e.target.value)) handleChange("card_payment_max_reprints", e.target.value) }}
                        className="bg-black border-slate-800 h-10 font-mono text-lg text-right pr-9 rounded-xl text-cyan-400" />
                        <Hash className="absolute right-3 top-3 w-4 h-4 text-slate-600" />
                    </div>
                </div>
            </Card>
          </div>

{/* COLUMNA DERECHA: PREVIEW, CLIENTES Y SEGURIDAD */}
<div className="flex flex-col justify-between gap-6">
  <div className="space-y-6">
    {/* CARD: LIVE PREVIEW */}
    <Card className="bg-slate-900/40 border-slate-800 shadow-2xl rounded-[2rem] overflow-hidden border-t-emerald-500/20">
      <div className="p-4 border-b border-slate-800 bg-black/20 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Live Terminal Preview</div>
      <CardContent className="p-8">
        <div className="bg-white p-2 rounded-sm shadow-2xl mb-8 ring-8 ring-black/10">
          <TicketPreview settings={settings} />
        </div>
<div className="grid grid-cols-3 gap-4">
  {[57, 58, 80].map(size => (
    <button 
      key={size} 
      onClick={() => handleChange("ticket_width", size)} 
      className={`h-24 rounded-2xl border-2 font-black transition-all duration-500 flex flex-col items-center justify-center gap-1 overflow-hidden group ${
        settings.ticket_width === size 
        ? "border-emerald-500 text-white bg-gradient-to-br from-black via-emerald-900 via-emerald-700 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-105" 
        : "border-slate-800 bg-black/40 text-slate-500 hover:border-slate-600 hover:text-slate-300"
      }`}
    >
      {/* Indicador visual superior solo cuando está activo */}
      {settings.ticket_width === size && (
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50" />
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
    <Card className="bg-slate-900/40 border-slate-800 rounded-[2rem] overflow-hidden">
      <CardContent className="p-8 space-y-8">
        <div className="flex items-center gap-2 text-indigo-400 font-black text-[11px] uppercase tracking-wider border-b border-slate-800 pb-4">
          <Users className="w-5 h-5" /> Formulario de Clientes
        </div>
        
        {/* MODO DE REGISTRO */}
        <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-black/40 rounded-[1.5rem] border border-white/5 gap-4">
          <div className="flex flex-col gap-1 w-full">
            <Label className="text-[14px] text-white font-black uppercase tracking-tight leading-none">Modo de Registro</Label>
            <p className="text-[11px] text-slate-500 font-bold italic leading-tight uppercase tracking-tighter">Configuración de campos</p>
          </div>
          <div className="flex bg-black p-1.5 rounded-xl border border-slate-800 w-full md:w-auto">
            {['basic', 'complete'].map((m) => (
              <button 
                key={m} 
                onClick={() => handleChange("customer_form_mode", m)}
                className={`flex-1 md:flex-none px-8 py-2.5 rounded-lg text-[11px] font-black uppercase transition-all duration-300 ${
                  settings.customer_form_mode === m 
                  ? "bg-gradient-to-r from-black via-emerald-600 via-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-900/20" 
                  : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {m === 'basic' ? 'Basic' : 'Complete'}
              </button>
            ))}
          </div>
        </div>

        {/* VENTA EN NEGATIVO */}
        <div className="flex items-center justify-between p-6 bg-black/40 rounded-[1.5rem] border border-white/5">
          <div className="flex flex-col gap-1">
            <Label className="text-[14px] text-white font-black uppercase tracking-tight italic">Permitir ventas con stock negativo</Label>
            <p className="text-[10px] text-rose-500/70 font-bold uppercase tracking-widest leading-none">
              {settings.allow_negative_balance ? "⚠️ Riesgo de descuadre activo" : "✓ Control de inventario estricto"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-black uppercase tracking-tighter ${settings.allow_negative_balance ? "text-emerald-500" : "text-slate-500"}`}>
              {settings.allow_negative_balance ? "Activado" : "Desactivado"}
            </span>
            <Switch 
              checked={!!settings.allow_negative_balance} 
              onCheckedChange={(v) => handleChange("allow_negative_balance", v ? 1 : 0)} 
              className="data-[state=checked]:bg-emerald-500 scale-125 shadow-lg shadow-emerald-900/20" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* CARD DE SEGURIDAD - ANCLADA AL FINAL DERECHO */}
<Card className="bg-slate-900/40 border-slate-800 p-6 rounded-[2rem] shadow-xl">
  <div className="flex items-center gap-2  text-indigo-400 font-black text-[11px] uppercase tracking-[0.2em] border-b border-slate-800 pb-4 mb-4">
    <Lock className="w-4 h-4  text-indigo-400" /> Seguridad: Precio Dinámico 🔐
  </div>
  <div className="flex flex-row items-center justify-between gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
    <div className="flex flex-col">
      <Label className="text-[13px] text-slate-300 font-bold uppercase shrink-0 tracking-tight">Clave de Autorización</Label>
      <span className="text-[10px] text-emerald-500/50 font-mono font-bold uppercase italic">Acceso a Precio Libre</span>
    </div>
    <div className="relative w-32 group">
      {/* Brillo sutil al enfocar */}
      <div className="absolute -inset-1 bg-emerald-500/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
      
      <Input 
        type="password" 
        value={settings.dynamic_price_auth_key} 
        onChange={(e) => handleChange("dynamic_price_auth_key", e.target.value)}
        className="relative bg-black border-slate-800 h-10 font-mono text-center rounded-xl text-emerald-400 tracking-widest text-lg focus:border-emerald-500/50 transition-all" 
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