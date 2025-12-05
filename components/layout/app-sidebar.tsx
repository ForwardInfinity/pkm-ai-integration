"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"

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
}

export function AppSidebar({ isCollapsed, email }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <div
      data-collapsed={isCollapsed}
      className="group flex flex-col gap-4 py-4 data-[collapsed=true]:py-4 h-full bg-muted/10"
    >
      <div className={cn("flex h-[52px] items-center px-4", isCollapsed ? "justify-center px-2" : "justify-start")}>
        <Logo className={cn("transition-all", isCollapsed && "scale-0 w-0 h-0 overflow-hidden")} />
        {isCollapsed && <Logo iconOnly className="h-6 w-6" />}
      </div>
      <Separator />
      <div className={cn("px-4", isCollapsed ? "px-2" : "px-4")}>
         <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isCollapsed ? "ghost" : "default"}
                size={isCollapsed ? "icon" : "default"}
                className={cn("w-full justify-start", isCollapsed && "h-9 w-9 justify-center")}
              >
                <Plus className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "New Note"}
                <span className="sr-only">New Note</span>
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">New Note</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
      <ScrollArea className="flex-1 px-2">
        <div className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-0">
          {sidebarNavigation.map((link, index) => {
             const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
             
             return isCollapsed ? (
              <TooltipProvider key={index} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        buttonVariants({ variant: isActive ? "default" : "ghost", size: "icon" }),
                        "h-9 w-9",
                        isActive && "dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white"
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      <span className="sr-only">{link.title}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-4">
                    {link.title}
                    {link.badge && (
                      <span className="ml-auto text-muted-foreground">
                        {/* Conflict count placeholder */}
                        0
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
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
                    {/* Conflict count placeholder */}
                     0
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </ScrollArea>
      <div className={cn("mt-auto px-2", isCollapsed ? "px-1" : "px-2")}>
        <UserNav email={email} isCollapsed={isCollapsed} />
      </div>
    </div>
  )
}

