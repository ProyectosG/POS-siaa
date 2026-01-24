"use client";

import React, { useState } from "react";
import { AlertTriangle, Zap, Check } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ResetDatos() {
  const { user } = useAuthStore();

  const [selectedTables, setSelectedTables] = useState([]);
  const [resetIds, setResetIds] = useState(false);
  const [resetBalances, setResetBalances] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Solo SUPERdeveloper puede ver y usar esto
  if (!user?.isSuperDev) {
    return (
      <div className="text-center text-red-500 text-xl font-bold py-20">
        ¡Acceso restringido! Solo para SUPERdevelopers. 🛡️
      </div>
    );
  }

  const allTables = [
    'categories',
    'products',
    'users',
    'customers',
    'sales',
    'sale_details',
    'payments',
    'cuts',
    'kardex',
    'entries',
    'entry_details',
    'customer_balance_history'
  ];

  const handleSelectTable = (table) => {
    setSelectedTables(prev =>
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
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
      console.log('[FRONTEND] Iniciando reset con:', { selectedTables, resetIds, resetBalances });

      // Resetear tablas seleccionadas
      if (selectedTables.length > 0) {
        const res = await fetch(`${API_URL}/reset/tables`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tables: selectedTables, resetIds }),
          credentials: 'include'  // ← ENVÍA LAS COOKIES (is-superdev=true)
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Error al resetear tablas');
        }

        toast.success(data.message || '¡Tablas zapeadas! 💥');
      }

      // Resetear saldos y stocks
      if (resetBalances) {
        const res = await fetch(`${API_URL}/reset/balances`, {
          method: 'POST',
          credentials: 'include'  // ← CRÍTICO
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
    <div className="max-w-4xl mx-auto p-6 bg-slate-900/90 rounded-2xl border border-slate-700 shadow-2xl">
      <h1 className="text-4xl font-extrabold text-white mb-6 text-center flex items-center justify-center gap-4">
        <Zap className="text-yellow-400 animate-pulse" size={40} /> ¡Zapeador de Datos! ⚡💥
      </h1>
      <p className="text-slate-300 mb-10 text-center text-lg">
        Selecciona qué zapear. <strong>¡Cuidado! Esto es irreversible</strong> ❌  
        Pero haremos backup automático antes del boom.
      </p>

      {/* Selección de Tablas */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-cyan-400 mb-6 text-center">Elige tablas a zapear</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allTables.map(table => (
            <button
              key={table}
              onClick={() => handleSelectTable(table)}
              className={cn(
                "p-5 rounded-xl border-2 transition-all duration-200 text-center font-medium",
                selectedTables.includes(table)
                  ? "bg-red-700/70 border-red-500 text-white shadow-lg scale-105"
                  : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500"
              )}
            >
              {table.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Opciones Extra */}
      <section className="mb-10 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">Opciones Extra</h2>
        <div className="space-y-6">
          <label className="flex items-center gap-4 text-lg text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={resetIds}
              onChange={() => setResetIds(!resetIds)}
              className="w-5 h-5 accent-yellow-400"
            />
            Resetear IDs autoincrementales (¡Vuelve a 1! 🔄)
          </label>
          <label className="flex items-center gap-4 text-lg text-slate-200 cursor-pointer">
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
          <div className="bg-slate-900 p-10 rounded-3xl border-4 border-red-600 max-w-lg w-full text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-red-400 mb-6">¡ÚLTIMA ADVERTENCIA! ⚠️💥</h2>
            <p className="text-slate-300 mb-8 text-lg">
              Esto borrará los datos seleccionados de forma permanente.  
              Escribe <strong className="text-yellow-300">ZAPEAR</strong> para confirmar el apocalipsis de datos.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="w-full p-4 bg-slate-800 border-2 border-red-500 rounded-xl text-white text-xl mb-8 focus:outline-none focus:border-red-400"
              placeholder="Escribe ZAPEAR aquí"
            />
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="px-8 py-4 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition text-lg"
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