import {
  FileText,
  AlertTriangle,
  Network,
  Search,
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
    title: "Problem Graph",
    href: "/graph",
    icon: Network,
  },
  {
    title: "Search",
    href: "/search",
    icon: Search,
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
