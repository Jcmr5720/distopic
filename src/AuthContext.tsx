import { createContext, useContext, useEffect, useState } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

interface AuthContextProps {
  user: User | null
  session: Session | null
}

const AuthContext = createContext<AuthContextProps>({ user: null, session: null })

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ user, session }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
