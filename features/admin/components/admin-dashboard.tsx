'use client'

import { AlertTriangle, Loader2, Shield } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAdminStats, useEmbeddingDetails } from '../hooks/use-admin-stats'
import { StatsOverview } from './stats-overview'
import { SystemHealth } from './system-health'
import { UserList } from './user-list'

export function AdminDashboard() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useAdminStats()

  const {
    data: embeddingDetails,
    isLoading: embeddingLoading,
  } = useEmbeddingDetails()

  const isLoading = statsLoading || embeddingLoading

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
            <div className="relative rounded-full bg-background p-4 shadow-sm ring-1 ring-border/50">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Loading dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (statsError) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="rounded-2xl bg-background p-8 text-center shadow-sm ring-1 ring-destructive/20">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Unable to load dashboard
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {statsError.message || 'Please check your connection and try again'}
          </p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/10">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  System overview and management
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
          {/* Overview Section */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overview
            </h2>
            <StatsOverview stats={stats} />
          </section>

          {/* System Health Section */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              System Health
            </h2>
            <SystemHealth stats={stats} embeddingDetails={embeddingDetails} />
          </section>

          {/* User Management Section */}
          <section>
            <UserList />
          </section>
        </main>
      </div>
    </ScrollArea>
  )
}
