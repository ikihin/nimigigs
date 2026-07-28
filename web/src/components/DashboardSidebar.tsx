import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconBolt, IconTrophy, IconUsers } from './Icons'

const TRENDING = ['bounty', 'quest', 'job']
const LEADERS = [
  { name: 'Aya.nim', earn: '420 USDT' },
  { name: 'hexforge', earn: '310 USDT' },
  { name: 'TalentDemo', earn: '150 NIM' },
]
const WINNERS = [
  { title: 'Logo pack', who: 'Aya.nim' },
  { title: 'Pay thread', who: 'hexforge' },
]
const SPONSORS = ['Nimiq Labs', 'Pay Labs', 'Open Quest']

export function DashboardSidebar() {
  const { user } = useAuth()
  const credits = user?.creditsBalance ?? 0
  const invites = user?.referralInvitesMonth ?? 0
  const refProgress = Math.min(100, ((invites % 2) / 2) * 100)
  const monthProgress = Math.min(100, (credits / 4) * 100)

  return (
    <aside className="dash-side">
      <div className="glass-card credit-card">
        <div className="credit-card__head">
          <span>Credits</span>
          <IconBolt className="bolt-glow" size={22} />
        </div>
        <div className="credit-card__num">{credits}</div>
        <p className="credit-card__sub">of 4 monthly · resets 1st UTC</p>
        <div className="progress">
          <div className="progress__bar" style={{ width: `${monthProgress}%` }} />
        </div>
        <Link to="/credits" className="btn btn-primary btn-sm" style={{ marginTop: 14, width: '100%' }}>
          Earn more credits
        </Link>
      </div>

      <div className="glass-card">
        <div className="side-title">
          <IconUsers size={16} /> Referral
        </div>
        <p className="side-text">Invite 2 friends → +1 credit</p>
        <code className="ref-code">{user?.referralCode || '—'}</code>
        <div className="progress" style={{ marginTop: 12 }}>
          <div className="progress__bar" style={{ width: `${refProgress || 5}%` }} />
        </div>
        <p className="side-meta">{invites % 2}/2 to next credit · cap +5/mo</p>
      </div>

      <div className="glass-card">
        <div className="side-title">Trending tags</div>
        <div className="tag-cloud">
          {TRENDING.map((t) => (
            <span key={t} className="float-chip float-chip--sm">
              #{t}
            </span>
          ))}
        </div>
      </div>

      <div className="glass-card">
        <div className="side-title">
          <IconTrophy size={16} /> Top earners
        </div>
        <ul className="leader-list">
          {LEADERS.map((l, i) => (
            <li key={l.name}>
              <span className="leader-rank">{i + 1}</span>
              <span>{l.name}</span>
              <strong>{l.earn}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-card">
        <div className="side-title">Recent winners</div>
        <ul className="mini-list">
          {WINNERS.map((w) => (
            <li key={w.title}>
              <span>{w.title}</span>
              <em>{w.who}</em>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-card">
        <div className="side-title">Featured sponsors</div>
        <div className="sponsor-row">
          {SPONSORS.map((s) => (
            <span key={s} className="sponsor-pill">
              {s}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}
