'use client'

import Link from 'next/link'
import { FileText, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 shadow-sm ring-1 ring-border/30">
          <FileText className="h-7 w-7 text-muted-foreground/80" />
        </div>
        
        <h2 className="text-lg font-semibold text-foreground">
          Start your knowledge journey
        </h2>
        
        <p className="mt-2 text-sm text-muted-foreground">
          Capture your ideas and watch them evolve.
        </p>
        
        <Button asChild className="mt-5 gap-2">
          <Link href="/notes/new">
            <PenLine className="h-4 w-4" />
            Create your first note
          </Link>
        </Button>
      </div>
    </div>
  )
}
