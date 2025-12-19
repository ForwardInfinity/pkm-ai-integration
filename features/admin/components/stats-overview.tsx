'use client'

import { Users, FileText, AlertTriangle, Database } from 'lucide-react'
import { StatCard } from './stat-card'
import type { AdminStats } from '../types'

interface StatsOverviewProps {
  stats: AdminStats
}

function formatWordCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const embeddingTotal = stats.embedding_pending + stats.embedding_processing +
    stats.embedding_completed + stats.embedding_failed
  const embeddingProgress = embeddingTotal > 0
    ? Math.round((stats.embedding_completed / embeddingTotal) * 100)
    : 100

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Primary stat - Users */}
      <StatCard
        title="Total Users"
        value={stats.total_users}
        subtitle={`${stats.admin_count} admin${stats.admin_count !== 1 ? 's' : ''}`}
        icon={Users}
        variant="highlight"
        animationDelay={0}
      />

      {/* Notes stat */}
      <StatCard
        title="Active Notes"
        value={stats.active_notes}
        subtitle={`${formatWordCount(stats.total_word_count)} words total`}
        icon={FileText}
        animationDelay={50}
      />

      {/* Conflicts stat */}
      <StatCard
        title="Conflicts"
        value={stats.active_conflicts}
        subtitle={stats.total_conflicts > 0 ? `${stats.total_conflicts} total detected` : 'None detected'}
        icon={AlertTriangle}
        animationDelay={100}
      />

      {/* Embeddings stat */}
      <StatCard
        title="Embeddings"
        value={`${embeddingProgress}%`}
        subtitle={`${stats.embedding_completed} of ${embeddingTotal} indexed`}
        icon={Database}
        animationDelay={150}
      />
    </div>
  )
}
