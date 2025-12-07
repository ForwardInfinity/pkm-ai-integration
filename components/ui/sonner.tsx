"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-foreground group-[.toast]:text-background group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:shadow-none hover:group-[.toast]:bg-foreground/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs",
          success: "group-[.toaster]:border-border",
          error: "group-[.toaster]:border-destructive/30 group-[.toaster]:text-destructive",
          title: "group-[.toast]:font-medium group-[.toast]:text-sm",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
