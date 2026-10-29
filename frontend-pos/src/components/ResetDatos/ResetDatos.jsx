"use client";

import React, { useState } from "react";
import { AlertTriangle, Zap, Check, Download } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiFetch"


export default function ResetDatos() {
  const { user } = useAuthStore();

  const [selectedTables, setSelectedTables] = useState([]);
  const [resetIds, setResetIds] = useState(false);
  const [resetBalances, setResetBalances] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [respaldando, setRespaldando] = useState(false);

  // Solo SUPERdeveloper puede ver y usar esto
  if (!user?.isSuperDev) {
    return (
      <div className="text-center text-red-500 text-xl font-bold py-20">
        ¡Acceso restringido! Solo para SUPERdevelopers. 🛡️
      </div>
    );
  }

  // "Respaldar ahora": el servidor hace la copia con VACUUM INTO (seguro con el
  // servidor encendido) y la entrega para descargar
  const handleRespaldar = async () => {
    if (respaldando) return;
    setRespaldando(true);
    try {
      const res = await apiFetch(`/superdev/respaldo`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo hacer el respaldo');
      }
      const disposicion = res.headers.get('Content-Disposition') || '';
      const nombre = (disposicion.match(/filename="?([^";]+)"?/) || [])[1] || 'pos_respaldo.db';
      const archivo = await res.blob();

      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);

      const tamaño = archivo.size >= 1024 * 1024
        ? `${(archivo.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.ceil(archivo.size / 1024)} KB`;
      toast.success(
        `Respaldo descargado: ${nombre} (${tamaño}). Guarda este archivo en un lugar privado: contiene todos los datos del negocio`,
        { duration: 10000 }
      );
    } catch (err) {
      toast.error(err.message || 'No se pudo hacer el respaldo');
    } finally {
      setRespaldando(false);
    }
  };

const allTables = [
    // 1. Primero los detalles (Las ramas)
    'sale_details',
    'entry_details',
    'kardex',
    'customer_balance_history',

    // 2. Luego las cabeceras (Los troncos)
    'payments',
    'sales',
    'entries',
    'cuts',

    // 3. Después los productos (Dependen de categorías)
    'products',

    // 4. Al final las maestras base (La raíz)
    'categories',
    'customers',
    'cash_registers',
    'users'
  ];

const handleSelectTable = (table) => {
  setSelectedTables(prev => {
    let newSelection = prev.includes(table) 
      ? prev.filter(t => t !== table) 
      : [...prev, table];

    // Si seleccionas CATEGORIES, selecciona PRODUCTS automáticamente para evitar el error de FK
    if (table === 'categories' && newSelection.includes('categories')) {
      if (!newSelection.includes('products')) newSelection.push('products');
    }
    
    return newSelection;
  });
};
  const handleReset = async () => {
    if (confirmText.toUpperCase() !== 'ZAPEAR') {
      toast.error('¡Escribe "ZAPEAR" exactamente para confirmar el caos! ⚠️');
      return;
    }

    if (selectedTables.length === 0 && !resetBalances) {
      toast.error('Selecciona al menos una tabla o activa la limpieza financiera 😅');
      return;
    }

    try {
      // Resetear tablas seleccionadas
      if (selectedTables.length > 0) {
        const res = await apiFetch(`/reset/tables`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tables: selectedTables, resetIds }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Error al resetear tablas');
        }

        toast.success(data.message || '¡Tablas zapeadas! 💥');
      }

      // Resetear saldos y stocks
      if (resetBalances) {
        const res = await apiFetch(`/reset/balances`, {
          method: 'POST',
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Error al resetear saldos/stocks');
        }

        toast.success(data.message || '¡Saldos y stocks a cero! 🧹');
      }

      toast.success('¡Misión cumplida! Todo zapeado con éxito. 🎉');
      setIsConfirmOpen(false);
      setSelectedTables([]);
      setResetIds(false);
      setResetBalances(false);
      setConfirmText('');
    } catch (err) {
      console.error('[RESET FRONTEND ERROR]:', err);
      toast.error(err.message || '¡Error en el zap! Revisa consola.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-background rounded-2xl border border-border shadow-2xl">
      <h1 className="text-4xl font-extrabold text-foreground mb-6 text-center flex items-center justify-center gap-4">
        <Zap className="text-aviso animate-pulse" size={40} /> ¡Zapeador de Datos! ⚡💥
      </h1>
      <p className="text-muted-foreground mb-3 text-center text-lg">
        Selecciona qué zapear. <strong>¡Cuidado! Esto es irreversible</strong> ❌  
      </p>
        <p className="text-muted-foreground mb-3 text-center text-lg">
        Pero haremos backup automático antes del boom.
      </p>

      {/* Respaldo manual */}
      <section className="mb-10 bg-card p-6 rounded-xl border border-emerald-700/60 text-center">
        <h2 className="text-2xl font-bold text-exito mb-2">Respaldo</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Descarga una copia completa de la base. Es seguro con el servidor encendido.
        </p>
        <button
          onClick={handleRespaldar}
          disabled={respaldando}
          className={cn(
            "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition",
            respaldando && "opacity-60 cursor-not-allowed"
          )}
        >
          <Download size={20} /> {respaldando ? 'Respaldando…' : 'Respaldar ahora'}
        </button>
      </section>

      {/* Selección de Tablas */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-primario mb-6 text-center">Elige tablas a zapear</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allTables.map(table => (
            <button
              key={table}
              onClick={() => handleSelectTable(table)}
              className={cn(
                "p-2 rounded-xl border-2 transition-all duration-200 text-center font-medium text-sm",
                selectedTables.includes(table)
                  ? "bg-red-700/70 border-red-500 text-white shadow-lg scale-105"
                  : "bg-card border-border text-muted-foreground hover:bg-muted hover:border-cyan-500"
              )}
            >
              {table.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Opciones Extra */}
      <section className="mb-10 bg-card p-6 rounded-xl border border-border">
        <h2 className="text-2xl font-bold text-aviso mb-6 text-center">Opciones Extra</h2>
        <div className="space-y-6">
          <label className="flex items-center gap-4 text-lg text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={resetIds}
              onChange={() => setResetIds(!resetIds)}
              className="w-5 h-5 accent-yellow-400"
            />
            Resetear IDs autoincrementales (¡Vuelve a 1! 🔄)
          </label>
          <label className="flex items-center gap-4 text-lg text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={resetBalances}
              onChange={() => setResetBalances(!resetBalances)}
              className="w-5 h-5 accent-green-400"
            />
            Poner saldos de clientes y stocks de productos a 0 🧹 Limpieza financiera
          </label>
        </div>
      </section>

      {/* Botón de Acción */}
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={selectedTables.length === 0 && !resetBalances}
        className="w-full py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-xl rounded-xl hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
      >
        <AlertTriangle size={28} /> ¡Iniciar Zap! 💣
      </button>

      {/* Modal de Confirmación */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-background p-10 rounded-3xl border-4 border-red-600 max-w-lg w-full text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-error mb-6">¡ÚLTIMA ADVERTENCIA! ⚠️💥</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Esto borrará los datos seleccionados de forma permanente.  
              Escribe <strong className="text-aviso">ZAPEAR</strong> para confirmar el apocalipsis de datos.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="w-full p-4 bg-card border-2 border-red-500 rounded-xl text-foreground text-xl mb-8 focus:outline-none focus:border-red-400"
              placeholder="Escribe ZAPEAR aquí"
            />
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="px-8 py-4 bg-muted text-foreground font-bold rounded-xl hover:bg-muted transition text-lg"
              >
                Cancelar 😅
              </button>
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition flex items-center gap-3 text-lg"
              >
                <Check size={24} /> Confirmar Zap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}