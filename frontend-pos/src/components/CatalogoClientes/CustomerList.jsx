import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { pesos } from "@/lib/formato"
import ListaVacia from "@/components/ui/lista-vacia"
import { EsqueletoFilas } from "@/components/ui/esqueleto"

export default function CustomerList({
  customers,
  selectedCustomer,
  onSelect,
  loading
}) {
  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <EsqueletoFilas filas={6} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Clientes</CardTitle>
        <CardDescription className="text-muted-foreground">
          ID · Nombre · Saldo
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 max-h-[600px] overflow-y-auto">
        {customers.length === 0 && (
          <ListaVacia className="m-4" titulo="No hay clientes" mensaje="Agrega el primero con Nuevo Cliente." />
        )}
        {customers.map(customer => (
          <button
            key={customer.id}
            onClick={() => onSelect(customer)}
            className={`w-full px-4 py-3 text-left border-b border-border
              hover:bg-muted
              ${selectedCustomer?.id === customer.id
                ? "bg-primario-suave border-l-4 border-primario"
                : ""}`}
          >
            <div className="grid grid-cols-12 gap-2 text-sm">
              <div className="col-span-2 text-muted-foreground">
                {customer.id}
              </div>

              <div className="col-span-7 text-foreground truncate">
                {customer.first_name} {customer.last_name_paternal}
              </div>

              <div className={`col-span-3 text-right font-medium
                ${Number(customer.current_balance) > 0
                  ? "text-aviso"
                  : "text-muted-foreground"}`}
              >
                {pesos(Number(customer.current_balance || 0))}
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
