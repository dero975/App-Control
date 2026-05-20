import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
const appAccessPinHashStorageKey = 'app-control-pin-hash'
const appAccessHeaderName = 'x-app-control-pin-hash'

let appAccessPinHash = readStoredAppAccessPinHash()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: appControlFetch,
      },
    })
  : null

export function setSupabaseAppAccessPinHash(pinHash: string) {
  appAccessPinHash = pinHash
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(appAccessPinHashStorageKey, pinHash)
  }
}

export function clearSupabaseAppAccessPinHash() {
  appAccessPinHash = ''
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(appAccessPinHashStorageKey)
  }
}

export function hasSupabaseAppAccessPinHash() {
  return Boolean(appAccessPinHash)
}

function readStoredAppAccessPinHash() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(appAccessPinHashStorageKey) ?? ''
}

function appControlFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (appAccessPinHash) {
    headers.set(appAccessHeaderName, appAccessPinHash)
  }

  return fetch(input, { ...init, headers })
}
