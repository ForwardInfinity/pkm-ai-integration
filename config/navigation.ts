import { FileText, AlertTriangle, Network, Search, Trash2, Settings } from "lucide-react";

export const sidebarNavigation = [
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
] as const;

export const adminNavigation = [
  {
    title: "Admin Dashboard",
    href: "/admin",
    icon: Settings,
  },
] as const;
