import { Edit2, Trash2, User, Phone, MapPin } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"

export default function CustomerDetail({ customer, onEdit, onDelete }) {
  if (!customer) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 h-full flex items-center justify-center">
        <CardContent className="text-center">
          <User className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Selecciona un cliente</p>
        </CardContent>
      </Card>
    )
  }

  const handleDelete = async () => {
    if (!confirm("¿Eliminar cliente?")) return
    await onDelete(customer.id)
    toast.success("Cliente eliminado")
  }

  return (
    <Card className="bg-slate-700/60 border-slate-700 h-full flex flex-col">
      {/* HEADER (altura fija) */}
      <CardHeader className="shrink-0">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-2xl text-white">
              {customer.first_name} {customer.last_name_paternal} {customer.last_name_maternal || ""}
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              ID Cliente: {customer.id}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => onEdit(customer)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* CONTENIDO SCROLLEABLE */}
      <CardContent className="flex-1 overflow-y-auto space-y-8">
        {/* Información de contacto */}
        <section>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-emerald-400" />
            Información de Contacto
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-7">
            <div>
              <p className="text-xs text-slate-400">Teléfono</p>
              <p className="text-white mt-1">{customer.phone || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-white mt-1">{customer.email || "—"}</p>
            </div>
          </div>
        </section>

        {/* Dirección */}
        <section>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-blue-400" />
            Dirección
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-7">
            <div className="md:col-span-2">
              <p className="text-xs text-slate-400">Calle y número</p>
              <p className="text-white mt-1">{customer.address || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Código Postal</p>
              <p className="text-white mt-1">{customer.postal_code || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Ciudad</p>
              <p className="text-white mt-1">{customer.city || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Estado</p>
              <p className="text-white mt-1">{customer.state || "—"}</p>
            </div>
          </div>
        </section>

        {/* Saldo / Crédito */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-4">
            Información Financiera
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pl-7">
            <div>
              <p className="text-xs text-slate-400">Saldo Actual</p>
              <p className="text-xl font-semibold text-amber-400 mt-1">
                ${Number(customer.current_balance || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
