// src/App.jsx
// Root component — renders router and global UI (toasts)
import { useEffect } from 'react'
import AppRouter from './router/AppRouter'
import Toast from './components/ui/Toast'
import { supabase } from './api/supabaseClient'
import { useAuthStore } from './store/useAuthStore'

function App() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    // Listen for auth state changes to synchronize Zustand store
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single()
            
          const userData = {
            id: dbUser?.id || session.user.id,
            email: session.user.email,
            first_name: dbUser?.first_name || session.user.user_metadata?.first_name || 'Resident',
            last_name: dbUser?.last_name || session.user.user_metadata?.last_name || 'User',
            role: dbUser?.role || 'resident',
            status: dbUser?.status || 'active',
          }
          setAuth(userData, session.access_token)
        } catch (err) {
          console.error('Error synchronizing auth state:', err)
        }
      } else {
        logout()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setAuth, logout])

  return (
    <>
      <AppRouter />
      <Toast />
    </>
  )
}

export default App

