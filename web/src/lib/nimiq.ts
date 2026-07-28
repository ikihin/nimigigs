import {
  init,
  type ErrorResponse,
  type NimiqProvider,
} from '@nimiq/mini-app-sdk'
import { hubSignConnectMessage } from './hub'

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

export function buildConnectChallenge(userId: string): string {
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const ts = new Date().toISOString()
  return [
    'NimGigs wallet connect',
    `User: ${userId}`,
    `Nonce: ${nonce}`,
    `At: ${ts}`,
    'I prove ownership of this Nimiq address for NimGigs.',
  ].join('\n')
}

export type WalletProof = {
  address: string
  message: string
  signature: string
  publicKey?: string
  method: 'mini-app' | 'hub' | 'demo'
}

/**
 * Connect + prove ownership:
 * 1) Inside Nimiq Pay Mini App → provider.connect / listAccounts / sign
 * 2) Browser → Nimiq Hub signMessage (hub.nimiq.com)
 */
export async function connectAndSign(userId: string): Promise<WalletProof> {
  const message = buildConnectChallenge(userId)

  // Prefer Mini App provider when injected
  const provider = await initNimiq(2500)
  if (provider) {
    try {
      await provider.connect()
    } catch {
      // some hosts auto-connect
    }
    const accounts = await listAccountsSafe(provider)
    const address = accounts[0]
    if (!address) throw new Error('No Nimiq account in wallet')

    const signed = await provider.sign(message)
    if (isErrorResponse(signed)) {
      throw new Error(signed.error.message || 'Sign failed in Nimiq Pay')
    }
    return {
      address,
      message,
      signature: signed.signature,
      publicKey: signed.publicKey,
      method: 'mini-app',
    }
  }

  // Browser fallback: Hub popup → hub.nimiq.com sign-message
  try {
    const hub = await hubSignConnectMessage(message)
    return {
      address: hub.address,
      message: hub.message,
      signature: hub.signatureHex,
      publicKey: hub.publicKeyHex,
      method: 'hub',
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // User closed popup
    if (/cancel|closed|abort/i.test(msg)) {
      throw new Error('Wallet connection cancelled')
    }
    throw new Error(msg || 'Hub sign-message failed')
  }
}
