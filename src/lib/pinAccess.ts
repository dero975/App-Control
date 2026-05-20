import { setSupabaseAppAccessPinHash, supabase } from './supabase'

export const defaultPin = '140478'
export const defaultPinHash = '8c75a9caf68bf332df5bf3714dcfd4e9d1b5088b42f0cffec88ee78df3670977'
export const appUnlockedStorageKey = 'app-control-unlocked'
export const appIntroSeenStorageKey = 'app-control-intro-seen'

type AppAccessSettingsRow = {
  pin_hash: string
}

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
  const { error } = await client
    .from('app_control_settings')
    .update({ pin_hash: nextPinHash })
    .eq('id', true)
  if (error) throw error
  setSupabaseAppAccessPinHash(nextPinHash)
}

export async function fetchAppAccessSettings() {
  const client = requireSupabase()
  const { data, error } = await client.from('app_control_settings').select('pin_hash').eq('id', true).single()
  if (error) throw error

  const row = data as AppAccessSettingsRow
  return {
    pinHash: row.pin_hash || defaultPinHash,
  }
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
  if (!error) return data === true

  if (!isMissingRpcError(error)) throw error

  const settings = await fetchAppAccessSettings()
  return pinHash === settings.pinHash
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || /app_control_verify_pin/i.test(error.message ?? '')
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}
