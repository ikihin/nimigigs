import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  formatMsgTime,
  seedConversations,
  type Conversation,
} from '../lib/messages'
import { IconMessage, IconSearch } from '../components/Icons'

export function Messages() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const key = `nimigigs_msgs_${user.id}`
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Conversation[]
        setThreads(parsed)
        setActiveId(parsed[0]?.id ?? null)
        return
      } catch {
        /* seed */
      }
    }
    const seeded = seedConversations(user.displayName)
    setThreads(seeded)
    setActiveId(seeded[0]?.id ?? null)
    localStorage.setItem(key, JSON.stringify(seeded))
  }, [user])

  useEffect(() => {
    if (!user || threads.length === 0) return
    localStorage.setItem(`nimigigs_msgs_${user.id}`, JSON.stringify(threads))
  }, [threads, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, threads])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return threads
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.peer.toLowerCase().includes(term) ||
        t.subtitle.toLowerCase().includes(term),
    )
  }, [threads, q])

  const active = threads.find((t) => t.id === activeId) ?? null
  const unreadTotal = threads.reduce((n, t) => n + t.unread, 0)

  if (!user) return <Navigate to="/login" replace />

  function openThread(id: string) {
    setActiveId(id)
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
  }

  function send(e: FormEvent) {
    e.preventDefault()
    if (!active || !draft.trim()) return
    const msg = {
      id: `local_${Date.now()}`,
      from: 'me' as const,
      kind: 'talent' as const,
      text: draft.trim(),
      at: new Date().toISOString(),
    }
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              messages: [...t.messages, msg],
              subtitle: draft.trim().slice(0, 48),
              updatedAt: msg.at,
            }
          : t,
      ),
    )
    setDraft('')
  }

  return (
    <div className="msg-page">
      <div className="msg-head">
        <div>
          <p className="section-label">Inbox</p>
          <h1 className="page-title" style={{ margin: 0 }}>
            Messages
          </h1>
        </div>
        <div className="msg-head__meta">
          <span className="float-chip float-chip--sm active-soft">
            <IconMessage size={14} /> {unreadTotal} unread
          </span>
        </div>
      </div>

      <div className="msg-shell">
        <aside className="msg-list glass-card">
          <div className="search-field msg-search">
            <IconSearch size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search threads…"
              aria-label="Search messages"
            />
          </div>
          <div className="msg-thread-scroll">
            {filtered.length === 0 && <p className="muted empty-pad">No conversations</p>}
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`msg-thread ${t.id === activeId ? 'active' : ''}`}
                onClick={() => openThread(t.id)}
              >
                <div className="msg-thread__avatar">{t.peer.slice(0, 1)}</div>
                <div className="msg-thread__body">
                  <div className="msg-thread__row">
                    <strong>{t.title}</strong>
                    <time>{formatMsgTime(t.updatedAt)}</time>
                  </div>
                  <div className="msg-thread__row">
                    <span className="muted truncate">{t.subtitle}</span>
                    {t.unread > 0 && <span className="msg-badge">{t.unread}</span>}
                  </div>
                  <span className="msg-role">{t.peerRole}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="msg-panel glass-card">
          {!active ? (
            <div className="msg-empty">
              <div className="hero-orb msg-empty__orb">
                <img src="/ng-mark.svg" alt="" />
              </div>
              <h3>Select a conversation</h3>
              <p className="muted">Sponsors, talent, and system alerts land here.</p>
            </div>
          ) : (
            <>
              <header className="msg-panel__head">
                <div>
                  <h2>{active.title}</h2>
                  <p className="muted">
                    {active.peer} · {active.peerRole}
                    {active.listingId && (
                      <>
                        {' · '}
                        <Link to={`/listings/${active.listingId}`}>View listing</Link>
                      </>
                    )}
                  </p>
                </div>
                {active.pinned && <span className="type-pill">Pinned</span>}
              </header>

              <div className="msg-chat">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`msg-bubble msg-bubble--${m.from} ${m.kind === 'system' || m.kind === 'payout' ? 'msg-bubble--system' : ''}`}
                  >
                    <p>{m.text}</p>
                    <time>{formatMsgTime(m.at)}</time>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form className="msg-compose" onSubmit={send}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  aria-label="Message"
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={!draft.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
