import { createClient } from '@/lib/supabase/client'
import { clearDatabase, setActiveLocalDbUser } from './index'
import { clearCurrentSessionTempDraftId } from './note-cache'
import { resetSyncQueue } from './sync-queue'

export async function clearClientLocalPersistence(
  userId: string | null
): Promise<void> {
  resetSyncQueue()
  clearCurrentSessionTempDraftId()

  if (userId) {
    await clearDatabase(userId)
  }

  await setActiveLocalDbUser(null)
}

export async function signOutClient(): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.auth.signOut()
  await clearClientLocalPersistence(user?.id ?? null)
}
