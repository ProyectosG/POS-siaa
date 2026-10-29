"use client";

import { useState, useEffect } from "react";
import Header from "./Header";
import PanelFormularios from "./PanelFormularios";
import ArbolFamilias from "./ArbolFamilias";
import { apiFetch } from "@/lib/apiFetch"


export default function CatalogoFamilias() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nuevaFamilia, setNuevaFamilia] = useState("");
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState("");
  const [nuevaSubfamilia, setNuevaSubfamilia] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/categories`);
      const data = await res.json();
      setCategories(data);
    } catch {
      setError("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const uniqueFamilies = [...new Set(categories.map((c) => c.family))];
  const familiasAgrupadas = uniqueFamilies.map((family) => ({
    family,
    subfamilias: categories.filter((c) => c.family === family),
  }));

  // Calcular el total de subfamilias (únicas por familia)
  const totalSubfamilias = categories.filter((category) => category.subfamily)
    .length;

  const handleAgregarFamilia = async () => {
    if (!nuevaFamilia.trim()) return;
    await apiFetch(`/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family: nuevaFamilia.trim() }),
    });
    setNuevaFamilia("");
    fetchCategories();
  };

  const handleAgregarSubfamilia = async () => {
    if (!familiaSeleccionada || !nuevaSubfamilia.trim()) return;
    await apiFetch(`/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        family: familiaSeleccionada,
        subfamily: nuevaSubfamilia.trim(),
      }),
    });
    setNuevaSubfamilia("");
    fetchCategories();
  };

  // Recibe un id (subfamilia) o una lista de ids (familia completa)
  const handleEliminar = async (ids) => {
    const lista = Array.isArray(ids) ? ids : [ids];
    const pregunta = lista.length > 1
      ? "¿Estás seguro de eliminar esta familia y sus subfamilias?"
      : "¿Estás seguro de eliminar esta categoría?";
    if (!confirm(pregunta)) return;

    // Antes un borrado fallido se ignoraba; ahora se muestra el motivo (p. ej. tiene productos)
    let fallo = "";
    for (const id of lista) {
      const res = await apiFetch(`/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        fallo = data.error || "No se pudo eliminar la categoría";
      }
    }
    setError(fallo);
    fetchCategories();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Header />

        {error && (
          <div className="mb-6 p-4 bg-error-suave border border-red-500/50 rounded-lg text-error text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PanelFormularios
            nuevaFamilia={nuevaFamilia}
            setNuevaFamilia={setNuevaFamilia}
            familiaSeleccionada={familiaSeleccionada}
            setFamiliaSeleccionada={setFamiliaSeleccionada}
            nuevaSubfamilia={nuevaSubfamilia}
            setNuevaSubfamilia={setNuevaSubfamilia}
            uniqueFamilies={uniqueFamilies}
            categories={categories}
            totalSubfamilias={totalSubfamilias} // Pasando el total de subfamilias
            handleAgregarFamilia={handleAgregarFamilia}
            handleAgregarSubfamilia={handleAgregarSubfamilia}
          />

          <ArbolFamilias
            loading={loading}
            familiasAgrupadas={familiasAgrupadas}
            categories={categories}
            handleEliminar={handleEliminar}
          />
        </div>
      </div>
    </div>
  );
}
