import { supabase } from '../api/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'

export async function logActivity(action, details = '', userId = null) {
  try {
    const user = useAuthStore.getState().user
    const resolvedUserId = userId || user?.id
    if (!resolvedUserId) return

    await supabase.from('activity_logs').insert({
      user_id: resolvedUserId,
      action,
      details: typeof details === 'string' ? details : JSON.stringify(details),
    })
  } catch (error) {
    console.error('Failed to log activity', error)
  }
}
