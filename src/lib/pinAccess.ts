import { supabase } from './supabase'

export const defaultPin = '140478'
export const defaultPinHash = '8c75a9caf68bf332df5bf3714dcfd4e9d1b5088b42f0cffec88ee78df3670977'
export const appUnlockedStorageKey = 'app-control-unlocked'
export const appIntroSeenStorageKey = 'app-control-intro-seen'

type AppAccessSettingsRow = {
  pin_hash: string
}

export async function verifyAppPin(pin: string) {
  const settings = await fetchAppAccessSettings()
  return (await hashPin(pin)) === settings.pinHash
}

export async function updateAppPin(currentPin: string, nextPin: string) {
  const settings = await fetchAppAccessSettings()
  if ((await hashPin(currentPin)) !== settings.pinHash) {
    throw new Error('PIN attuale non corretto')
  }

  if (!isValidPin(nextPin)) {
    throw new Error('Il nuovo PIN deve avere 6 cifre')
  }

  const client = requireSupabase()
  const { error } = await client
    .from('app_control_settings')
    .update({ pin_hash: await hashPin(nextPin) })
    .eq('id', true)
  if (error) throw error
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

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}
