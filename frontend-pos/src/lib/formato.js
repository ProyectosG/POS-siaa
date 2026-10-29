// lib/formato.js
// Formato de montos para MOSTRAR: $1,234.50 (pesos mexicanos). Para capturar o
// calcular se usan números, nunca este texto.
const PESOS = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// pesos(1234.5) → "$1,234.50"; null/vacío → "$0.00"
export function pesos(valor) {
  const n = Number(valor)
  return PESOS.format(Number.isFinite(n) ? n : 0)
}

// Fecha AAAA-MM-DD → DD/MM/AAAA (solo para mostrar)
export function fechaCorta(fecha) {
  if (!fecha || typeof fecha !== "string") return ""
  const [a, m, d] = fecha.slice(0, 10).split("-")
  return a && m && d ? `${d}/${m}/${a}` : fecha
}
