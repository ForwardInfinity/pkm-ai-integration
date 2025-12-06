'use client'

import { useEffect } from 'react'
import { getSyncQueue } from '@/lib/local-db/sync-queue'

export function useBeforeunloadSave() {
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Attempt to flush sync queue
      // Note: This is best-effort since beforeunload handlers
      // have limited time. Data is already in IndexedDB,
      // so even if sync fails, it will resume on next page load.
      try {
        const syncQueue = getSyncQueue()
        // We can't truly await here since beforeunload doesn't wait
        // for promises, but we trigger the sync anyway
        syncQueue.flushSync()
      } catch {
        // Ignore errors - data is safe in IndexedDB
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // When tab becomes hidden, try to sync
        try {
          const syncQueue = getSyncQueue()
          syncQueue.flushSync()
        } catch {
          // Ignore errors
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
