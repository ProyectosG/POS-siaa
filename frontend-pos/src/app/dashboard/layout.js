import SidebarMenu from "@/components/SidebarMenu/SidebarMenu"

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <main className="flex-1 lg:ml-72 xl:ml-80 p-8">
        {children}
      </main>
    </div>
  )
}
