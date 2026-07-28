import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

type OnboardingStep = 'role' | 'profile' | 'social'

export function Onboarding() {
  const { user, token, setUser, loading } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState<OnboardingStep>('role')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || '')

  useEffect(() => {
    if (!token) return
    void api.oauthStatus().then(() => null).catch(() => null)
  }, [token])

  if (loading) return <div className="auth-shell"><p className="muted">Loading account…</p></div>
  if (!user || !token) return <Navigate to="/login" replace />

  async function onSelectRole(role: 'freelance' | 'sponsor') {
    setBusy(true)
    setError(null)
    try {
      const { user: u } = await api.patchMe(token!, { defaultRole: role })
      setUser(u)
      setStep('profile')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set role')
    } finally {
      setBusy(false)
    }
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { user: u } = await api.patchMe(token!, { displayName })
      setUser(u)
      setStep('social')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setBusy(false)
    }
  }

  async function startOAuth(provider: 'twitter' | 'github') {
    setBusy(true)
    try {
      const { url } = await api.oauthStart(token!, provider)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OAuth failed')
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell" style={{ maxWidth: '400px' }}>
      <div className="auth-brand">
        <img src="/ng-mark.svg" alt="NimGigs" className="auth-logo-only" />
        <h2>Setup your profile</h2>
      </div>

      {error && <div className="alert error">{error}</div>}

      {step === 'role' && (
        <div className="glass-card animate-in">
          <h3>I want to...</h3>
          <p className="muted">Choose your primary role. You can change this later.</p>
          <div className="column" style={{ gap: '12px', marginTop: '20px' }}>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={() => onSelectRole('freelance')}
              disabled={busy}
            >
              🚀 Earn Rewards (Creator)
            </button>
            <button
              className="btn btn-ghost btn-block btn-lg"
              onClick={() => onSelectRole('sponsor')}
              disabled={busy}
            >
              🤝 Post Tasks (Sponsor)
            </button>
          </div>
        </div>
      )}

      {step === 'profile' && (
        <form className="glass-card animate-in" onSubmit={onSaveProfile}>
          <h3>Your profile</h3>
          <p className="muted">How should we call you?</p>
          <div className="field">
            <label>Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Satoshi"
              required
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            Continue
          </button>
        </form>
      )}

      {step === 'social' && (
        <div className="glass-card animate-in">
          <h3>Connect Socials</h3>
          <p className="muted">Link your accounts to verify your identity.</p>
          
          <div className="social-row" style={{ marginTop: '16px' }}>
            <div className="social-card">
              <strong>X / Twitter</strong>
              <button
                className={`btn btn-sm ${user.twitter ? 'btn-ghost' : 'btn-primary'}`}
                onClick={() => startOAuth('twitter')}
                disabled={busy}
              >
                {user.twitter ? `@${user.twitter}` : 'Link X'}
              </button>
            </div>
            <div className="social-card">
              <strong>GitHub</strong>
              <button
                className={`btn btn-sm ${user.github ? 'btn-ghost' : 'btn-primary'}`}
                onClick={() => startOAuth('github')}
                disabled={busy}
              >
                {user.github ? `@${user.github}` : 'Link GitHub'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button className="btn btn-primary btn-block" onClick={() => nav('/board')}>
              Complete Onboarding
            </button>
          </div>
          {user.defaultRole === 'freelance' && (
            <p className="muted" style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '12px' }}>
              You have 4 credits to start earning!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
