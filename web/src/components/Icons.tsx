import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
}

export function IconSearch(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconBell(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 9a6 6 0 1 1 12 0c0 3.5 1.5 5 2 6H4c.5-1 2-2.5 2-6" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function IconMessage(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-5 3v-3.5A2.5 2.5 0 0 1 4 14.5v-8Z" />
    </svg>
  )
}

export function IconBolt(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  )
}

export function IconArrow(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

export function IconHex(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z" />
    </svg>
  )
}

export function IconUser(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  )
}

export function IconBriefcase(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
    </svg>
  )
}

export function IconTrophy(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5.5A2.5 2.5 0 0 0 8 10.5" />
      <path d="M16 6h2.5A2.5 2.5 0 0 1 16 10.5" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 16h4v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2Z" />
    </svg>
  )
}

export function IconUsers(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c.8-3 2.5-4.5 6-4.5" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M14 19c.5-2.2 1.8-3.5 4.5-3.5 1 0 1.8.2 2.5.5" />
    </svg>
  )
}

export function IconClock(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" />
    </svg>
  )
}

export function IconTag(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 12V5.5A2.5 2.5 0 0 1 5.5 3H12l9 9-6.5 6.5L3 12Z" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
