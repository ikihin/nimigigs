import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { NimiqProvider } from '@nimiq/mini-app-sdk'
import {
  formatAddress,
  initNimiq,
  isInsideNimiqPay,
  listAccountsSafe,
  sendNim,
} from '../lib/nimiq'
import { useAuth } from './AuthContext'
import { api } from '../lib/api'

export type WalletStatus = 'loading' | 'ready' | 'demo' | 'error'

interface WalletContextValue {
  status: WalletStatus
  provider: NimiqProvider | null
  address: string | null
  displayAddress: string
  isDemo: boolean
  error: string | null
  refresh: () => Promise<void>
  bindWalletToAccount: () => Promise<void>
  payNim: (amountNim: number, recipient: string) => Promise<string>
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { token, user, setUser } = useAuth()
  const [status, setStatus] = useState<WalletStatus>('loading')
  const [provider, setProvider] = useState<NimiqProvider | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    const p = await initNimiq()
    if (!p) {
      setProvider(null)
      // Demo fallback address from linked account or generated
      setAddress(user?.nimiqAddress ?? null)
      setStatus('demo')
      return
    }
    try {
      const accounts = await listAccountsSafe(p)
      setProvider(p)
      setAddress(accounts[0] ?? null)
      setStatus('ready')
    } catch (e) {
      setProvider(p)
      setAddress(user?.nimiqAddress ?? null)
      setStatus(isInsideNimiqPay() ? 'error' : 'demo')
      setError(e instanceof Error ? e.message : 'Failed to list accounts')
    }
  }, [user?.nimiqAddress])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const bindWalletToAccount = useCallback(async () => {
    if (!token) throw new Error('Login required')
    let addr = address
    if (!addr && status === 'demo') {
      addr = `NQ07 DEMO ${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`
      setAddress(addr)
    }
    if (!addr) throw new Error('No wallet address')
    const { user: u } = await api.setWallet(token, addr)
    setUser(u)
  }, [token, address, status, setUser])

  const payNim = useCallback(
    async (amountNim: number, recipient: string) => {
      if (!provider || status === 'demo') {
        return `demo_tx_${Date.now()}`
      }
      return sendNim({ provider, recipient, amountNim })
    },
    [provider, status],
  )

  const value = useMemo(
    () => ({
      status,
      provider,
      address: address || user?.nimiqAddress || null,
      displayAddress: address
        ? formatAddress(address)
        : user?.nimiqAddress
          ? formatAddress(user.nimiqAddress)
          : status === 'demo'
            ? 'Demo mode'
            : '—',
      isDemo: status === 'demo',
      error,
      refresh,
      bindWalletToAccount,
      payNim,
    }),
    [status, provider, address, user?.nimiqAddress, error, refresh, bindWalletToAccount, payNim],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
