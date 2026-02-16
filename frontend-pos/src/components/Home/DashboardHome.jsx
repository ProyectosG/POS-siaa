"use client"
import { useAuthStore } from "@/store/useAuthStore"

export default function DashboardHome() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col items-center justify-start overflow-hidden bg-[#f8fafc] px-4">
      
      {/* FONDO INTEGRADO: Gradiente radial */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-50" />

      {/* 1. CONTENEDOR DE LA IMAGEN (Escalado responsivo) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <img 
          src="/imgPortadaPos.png" 
          alt="SIAA Logo Background" 
          className="w-[120%] md:w-full max-w-[1100px] h-auto object-contain opacity-[0.50] mix-blend-multiply transition-all duration-1000"
        />
      </div>

      {/* 2. CONTENIDO CENTRAL */}
      <div className="relative z-10 w-full max-w-5xl pt-6 md:pt-10 flex flex-col items-center text-center">
        
        {/* INDICADOR DE ESTADO (Más arriba y compacto) */}
        <div className="mb-6 scale-[0.85] md:scale-100">
          <div className="flex items-center gap-3 px-4 py-1 rounded-full border border-slate-200/60 bg-white/40 backdrop-blur-md shadow-sm">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             <span className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-bold whitespace-nowrap">
               System Online
             </span>
          </div>
        </div>

        {/* SALUDO BIENVENIDA (Como segundo elemento) */}
        <div className="mb-8 md:mb-12">
          <p className="text-xl md:text-3xl font-light text-slate-600 flex flex-col md:flex-row items-center justify-center gap-x-3 gap-y-1">
            <span className="opacity-70">Bienvenido,</span> 
            <span className="text-emerald-600 font-medium break-all">{user?.nickname || "Usuario"}</span>
          </p>
        </div>

        <header className="w-full space-y-6 md:space-y-8">
          {/* GESTIÓN DE VENTAS E INVENTARIOS (Separado responsivo) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-slate-400 font-extralight tracking-[0.4em] uppercase text-[9px] md:text-xs">
            <span className="whitespace-nowrap">Gestión de Ventas</span>
            <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-slate-300" />
            <span className="whitespace-nowrap">e Inventarios</span>
          </div>

          {/* SISTEMA POS-SIAA (Título principal) */}
          <div className="flex flex-col items-center justify-center">
            <h1 className="flex flex-col md:flex-row items-center justify-center gap-x-4 gap-y-2 leading-none tracking-tighter text-slate-900">
              <span className="text-5xl md:text-8xl font-extralight">Sistema</span>
              <span className="text-6xl md:text-8xl font-semibold text-slate-800 italic">POS-SIAA</span>
            </h1>
            
            {/* Líneas decorativas inferiores (Solo desktop) */}
            <div className="hidden lg:flex items-center justify-center gap-8 pt-10 w-full opacity-30">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-400 max-w-[150px]" />
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-400 max-w-[150px]" />
            </div>
          </div>
        </header>
      </div>

      {/* 3. FOOTER */}
      <div className="absolute bottom-6 md:bottom-10 w-full text-center px-4">
        <p className="text-[8px] md:text-[9px] text-slate-300 tracking-[0.5em] uppercase font-medium">
          Build 2026.1 // Enterprise Edition
        </p>
      </div>

    </div>
  )
}