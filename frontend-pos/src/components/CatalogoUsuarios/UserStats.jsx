import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"

export default function UserStats({ users }) {
  return (
    <div className="flex justify-center gap-3 mb-8">
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white w-24">
        <CardHeader className="pb-1 pt-2 px-2 text-center">
          <CardDescription className="text-blue-100 text-[9px]">Total</CardDescription>
          <CardTitle className="text-lg">{users.length}</CardTitle>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 text-white w-24">
        <CardHeader className="pb-1 pt-2 px-2 text-center">
          <CardDescription className="text-purple-100 text-[9px]">Admins</CardDescription>
          <CardTitle className="text-lg">{users.filter(u => u.access_level === 99).length}</CardTitle>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 text-white w-24">
        <CardHeader className="pb-1 pt-2 px-2 text-center">
          <CardDescription className="text-orange-100 text-[9px]">Gerentes</CardDescription>
          <CardTitle className="text-lg">{users.filter(u => u.access_level === 90).length}</CardTitle>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 border-0 text-white w-24">
        <CardHeader className="pb-1 pt-2 px-2 text-center">
          <CardDescription className="text-indigo-100 text-[9px]">Supervisores</CardDescription>
          <CardTitle className="text-lg">{users.filter(u => u.access_level === 50).length}</CardTitle>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 text-white w-24">
        <CardHeader className="pb-1 pt-2 px-2 text-center">
          <CardDescription className="text-emerald-100 text-[9px]">Cajeros</CardDescription>
          <CardTitle className="text-lg">{users.filter(u => u.access_level === 1).length}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}