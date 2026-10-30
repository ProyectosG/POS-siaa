// Modo demo: se activa al construir con NEXT_PUBLIC_MODO_DEMO=1 (solo en el
// servicio de la demo). Solo decide qué se muestra; el servidor bloquea lo
// sensible por su cuenta (MODO_DEMO=1 en el backend).
export const ES_DEMO = process.env.NEXT_PUBLIC_MODO_DEMO === "1"
