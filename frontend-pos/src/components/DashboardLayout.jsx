"use client";
import React from "react";
import { useRouter } from "next/navigation";
import SidebarMenu from "@/components/SidebarMenu/SidebarMenu";
import { useAuthStore } from "@/store/useAuthStore";

export default function DashboardLayout({ children }) {
  const router = useRouter();

  // Leer usuario y flag de hidratación
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore.persist?.hasHydrated?.() ?? true;

  // Estado local para controlar la carga
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isHydrated) return; // Esperar a que Zustand cargue el localStorage

    if (!user) {
      router.replace("/login"); // redirección segura sin flash
    } else {
      setIsLoading(false); // usuario listo
    }
  }, [isHydrated, user, router]);

  // Mostrar loading mientras se hidrata el estado
  if (!isHydrated || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-white text-lg">Cargando usuario...</p>
      </div>
    );
  }

  // Si no hay usuario (ya redirigió), no renderizar nada// Si no hay usuario (ya redirigió), no renderizar nada
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarMenu />

     <main className="flex-1 min-h-full bg-background p-6 overflow-auto">

        {children}
      </main>
    </div>
  );

}
