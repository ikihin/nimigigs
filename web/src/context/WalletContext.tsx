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
  connectAndSign,
  formatAddress,
  initNimiq,
  isInsideNimiqPay,
  listAccountsSafe,
  sendNim,
  type WalletProof,
} from '../lib/nimiq'
import { useAuth } from './AuthContext'
import { api } from '../lib/api'

export type WalletStatus = 'loading' | 'ready' | 'demo' | 'error' | 'connecting'

interface WalletContextValue {
  status: WalletStatus
  provider: NimiqProvider | null
  address: string | null
  displayAddress: string
  isDemo: boolean
  isConnected: boolean
  error: string | null
  lastProof: WalletProof | null
  refresh: () => Promise<void>
  /** Opens Nimiq Pay or Hub (hub.nimiq.com) sign-message, then binds address to account */
  connectWallet: () => Promise<void>
  /** @deprecated use connectWallet */
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
  const [lastProof, setLastProof] = useState<WalletProof | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    const p = await initNimiq()
    if (!p) {
      setProvider(null)
      setAddress(user?.nimiqAddress ?? null)
      setStatus('demo')
      return
    }
    try {
      const accounts = await listAccountsSafe(p)
      setProvider(p)
      setAddress(accounts[0] ?? user?.nimiqAddress ?? null)
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

  const connectWallet = useCallback(async () => {
    if (!token || !user) throw new Error('Login required')
    setStatus('connecting')
    setError(null)
    try {
      const proof = await connectAndSign(user.id)
      setLastProof(proof)
      setAddress(proof.address)
      const { user: u } = await api.setWallet(token, {
        address: proof.address,
        message: proof.message,
        signature: proof.signature,
        publicKey: proof.publicKey,
        method: proof.method,
      })
      setUser(u)
      setStatus(proof.method === 'demo' ? 'demo' : isInsideNimiqPay() ? 'ready' : 'demo')
      // re-probe provider after hub connect
      void refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect failed')
      setStatus(isInsideNimiqPay() ? 'error' : 'demo')
      throw e
    }
  }, [token, user, setUser, refresh])

  const bindWalletToAccount = connectWallet

  const payNim = useCallback(
    async (amountNim: number, recipient: string) => {
      if (!provider || status === 'demo' || status === 'connecting') {
        return `demo_tx_${Date.now()}`
      }
      return sendNim({ provider, recipient, amountNim })
    },
    [provider, status],
  )

  const linked = Boolean(user?.nimiqAddress || address)

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
            ? 'Not connected'
            : '—',
      isDemo: status === 'demo',
      isConnected: linked,
      error,
      lastProof,
      refresh,
      connectWallet,
      bindWalletToAccount,
      payNim,
    }),
    [
      status,
      provider,
      address,
      user?.nimiqAddress,
      linked,
      error,
      lastProof,
      refresh,
      connectWallet,
      bindWalletToAccount,
      payNim,
    ],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
