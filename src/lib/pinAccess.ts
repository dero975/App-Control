import {
  clearSupabaseTrustedDeviceToken,
  getSupabaseTrustedDeviceToken,
  hasSupabaseTrustedDeviceToken,
  setSupabaseAppAccessPinHash,
  setSupabaseTrustedDeviceToken,
  supabase,
} from './supabase'

export const appUnlockedStorageKey = 'app-control-unlocked'
export const appIntroSeenStorageKey = 'app-control-intro-seen'
export const trustedDeviceUnlockSuppressedStorageKey = 'app-control-trusted-device-unlock-suppressed'

type VerifyAppPinOptions = {
  rememberDevice?: boolean
}

export async function verifyAppPin(pin: string, options: VerifyAppPinOptions = {}) {
  const pinHash = await hashPin(pin)
  const isValid = await verifyAppPinHash(pinHash)
  if (!isValid) return false

  setSupabaseAppAccessPinHash(pinHash)
  if (options.rememberDevice) {
    await createTrustedDevice(pinHash)
  }

  return true
}

export async function updateAppPin(currentPin: string, nextPin: string) {
  const currentPinHash = await hashPin(currentPin)
  if (!(await verifyAppPinHash(currentPinHash))) {
    throw new Error('PIN attuale non corretto')
  }

  if (!isValidPin(nextPin)) {
    throw new Error('Il nuovo PIN deve avere 6 cifre')
  }

  setSupabaseAppAccessPinHash(currentPinHash)
  const nextPinHash = await hashPin(nextPin)
  const client = requireSupabase()
  const { data, error } = await client.rpc('app_control_update_pin', {
    current_pin_hash: currentPinHash,
    next_pin_hash: nextPinHash,
  })
  if (error) throw error
  if (data !== true) throw new Error('PIN attuale non corretto')
  setSupabaseAppAccessPinHash(nextPinHash)
  clearSupabaseTrustedDeviceToken()
}

export async function restoreTrustedDeviceAccess() {
  const deviceToken = getSupabaseTrustedDeviceToken()
  if (!deviceToken) return false

  const client = requireSupabase()
  const { data, error } = await client.rpc('app_control_verify_trusted_device', { device_token: deviceToken })
  if (error || data !== true) {
    clearSupabaseTrustedDeviceToken()
    return false
  }

  return true
}

export async function revokeTrustedDevice() {
  const deviceToken = getSupabaseTrustedDeviceToken()
  clearSupabaseTrustedDeviceToken()
  if (!deviceToken) return false

  const client = requireSupabase()
  const { error } = await client.rpc('app_control_revoke_trusted_device', { device_token: deviceToken })
  if (error) throw error
  return true
}

export { hasSupabaseTrustedDeviceToken }

export function isValidPin(pin: string) {
  return /^\d{6}$/.test(pin)
}

export async function hashPin(pin: string) {
  const data = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function verifyAppPinHash(pinHash: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('app_control_verify_pin', { candidate_pin_hash: pinHash })
  if (error) throw error
  return data === true
}

async function createTrustedDevice(pinHash: string) {
  const deviceToken = createDeviceToken()
  const client = requireSupabase()
  const { data, error } = await client.rpc('app_control_create_trusted_device', {
    current_pin_hash: pinHash,
    device_token: deviceToken,
    device_label: createDeviceLabel(),
  })
  if (error) throw error
  if (data !== true) throw new Error('Dispositivo non autorizzato')
  setSupabaseTrustedDeviceToken(deviceToken)
}

function createDeviceToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function createDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Dispositivo attendibile'
  const platform = navigator.platform || 'Browser'
  const userAgent = navigator.userAgent.match(/(Chrome|CriOS|Safari|Firefox|Edg|OPR)\/?\s*([\d.]*)/i)?.[0] ?? 'Browser'
  return `${platform} - ${userAgent}`.slice(0, 120)
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}
