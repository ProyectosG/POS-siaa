import { Mail, Phone, Shield, Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const accessLevelMap = { 1: "Cajero", 50: "Supervisor", 90: "Gerente", 99: "Administrador" }

export default function UserCard({ user, onEdit, onDelete }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <img src={user.photo_url || "/placeholder.svg?height=80&width=80"} alt={user.full_name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-600" />
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white">{user.full_name}</h3>
            <p className="text-sm text-blue-400">@{user.nickname}</p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Mail className="h-3 w-3" /> {user.email}
              </p>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Phone className="h-3 w-3" /> {user.phone}
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Shield className="h-3 w-3 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">{accessLevelMap[user.access_level] || user.access_level}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-slate-700">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit2 className="h-3 w-3 mr-1" /> Editar
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="border-red-900/50 text-red-400 hover:bg-red-900/20">
            <Trash2 className="h-3 w-3 mr-1" /> Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}