import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import type { PublicUser, RolePref } from '../lib/types'

const TOKEN_KEY = 'nimigigs_token'
const ROLE_KEY = 'nimigigs_role'

interface AuthContextValue {
  token: string | null
  user: PublicUser | null
  role: RolePref
  loading: boolean
  setRole: (role: RolePref) => void
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, referralCode?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setUser: (user: PublicUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<PublicUser | null>(null)
  const [role, setRoleState] = useState<RolePref>(
    () => (localStorage.getItem(ROLE_KEY) as RolePref) || 'freelance',
  )
  const [loading, setLoading] = useState(true)

  const setRole = useCallback((r: RolePref) => {
    setRoleState(r)
    localStorage.setItem(ROLE_KEY, r)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { user: u } = await api.me(token)
      setUser(u)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password })
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
    setRole(res.user.defaultRole)
  }, [setRole])

  const signup = useCallback(
    async (email: string, password: string, referralCode?: string) => {
      const res = await api.signup({ email, password, referralCode })
      localStorage.setItem(TOKEN_KEY, res.token)
      setToken(res.token)
      setUser(res.user)
      setRole('freelance')
    },
    [setRole],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      role,
      loading,
      setRole,
      login,
      signup,
      logout,
      refreshUser,
      setUser,
    }),
    [token, user, role, loading, setRole, login, signup, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
