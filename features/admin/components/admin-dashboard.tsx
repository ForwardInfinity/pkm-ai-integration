'use client'

import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useAdminStats, useEmbeddingDetails, adminStatsKeys } from '../hooks/use-admin-stats'
import { useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from './admin-layout'
import { StatsOverview } from './stats-overview'
import { SystemHealth } from './system-health'
import { UserList } from './user-list'

function DashboardContent() {
  const queryClient = useQueryClient()
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    isFetching,
  } = useAdminStats()

  const {
    data: embeddingDetails,
    isLoading: embeddingLoading,
  } = useEmbeddingDetails()

  const isLoading = statsLoading || embeddingLoading

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: adminStatsKeys.all })
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-foreground/5" />
            <div className="relative rounded-full bg-card p-4 shadow-sm ring-1 ring-border/50">
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
        <div className="rounded-2xl bg-card p-8 text-center shadow-sm ring-1 ring-rose-500/20">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
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
      <div className="min-h-full">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur-xl">
          <div className="flex items-center justify-between px-8 py-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Overview
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Monitor your system health and manage users
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-8 px-8 py-8">
          {/* Stats Overview */}
          <section>
            <StatsOverview stats={stats} />
          </section>

          {/* Two Column Layout for Health and Users */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Health */}
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                System Health
              </h2>
              <SystemHealth stats={stats} embeddingDetails={embeddingDetails} />
            </section>

            {/* User Management */}
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Users
              </h2>
              <UserList />
            </section>
          </div>
        </main>
      </div>
    </ScrollArea>
  )
}

export function AdminDashboard() {
  return (
    <AdminLayout>
      <DashboardContent />
    </AdminLayout>
  )
}
