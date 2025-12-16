'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useConflicts } from '../hooks/use-conflicts'
import { useDismissConflict } from '../hooks/use-dismiss-conflict'
import { ConflictCard } from './conflict-card'
import { ConflictEmptyState } from './conflict-empty-state'

export function ConflictList() {
  const { data: conflicts, isLoading, error } = useConflicts('active')
  const dismissMutation = useDismissConflict()

  const handleDismiss = async (conflictId: string) => {
    try {
      await dismissMutation.mutateAsync(conflictId)
      toast.success('Conflict dismissed')
    } catch {
      toast.error('Failed to dismiss conflict')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
            <div className="relative rounded-full bg-background p-4 shadow-sm ring-1 ring-border/50">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading conflicts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-destructive/5 px-4 py-16">
        <div className="rounded-2xl bg-background p-8 text-center shadow-sm ring-1 ring-destructive/20">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">Unable to load conflicts</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Please check your connection and try again
          </p>
        </div>
      </div>
    )
  }

  if (!conflicts || conflicts.length === 0) {
    return <ConflictEmptyState />
  }

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/10">
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl px-6 py-5 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    Conflicts
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'} detected
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
          <div className="grid gap-3">
            {conflicts.map((conflict, index) => (
              <div
                key={conflict.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <ConflictCard
                  conflict={conflict}
                  onDismiss={handleDismiss}
                  isDismissing={dismissMutation.isPending}
                />
              </div>
            ))}
          </div>
          <div className="h-8" />
        </main>
      </div>
    </ScrollArea>
  )
}
