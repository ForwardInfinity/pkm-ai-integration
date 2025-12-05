import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { ThreePanelLayout } from "@/components/layout/three-panel-layout"
import { COOKIE_CONFIG, LAYOUT_CONSTANTS } from "@/types/layout.types"

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

  // Read persisted layout state from Zustand cookie
  const layoutCookie = cookieStore.get(COOKIE_CONFIG.LAYOUT_KEY)

  let defaultLayout: number[] | undefined
  let defaultCollapsed: boolean | undefined
  let defaultInspectorCollapsed: boolean | undefined

  if (layoutCookie?.value) {
    try {
      const parsed = JSON.parse(layoutCookie.value)
      // Zustand persist wraps state in { state: {...}, version: number }
      const state = parsed.state || parsed

      if (state.sizes) {
        defaultLayout = [
          state.sizes.sidebar ?? LAYOUT_CONSTANTS.DEFAULT_SIDEBAR_SIZE,
          state.sizes.main ?? LAYOUT_CONSTANTS.DEFAULT_MAIN_SIZE,
          state.sizes.inspector ?? LAYOUT_CONSTANTS.DEFAULT_INSPECTOR_SIZE,
        ]
      }
      defaultCollapsed = state.isSidebarCollapsed
      defaultInspectorCollapsed = state.isInspectorCollapsed
    } catch {
      // Invalid cookie, use defaults
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <ThreePanelLayout
        defaultLayout={defaultLayout}
        defaultCollapsed={defaultCollapsed}
        defaultInspectorCollapsed={defaultInspectorCollapsed}
        email={user?.email}
      >
        {children}
      </ThreePanelLayout>
    </div>
  )
}
