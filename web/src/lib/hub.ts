import HubApi from '@nimiq/hub-api'

/** Production Nimiq Hub — popup sign-message / choose-address */
export const HUB_ENDPOINT = 'https://hub.nimiq.com'

let hubClient: HubApi | null = null

export function getHubApi(): HubApi {
  if (!hubClient) {
    hubClient = new HubApi(HUB_ENDPOINT)
  }
  return hubClient
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Prove wallet ownership via Hub sign-message popup
 * (hub.nimiq.com → Sign Message flow).
 */
export async function hubSignConnectMessage(message: string): Promise<{
  address: string
  publicKeyHex: string
  signatureHex: string
  message: string
}> {
  const hub = getHubApi()
  const signed = await hub.signMessage({
    appName: 'NimGigs',
    message,
  })
  return {
    address: signed.signer,
    publicKeyHex: bytesToHex(signed.signerPublicKey),
    signatureHex: bytesToHex(signed.signature),
    message,
  }
}

/** Optional: pick an address only (no signature). */
export async function hubChooseAddress(): Promise<string> {
  const hub = getHubApi()
  const result = await hub.chooseAddress({
    appName: 'NimGigs',
  })
  return result.address
}
