import {
  init,
  type ErrorResponse,
  type NimiqProvider,
} from '@nimiq/mini-app-sdk'

export function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ErrorResponse).error?.message === 'string'
  )
}

export function formatAddress(address: string): string {
  const clean = address.replace(/\s+/g, '')
  if (clean.length < 12) return address
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`
}

export function isInsideNimiqPay(): boolean {
  return typeof window !== 'undefined' && Boolean(window.nimiq || window.nimiqPay)
}

export async function initNimiq(timeout = 4000): Promise<NimiqProvider | null> {
  try {
    return await init({ timeout })
  } catch {
    return null
  }
}

export async function listAccountsSafe(provider: NimiqProvider): Promise<string[]> {
  const result = await provider.listAccounts()
  if (isErrorResponse(result)) throw new Error(result.error.message)
  return result
}

/** Amount in NIM (not lunas). */
export async function sendNim(params: {
  provider: NimiqProvider
  recipient: string
  amountNim: number
}): Promise<string> {
  const value = Math.round(params.amountNim * 1e5)
  if (value <= 0) throw new Error('Amount must be positive')
  const result = await params.provider.sendBasicTransaction({
    recipient: params.recipient.replace(/\s+/g, ' ').trim(),
    value,
  })
  if (isErrorResponse(result)) {
    throw new Error(result.error.message || 'Transaction failed')
  }
  return result
}
