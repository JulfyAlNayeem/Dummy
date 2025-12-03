import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "./AdminSidebar"

export function AdminLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6">
            <SidebarTrigger />
            <div className="ml-4">
              <h1 className="text-lg font-semibold text-foreground">Policy Enforcement System</h1>
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}