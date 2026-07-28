import { Link } from 'react-router-dom'
import type { Listing } from '../lib/types'
import { typeIconSrc } from '../lib/typeIcons'
import { IconArrow, IconClock, IconUsers } from './Icons'

function daysLeft(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return 'Ended'
  const d = Math.ceil(ms / (1000 * 60 * 60 * 24))
  return d === 1 ? '1 day left' : `${d} days left`
}

function difficultyFrom(listing: Listing) {
  const n = listing.escrowAmount
  if (n >= 100) return 'Hard'
  if (n >= 50) return 'Medium'
  return 'Easy'
}

export function TaskCard({ listing }: { listing: Listing }) {
  const icon = typeIconSrc(listing.type)
  const winners = listing.winnerMode === 'top3' ? 3 : 1
  const currency = listing.currency === 'BOTH' ? 'MIX' : listing.currency
  const label = listing.type.charAt(0).toUpperCase() + listing.type.slice(1)

  return (
    <Link to={`/listings/${listing.id}`} className="task-card">
      <div className={`task-art task-art--${listing.type}${icon ? ' task-art--icon' : ''}`} aria-hidden>
        {icon ? (
          <img src={icon} alt="" className="task-art__icon" />
        ) : (
          <span className="task-art__glyph">{label[0]}</span>
        )}
      </div>

      <div className="task-body">
        <div className="task-top">
          <span className={`type-pill type-pill--${listing.type}`}>
            {icon && <img src={icon} alt="" className="type-icon-inline" />}
            {label}
          </span>
          {listing.hasSubmitted && <span className="type-pill type-pill--ok">submitted</span>}
        </div>
        <h3 className="task-title">{listing.title}</h3>
        <p className="task-desc">
          {listing.description.slice(0, 120)}
          {listing.description.length > 120 ? '…' : ''}
        </p>
        <div className="task-meta">
          <span>
            <IconClock size={14} /> {daysLeft(listing.deadlineAt)}
          </span>
          <span>
            <IconUsers size={14} /> {listing.submitCount ?? 0} submits
          </span>
          <span>
            🏆 {winners} winner{winners > 1 ? 's' : ''}
          </span>
          <span className={`diff diff--${difficultyFrom(listing).toLowerCase()}`}>
            {difficultyFrom(listing)}
          </span>
        </div>
        <div className="task-reward">
          <span className="task-reward__label">Reward</span>
          <span className="task-reward__value">
            {listing.escrowAmount} <em>{currency}</em>
          </span>
        </div>
      </div>

      <div className="task-cta" aria-hidden>
        <span className="task-cta__btn">
          <IconArrow size={22} />
        </span>
      </div>
    </Link>
  )
}
