'use client'

import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AdminStats, EmbeddingDetails } from '../types'

interface SystemHealthProps {
  stats: AdminStats
  embeddingDetails?: EmbeddingDetails
}

interface StatusPillProps {
  label: string
  count: number
  icon: React.ElementType
  variant: 'default' | 'processing' | 'success' | 'error'
}

function StatusPill({ label, count, icon: Icon, variant }: StatusPillProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-full px-4 py-2 transition-all duration-200',
        variant === 'default' && 'bg-muted/50',
        variant === 'processing' && 'bg-blue-500/10',
        variant === 'success' && 'bg-emerald-500/10',
        variant === 'error' && count > 0 && 'bg-rose-500/10'
      )}
    >
      <Icon
        className={cn(
          'h-3.5 w-3.5',
          variant === 'default' && 'text-muted-foreground',
          variant === 'processing' && 'text-blue-500 animate-spin',
          variant === 'success' && 'text-emerald-500',
          variant === 'error' && (count > 0 ? 'text-rose-500' : 'text-muted-foreground')
        )}
      />
      <span className="text-xs font-medium text-foreground tabular-nums">{count}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

export function SystemHealth({ stats, embeddingDetails }: SystemHealthProps) {
  const total = stats.embedding_pending + stats.embedding_processing +
    stats.embedding_completed + stats.embedding_failed
  const progressPercent = total > 0
    ? Math.round((stats.embedding_completed / total) * 100)
    : 100

  const hasFailures = stats.embedding_failed > 0
  const recentFailures = embeddingDetails?.recent_failures || []
  const isHealthy = progressPercent === 100 && !hasFailures

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/50 bg-card',
        'animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both'
      )}
      style={{ animationDelay: '200ms' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isHealthy ? 'bg-emerald-500/10' : hasFailures ? 'bg-rose-500/10' : 'bg-blue-500/10'
            )}
          >
            <Zap
              className={cn(
                'h-5 w-5',
                isHealthy ? 'text-emerald-500' : hasFailures ? 'text-rose-500' : 'text-blue-500'
              )}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Embedding Pipeline</h3>
            <p className="text-xs text-muted-foreground">
              {isHealthy ? 'All systems operational' : hasFailures ? 'Some issues detected' : 'Processing in progress'}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              isHealthy ? 'bg-emerald-500' : hasFailures ? 'bg-rose-500 animate-pulse' : 'bg-blue-500 animate-pulse'
            )}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {isHealthy ? 'Healthy' : hasFailures ? 'Attention needed' : 'Active'}
          </span>
        </div>
      </div>

      {/* Progress Section */}
      <div className="px-6 py-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold tabular-nums text-foreground">{progressPercent}%</span>
            <span className="ml-1 text-sm text-muted-foreground">indexed</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {stats.total_chunks.toLocaleString()} chunks
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              isHealthy ? 'bg-emerald-500' : hasFailures ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-blue-500'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Status Pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill
            label="Pending"
            count={stats.embedding_pending}
            icon={Clock}
            variant="default"
          />
          <StatusPill
            label="Processing"
            count={stats.embedding_processing}
            icon={Loader2}
            variant="processing"
          />
          <StatusPill
            label="Completed"
            count={stats.embedding_completed}
            icon={CheckCircle2}
            variant="success"
          />
          <StatusPill
            label="Failed"
            count={stats.embedding_failed}
            icon={XCircle}
            variant="error"
          />
        </div>
      </div>

      {/* Recent Failures */}
      {hasFailures && recentFailures.length > 0 && (
        <div className="border-t border-border/50 bg-rose-500/[0.02] px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            <span className="text-xs font-semibold text-rose-500">Recent Failures</span>
          </div>
          <div className="space-y-2">
            {recentFailures.slice(0, 3).map((failure) => (
              <div
                key={failure.id}
                className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {failure.title || 'Untitled'}
                  </p>
                  {failure.error && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      {failure.error}
                    </p>
                  )}
                </div>
                {failure.failed_at && (
                  <span className="ml-3 shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(failure.failed_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
