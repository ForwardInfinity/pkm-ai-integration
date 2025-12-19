import {
  FileText,
  AlertTriangle,
  Trash2,
  Settings,
} from "lucide-react"
import type { NavigationItem } from "@/types/layout.types"

export const sidebarNavigation: NavigationItem[] = [
  {
    title: "Notes",
    href: "/notes",
    icon: FileText,
  },
  {
    title: "Conflicts",
    href: "/conflicts",
    icon: AlertTriangle,
    badge: true, // Show unresolved count
  },
  {
    title: "Trash",
    href: "/trash",
    icon: Trash2,
  },
]

export const adminNavigation: NavigationItem[] = [
  {
    title: "Admin Dashboard",
    href: "/admin",
    icon: Settings,
  },
]
