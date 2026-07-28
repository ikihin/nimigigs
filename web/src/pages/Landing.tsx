import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Landing() {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted" style={{ padding: 40 }}>Loading…</p>
  if (user) return <Navigate to="/board" replace />

  return (
    <div className="landing-hero">
      <section className="hero-panel">
        <div>
          <div className="hero-kicker">Complete tasks. Earn rewards.</div>
          <h1 className="hero-title">
            Complete Tasks.
            <br />
            Earn Rewards.
            <br />
            <em>On Nimiq.</em>
          </h1>
          <p className="hero-desc">
            A bounty, quest, and freelance marketplace built on Nimiq Pay. Lock rewards in USDT
            &amp; NIM. Verified submits. Fair multi-winner payouts.
          </p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-primary">
              Explore Tasks
            </Link>
            <Link to="/signup" className="btn btn-ghost">
              Create Bounty
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden>
          <span className="particle" />
          <span className="particle" />
          <span className="particle" />
          <span className="particle" />
          <span className="particle" />
          <div className="hero-orb">
            <img src="/ng-mark.svg" alt="NimGigs" />
          </div>
        </div>
      </section>

      <div className="dash-layout" style={{ marginTop: 8 }}>
        <div className="dash-main">
          <div className="section-label">How it works</div>
          <div className="task-list">
            {[
              {
                t: 'Connect wallet',
                d: 'Link Nimiq Pay, Twitter, and GitHub for verified work and instant payouts.',
              },
              {
                t: 'Submit with credits',
                d: 'Creators get 4 credits each month. Quality over spam. Win tasks to earn back more.',
              },
              {
                t: 'Get paid on-chain',
                d: 'Sponsors lock USDT or NIM. Pick winners. Rewards release automatically to your address.',
              },
            ].map((x) => (
              <div key={x.t} className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 6px' }}>{x.t}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {x.d}
                </p>
              </div>
            ))}
          </div>
        </div>
        <aside className="dash-side">
          <div className="glass-card credit-card">
            <div className="credit-card__head">
              <span>Monthly Grant</span>
              <span style={{ color: 'var(--primary)' }}>⚡</span>
            </div>
            <div className="credit-card__num">4</div>
            <p className="credit-card__sub">credits · creators · monthly reset</p>
            <Link to="/login" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 8 }}>
              Get Started
            </Link>
          </div>
          <div className="glass-card">
            <div className="side-title">Demo accounts</div>
            <p className="side-text" style={{ marginBottom: 0 }}>
              talent@nimigigs.demo
              <br />
              sponsor@nimigigs.demo
              <br />
              <code className="ref-code" style={{ marginTop: 10 }}>
                demo1234
              </code>
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
