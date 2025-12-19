'use client'

import { Users, FileText, AlertTriangle, Cog } from 'lucide-react'
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
    : 0

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <StatCard
        title="Users"
        value={stats.total_users}
        subtitle={`${stats.admin_count} admin${stats.admin_count !== 1 ? 's' : ''}`}
        icon={Users}
        iconColor="primary"
        animationDelay={0}
      />
      <StatCard
        title="Notes"
        value={stats.active_notes}
        subtitle={`${formatWordCount(stats.total_word_count)} words`}
        icon={FileText}
        iconColor="amber"
        animationDelay={30}
      />
      <StatCard
        title="Conflicts"
        value={`${stats.active_conflicts} active`}
        subtitle={`${stats.total_conflicts} total`}
        icon={AlertTriangle}
        iconColor="destructive"
        animationDelay={60}
      />
      <StatCard
        title="Embeddings"
        value={`${embeddingProgress}%`}
        subtitle={`${stats.embedding_completed}/${embeddingTotal} completed`}
        icon={Cog}
        iconColor="emerald"
        animationDelay={90}
      />
    </div>
  )
}
