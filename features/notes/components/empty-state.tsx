'use client'

import Link from 'next/link'
import { FileText, Plus, Sparkles, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 px-6 py-16">
      {/* Main content card */}
      <div className="relative w-full max-w-md">
        {/* Decorative background elements */}
        <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
        
        <div className="relative rounded-2xl border border-border/50 bg-card/50 p-8 text-center shadow-sm backdrop-blur-sm">
          {/* Icon stack */}
          <div className="mx-auto mb-6 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/10 blur-md" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
                <FileText className="h-7 w-7 text-primary/60" />
              </div>
              {/* Small floating accent */}
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border/50">
                <Sparkles className="h-3 w-3 text-amber-500" />
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Start your knowledge journey
          </h2>
          
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Capture your ideas and watch them evolve. Every note is a conjecture waiting to be refined through criticism.
          </p>
          
          {/* CTA Button */}
          <Button 
            asChild 
            size="lg"
            className="mt-8 h-11 gap-2 rounded-xl bg-foreground px-6 text-sm font-medium text-background shadow-sm transition-all duration-200 hover:bg-foreground/90 hover:shadow-md"
          >
            <Link href="/notes/new">
              <PenLine className="h-4 w-4" />
              Create your first note
            </Link>
          </Button>
          
          {/* Keyboard shortcut hint */}
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <span>or press</span>
            <kbd className="rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              Ctrl
            </kbd>
            <kbd className="rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              N
            </kbd>
          </p>
        </div>
      </div>
      
      {/* Feature hints */}
      <div className="mt-12 grid w-full max-w-lg grid-cols-3 gap-4">
        {[
          { icon: FileText, label: 'Rich text editing' },
          { icon: Sparkles, label: 'AI-powered insights' },
          { icon: Plus, label: 'Conflict detection' },
        ].map(({ icon: Icon, label }) => (
          <div 
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl border border-transparent p-4 text-center transition-colors hover:border-border/50 hover:bg-muted/30"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
              <Icon className="h-4 w-4 text-muted-foreground/70" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground/70">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
