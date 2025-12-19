'use client'

import { Activity, AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AdminStats, EmbeddingDetails } from '../types'

interface SystemHealthProps {
  stats: AdminStats
  embeddingDetails?: EmbeddingDetails
}

interface StatusItemProps {
  label: string
  count: number
  icon: React.ElementType
  colorClass: string
}

function StatusItem({ label, count, icon: Icon, colorClass }: StatusItemProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('h-3.5 w-3.5', colorClass)} />
      <span className="text-xs text-muted-foreground">
        {label}: <span className="font-medium text-foreground">{count}</span>
      </span>
    </div>
  )
}

export function SystemHealth({ stats, embeddingDetails }: SystemHealthProps) {
  const total = stats.embedding_pending + stats.embedding_processing +
    stats.embedding_completed + stats.embedding_failed
  const progressPercent = total > 0
    ? Math.round((stats.embedding_completed / total) * 100)
    : 0

  const hasFailures = stats.embedding_failed > 0
  const recentFailures = embeddingDetails?.recent_failures || []

  return (
    <div
      className={cn(
        'rounded-xl border bg-card/50 p-5 transition-all duration-200',
        'hover:bg-card hover:shadow-md hover:shadow-black/[0.03]',
        'animate-in fade-in slide-in-from-bottom-1 duration-300'
      )}
      style={{ animationDelay: '120ms' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Embedding Pipeline
          </h3>
          <p className="text-xs text-muted-foreground">
            System health and processing status
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">Progress</span>
          <span className="text-xs font-bold text-foreground">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progressPercent === 100
                ? 'bg-emerald-500'
                : hasFailures
                  ? 'bg-amber-500'
                  : 'bg-primary'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatusItem
          label="Pending"
          count={stats.embedding_pending}
          icon={Clock}
          colorClass="text-muted-foreground"
        />
        <StatusItem
          label="Processing"
          count={stats.embedding_processing}
          icon={Loader2}
          colorClass="text-blue-500"
        />
        <StatusItem
          label="Completed"
          count={stats.embedding_completed}
          icon={CheckCircle2}
          colorClass="text-emerald-500"
        />
        <StatusItem
          label="Failed"
          count={stats.embedding_failed}
          icon={XCircle}
          colorClass="text-destructive"
        />
      </div>

      {/* Recent Failures */}
      {hasFailures && recentFailures.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-medium text-destructive">
              Recent Failures
            </span>
          </div>
          <div className="space-y-2">
            {recentFailures.slice(0, 3).map((failure) => (
              <div
                key={failure.id}
                className="rounded-lg bg-destructive/5 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground truncate">
                    {failure.title || 'Untitled'}
                  </span>
                  {failure.failed_at && (
                    <span className="shrink-0 text-muted-foreground">
                      {formatDistanceToNow(new Date(failure.failed_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                {failure.error && (
                  <p className="mt-1 text-muted-foreground truncate">
                    {failure.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chunks Info */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Total chunks indexed: <span className="font-medium text-foreground">{stats.total_chunks.toLocaleString()}</span>
        </p>
      </div>
    </div>
  )
}
