'use client'

import { Trash2 } from 'lucide-react'

export function TrashEmptyState() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4 py-16">
      <div className="rounded-2xl bg-background p-8 text-center shadow-sm ring-1 ring-border/50">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
          <Trash2 className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-medium text-foreground">Trash is empty</h3>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Deleted notes will appear here. They&apos;re kept for 30 days before permanent removal.
        </p>
      </div>
    </div>
  )
}
