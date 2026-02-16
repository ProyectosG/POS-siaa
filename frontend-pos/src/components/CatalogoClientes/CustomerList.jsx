import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function CustomerList({
  customers,
  selectedCustomer,
  onSelect,
  loading
}) {
  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 text-slate-400 text-center">
          Cargando clientes...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Clientes</CardTitle>
        <CardDescription className="text-slate-400">
          ID · Nombre · Saldo
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 max-h-[600px] overflow-y-auto">
        {customers.map(customer => (
          <button
            key={customer.id}
            onClick={() => onSelect(customer)}
            className={`w-full px-4 py-3 text-left border-b border-slate-700
              hover:bg-slate-700/50
              ${selectedCustomer?.id === customer.id
                ? "bg-slate-700/70 border-l-4 border-blue-500"
                : ""}`}
          >
            <div className="grid grid-cols-12 gap-2 text-sm">
              <div className="col-span-2 text-slate-400">
                {customer.id}
              </div>

              <div className="col-span-7 text-white truncate">
                {customer.first_name} {customer.last_name_paternal}
              </div>

              <div className={`col-span-3 text-right font-medium
                ${Number(customer.current_balance) > 0
                  ? "text-amber-400"
                  : "text-slate-400"}`}
              >
                ${Number(customer.current_balance || 0).toFixed(2)}
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
