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

  // Borra en el servidor y muestra el motivo si lo rechaza (p. ej. tiene productos)
  const borrar = async (ruta) => {
    const res = await apiFetch(ruta, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setError(res.ok ? "" : data.error || "No se pudo eliminar");
    fetchCategories();
  };

  // Una subfamilia
  const handleEliminar = (id) => {
    if (!confirm("¿Estás seguro de eliminar esta subfamilia?")) return;
    borrar(`/categories/${id}`);
  };

  // La familia completa en una sola operación: si alguna subfamilia tiene
  // productos, el servidor no borra nada (antes quedaba a medias)
  const handleEliminarFamilia = (family) => {
    if (!confirm(`¿Estás seguro de eliminar la familia ${family} y sus subfamilias?`)) return;
    borrar(`/categories/familia/${encodeURIComponent(family)}`);
  };

  return (
    <div className="min-h-screen sm:p-6">
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
            handleEliminarFamilia={handleEliminarFamilia}
          />
        </div>
      </div>
    </div>
  );
}
