import type { ListingType } from './types'

/** Custom brand icons per listing type (public assets). */
export const TYPE_ICONS: Partial<Record<ListingType, string>> = {
  bounty: '/icon-bounty.svg',
  quest: '/icon-quest.svg',
  // job: add when asset is ready
}

export function typeIconSrc(type: string): string | null {
  return TYPE_ICONS[type as ListingType] ?? null
}
