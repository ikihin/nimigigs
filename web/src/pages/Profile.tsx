import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { api } from '../lib/api'
import { HUB_ENDPOINT } from '../lib/hub'
import { isInsideNimiqPay } from '../lib/nimiq'

export function Profile() {
  const { user, token, setUser, refreshUser } = useAuth()
  const { connectWallet, displayAddress, isDemo, status, lastProof } = useWallet()
  const [params, setParams] = useSearchParams()
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [oauth, setOauth] = useState<{ github: boolean; twitter: boolean; allowStub: boolean } | null>(
    null,
  )
  const [stubUser, setStubUser] = useState('')

  useEffect(() => {
    void api.oauthStatus().then(setOauth).catch(() => setOauth(null))
  }, [])

  useEffect(() => {
    const provider = params.get('oauth')
    const ok = params.get('ok')
    if (!provider) return
    if (ok === '1') {
      const username = params.get('username')
      setMsg(
        `${provider === 'twitter' ? 'X/Twitter' : 'GitHub'} connected${username ? `: @${username}` : ''}`,
      )
      void refreshUser()
    } else {
      setError(params.get('error') || `${provider} connection failed`)
    }
    params.delete('oauth')
    params.delete('ok')
    params.delete('username')
    params.delete('error')
    setParams(params, { replace: true })
  }, [params, setParams, refreshUser])

  if (!user || !token) return <Navigate to="/login" replace />

  async function onConnectWallet() {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await connectWallet()
      setMsg('Wallet connected with signed message ✓')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet error')
    } finally {
      setBusy(false)
    }
  }

  async function startOAuth(provider: 'twitter' | 'github') {
    if (!token) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      // Prefer JSON start then navigate (keeps Authorization clean)
      const { url } = await api.oauthStart(token, provider)
      window.location.href = url
    } catch (e) {
      // Fallback: full redirect with token in query
      try {
        window.location.href = api.oauthStartRedirectUrl(token, provider)
      } catch {
        setError(e instanceof Error ? e.message : 'OAuth start failed')
        setBusy(false)
      }
    }
  }

  async function disconnect(provider: 'twitter' | 'github') {
    if (!token) return
    setBusy(true)
    try {
      const { user: u } = await api.disconnectOAuth(token, provider)
      setUser(u)
      setMsg(`${provider} disconnected`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  async function stubConnect(provider: 'twitter' | 'github') {
    if (!token || !stubUser.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { user: u } = await api.connectOAuth(token, provider, stubUser)
      setUser(u)
      setMsg(`${provider} linked (stub): ${stubUser}`)
      setStubUser('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stub connect failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      {msg && <div className="alert ok">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="glass-card" style={{ marginBottom: 14 }}>
        <p>
          <strong>{user.displayName}</strong>
        </p>
        <p className="muted">{user.email}</p>
        <p className="muted">Referral: {user.referralCode}</p>
      </div>

      <div className="glass-card" style={{ marginBottom: 14 }}>
        <h3>Nimiq wallet</h3>
        <p className="muted">
          Connect via Nimiq Pay or{' '}
          <a href={HUB_ENDPOINT} target="_blank" rel="noreferrer">
            hub.nimiq.com
          </a>{' '}
          sign-message.
        </p>
        {!isInsideNimiqPay() && isDemo && (
          <div className="alert info">Browser mode — allow popups for Hub sign-message.</div>
        )}
        <p className="locked">Address: {user.nimiqAddress || displayAddress || '—'}</p>
        {lastProof && (
          <p className="muted" style={{ wordBreak: 'break-all', fontSize: '0.78rem' }}>
            Last sig: {lastProof.signature.slice(0, 24)}…
          </p>
        )}
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy || status === 'connecting'}
          onClick={onConnectWallet}
        >
          {status === 'connecting'
            ? 'Sign in wallet…'
            : user.nimiqAddress
              ? 'Reconnect with sign-message'
              : 'Connect Nimiq wallet'}
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: 14 }}>
        <h3>Social accounts</h3>
        <p className="muted">
          Real OAuth via GitHub / X. Used to verify submissions when a listing requires Twitter or
          GitHub.
        </p>

        <div className="social-row">
          <div className="social-card">
            <div>
              <strong>X / Twitter</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {user.twitter ? `@${user.twitter}` : 'Not connected'}
              </p>
            </div>
            <div className="row">
              {user.twitter ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => disconnect('twitter')}
                >
                  Disconnect
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy || (oauth !== null && !oauth.twitter && !oauth.allowStub)}
                onClick={() => startOAuth('twitter')}
              >
                {user.twitter ? 'Reconnect X' : 'Connect X'}
              </button>
            </div>
            {oauth && !oauth.twitter && (
              <p className="muted" style={{ fontSize: '0.78rem', margin: '8px 0 0' }}>
                Server needs TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET
              </p>
            )}
          </div>

          <div className="social-card">
            <div>
              <strong>GitHub</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {user.github ? `@${user.github}` : 'Not connected'}
              </p>
            </div>
            <div className="row">
              {user.github ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => disconnect('github')}
                >
                  Disconnect
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy || (oauth !== null && !oauth.github && !oauth.allowStub)}
                onClick={() => startOAuth('github')}
              >
                {user.github ? 'Reconnect GitHub' : 'Connect GitHub'}
              </button>
            </div>
            {oauth && !oauth.github && (
              <p className="muted" style={{ fontSize: '0.78rem', margin: '8px 0 0' }}>
                Server needs GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
              </p>
            )}
          </div>
        </div>

        {oauth?.allowStub && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <p className="muted" style={{ marginTop: 0 }}>
              Dev stub (no OAuth app): paste a handle
            </p>
            <div className="field">
              <label>Username</label>
              <input
                value={stubUser}
                onChange={(e) => setStubUser(e.target.value)}
                placeholder="handle"
              />
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy || !stubUser.trim()}
                onClick={() => stubConnect('twitter')}
              >
                Stub link X
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy || !stubUser.trim()}
                onClick={() => stubConnect('github')}
              >
                Stub link GitHub
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
