import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { ThreePanelLayout } from "@/components/layout/three-panel-layout"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const layout = cookieStore.get("react-resizable-panels:layout")
  const collapsed = cookieStore.get("react-resizable-panels:collapsed")

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined

  return (
    <div className="h-screen overflow-hidden bg-background">
       <ThreePanelLayout 
          defaultLayout={defaultLayout}
          defaultCollapsed={defaultCollapsed}
          email={user?.email}
       >
          {children}
       </ThreePanelLayout>
    </div>
  )
}
