export type MessageKind = 'system' | 'sponsor' | 'talent' | 'payout'

export interface ChatMessage {
  id: string
  from: 'me' | 'them' | 'system'
  kind: MessageKind
  text: string
  at: string
}

export interface Conversation {
  id: string
  title: string
  subtitle: string
  peer: string
  peerRole: 'Sponsor' | 'Talent' | 'NimGigs'
  unread: number
  pinned?: boolean
  listingId?: string
  updatedAt: string
  messages: ChatMessage[]
}

function ago(mins: number) {
  return new Date(Date.now() - mins * 60_000).toISOString()
}

export function seedConversations(displayName: string): Conversation[] {
  return [
    {
      id: 'c1',
      title: 'Logo redesign bounty',
      subtitle: 'SponsorDemo · shortlist update',
      peer: 'SponsorDemo',
      peerRole: 'Sponsor',
      unread: 2,
      pinned: true,
      listingId: undefined,
      updatedAt: ago(12),
      messages: [
        {
          id: 'm1',
          from: 'system',
          kind: 'system',
          text: 'Conversation opened for bounty submissions.',
          at: ago(180),
        },
        {
          id: 'm2',
          from: 'them',
          kind: 'sponsor',
          text: `Hey ${displayName} — your Figma link looks strong. Can you export a dark + yellow variant?`,
          at: ago(40),
        },
        {
          id: 'm3',
          from: 'me',
          kind: 'talent',
          text: 'Absolutely. Pushing a gold monochrome pack tonight.',
          at: ago(25),
        },
        {
          id: 'm4',
          from: 'them',
          kind: 'sponsor',
          text: 'Perfect. You are shortlisted for 1st place review.',
          at: ago(12),
        },
      ],
    },
    {
      id: 'c2',
      title: 'Nimiq Pay thread quest',
      subtitle: 'Payout ready · 50 NIM',
      peer: 'NimGigs',
      peerRole: 'NimGigs',
      unread: 1,
      updatedAt: ago(55),
      messages: [
        {
          id: 'm5',
          from: 'system',
          kind: 'payout',
          text: 'You placed 1st. 50 NIM is ready to release to your linked wallet.',
          at: ago(55),
        },
        {
          id: 'm6',
          from: 'them',
          kind: 'system',
          text: 'Open My Work → claim receipt after the sponsor signs release.',
          at: ago(54),
        },
      ],
    },
    {
      id: 'c3',
      title: 'Layout polish job',
      subtitle: 'TalentDemo · application',
      peer: 'hexforge',
      peerRole: 'Talent',
      unread: 0,
      updatedAt: ago(400),
      messages: [
        {
          id: 'm7',
          from: 'them',
          kind: 'talent',
          text: 'PR link is in my submission. Happy to iterate on mobile nav.',
          at: ago(400),
        },
        {
          id: 'm8',
          from: 'me',
          kind: 'sponsor',
          text: 'Got it — reviewing this afternoon.',
          at: ago(380),
        },
      ],
    },
    {
      id: 'c4',
      title: 'System · Credits',
      subtitle: 'Monthly grant applied',
      peer: 'NimGigs',
      peerRole: 'NimGigs',
      unread: 0,
      updatedAt: ago(1440),
      messages: [
        {
          id: 'm9',
          from: 'system',
          kind: 'system',
          text: 'Your monthly 4 credits have been refreshed. Leftover credits from last month did not stack.',
          at: ago(1440),
        },
      ],
    },
  ]
}

export function formatMsgTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
