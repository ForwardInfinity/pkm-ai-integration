"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, PanelLeftClose } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { sidebarNavigation } from "@/config/navigation"
import { Logo } from "@/components/shared/logo"

import { UserNav } from "@/components/layout/user-nav"

interface AppSidebarProps {
  isCollapsed: boolean
  email?: string
  onToggle?: () => void
}

export function AppSidebar({ isCollapsed, email, onToggle }: AppSidebarProps) {
  const pathname = usePathname()

  if (isCollapsed) {
    return null
  }

  return (
    <div className="group relative flex flex-col gap-4 py-4 h-full bg-muted/10"
    >
      <div className="flex h-[52px] items-center justify-start px-4">
        <Logo />
      </div>
      <Separator />
      <div className="px-4">
        <Button variant="default" className="w-full justify-start">
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2">
        <div className="grid gap-1 px-2">
          {sidebarNavigation.map((link, index) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

            return (
              <Link
                key={index}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "sm" }),
                  "justify-start",
                  isActive && "font-medium"
                )}
              >
                <link.icon className="mr-2 h-4 w-4" />
                {link.title}
                {link.badge && (
                  <span
                    className={cn(
                      "ml-auto text-xs",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    0
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </ScrollArea>
      <div className="mt-auto px-2">
        <UserNav email={email} isCollapsed={false} />
      </div>

      {/* Collapse button */}
      {onToggle && (
        <div className="absolute bottom-2 right-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={onToggle}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse sidebar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}

