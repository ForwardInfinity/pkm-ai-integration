import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const RETENTION_DAYS = 30

export const purgeOldTrash = inngest.createFunction(
  {
    id: 'purge-old-trash',
    name: 'Purge Old Trash Notes',
  },
  { cron: '0 2 * * *' }, // Daily at 2 AM UTC
  async ({ step }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)

    const result = await step.run('delete-expired-notes', async () => {
      const { data: expiredNotes, error: fetchError } = await supabase
        .from('notes')
        .select('id')
        .not('deleted_at', 'is', null)
        .lt('deleted_at', cutoffDate.toISOString())

      if (fetchError) {
        throw new Error(`Failed to fetch expired notes: ${fetchError.message}`)
      }

      if (!expiredNotes || expiredNotes.length === 0) {
        return { deleted: 0 }
      }

      const noteIds = expiredNotes.map((n) => n.id)

      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .in('id', noteIds)

      if (deleteError) {
        throw new Error(`Failed to delete notes: ${deleteError.message}`)
      }

      return { deleted: noteIds.length }
    })

    return {
      message: `Purged ${result.deleted} expired notes from trash`,
      deletedCount: result.deleted,
    }
  }
)
