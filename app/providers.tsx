'use client'

import {
  QueryClientProvider,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { getQueryClient } from '@/lib/query-client'
import { resumeSyncQueueOnStartup } from '@/lib/local-db/sync-queue'
import { createClient } from '@/lib/supabase/client'
import { clearClientLocalPersistence } from '@/lib/local-db/auth'
import { setActiveLocalDbUser } from '@/lib/local-db'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let previousUserId: string | null = null

    const applyUserScope = async (userId: string | null) => {
      if (cancelled) return

      if (!userId) {
        await clearClientLocalPersistence(previousUserId)
        return
      }

      previousUserId = userId
      await setActiveLocalDbUser(userId)
      await resumeSyncQueueOnStartup().catch(() => {
        // Queue resume is best-effort on startup.
      })
    }

    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      previousUserId = user?.id ?? null
      await applyUserScope(user?.id ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null
      if (nextUserId === previousUserId) {
        return
      }

      const lastUserId = previousUserId
      previousUserId = nextUserId

      if (!nextUserId) {
        void clearClientLocalPersistence(lastUserId)
        return
      }

      void applyUserScope(nextUserId)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
