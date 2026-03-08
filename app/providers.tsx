'use client'

import {
  QueryClientProvider,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { getQueryClient } from '@/lib/query-client'
import { resumeSyncQueueOnStartup } from '@/lib/local-db/sync-queue'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  useEffect(() => {
    void resumeSyncQueueOnStartup().catch(() => {
      // Queue resume is best-effort on startup.
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
