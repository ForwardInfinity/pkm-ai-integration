'use client'

import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        No notes yet
      </h2>
      
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        Start capturing your ideas. Every note is a conjecture waiting to be refined through criticism.
      </p>
      
      <Button asChild className="mt-6">
        <Link href="/notes/new">
          <Plus className="h-4 w-4" />
          Create your first note
        </Link>
      </Button>
    </div>
  )
}
