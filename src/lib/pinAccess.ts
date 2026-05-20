import { setSupabaseAppAccessPinHash, supabase } from './supabase'

export const appUnlockedStorageKey = 'app-control-unlocked'
export const appIntroSeenStorageKey = 'app-control-intro-seen'

export async function verifyAppPin(pin: string) {
  const pinHash = await hashPin(pin)
  const isValid = await verifyAppPinHash(pinHash)
  if (isValid) setSupabaseAppAccessPinHash(pinHash)
  return isValid
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
}

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

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}
