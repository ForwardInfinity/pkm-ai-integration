"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PanelRightClose } from "lucide-react"
import { TooltipIconButton } from "@/components/shared/tooltip-icon-button"
import { LAYOUT_CONSTANTS } from "@/types/layout.types"
import { useCurrentDraftId } from "@/stores"
import { NoteInspector } from "@/features/inspector/components"

interface InspectorPanelProps {
  isCollapsed: boolean
  onToggle?: () => void
}

export function InspectorPanel({
  isCollapsed,
  onToggle,
}: InspectorPanelProps) {
  // Check if we're editing a note
  const currentDraftId = useCurrentDraftId()
  const isEditingNote = currentDraftId !== null

  if (isCollapsed) {
    return null
  }

  return (
    <aside
      className="relative flex flex-col h-full bg-muted/10"
      role="complementary"
      aria-label="Inspector panel"
      id="inspector-panel"
    >
      {/* Header */}
      <div
        className="flex items-center px-4"
        style={{ height: LAYOUT_CONSTANTS.HEADER_HEIGHT }}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Inspector
        </h2>
      </div>

      <Separator />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isEditingNote ? (
            <NoteInspector />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Select a note to view details
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Collapse Button */}
      {onToggle && (
        <div className="absolute bottom-2 left-2">
          <TooltipIconButton
            icon={<PanelRightClose className="h-4 w-4" />}
            tooltip="Collapse inspector"
            tooltipSide="left"
            onClick={onToggle}
            aria-label="Collapse inspector"
            aria-expanded={!isCollapsed}
            aria-controls="inspector-panel"
          />
        </div>
      )}
    </aside>
  )
}
