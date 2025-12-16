'use server';

import { createClient } from '@/lib/supabase/server';

export interface DismissConflictResult {
  success: boolean;
  error?: string;
}

/**
 * Dismiss a conflict by setting its status to 'dismissed'
 * RLS ensures the user can only dismiss their own conflicts
 * @param conflictId - The ID of the conflict to dismiss
 */
export async function dismissConflict(
  conflictId: string
): Promise<DismissConflictResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('conflicts')
      .update({ status: 'dismissed' })
      .eq('id', conflictId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error dismissing conflict:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
