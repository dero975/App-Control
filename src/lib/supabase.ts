import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
const appAccessPinHashStorageKey = 'app-control-pin-hash'
const trustedDeviceTokenStorageKey = 'app-control-trusted-device-token'
const appAccessHeaderName = 'x-app-control-pin-hash'
const trustedDeviceHeaderName = 'x-app-control-device-token'

let appAccessPinHash = readStoredAppAccessPinHash()
let trustedDeviceToken = readStoredTrustedDeviceToken()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: appControlFetch,
      },
    })
  : null

export function requireSupabaseClient() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}

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

export function setSupabaseTrustedDeviceToken(deviceToken: string) {
  trustedDeviceToken = deviceToken
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(trustedDeviceTokenStorageKey, deviceToken)
  }
}

export function clearSupabaseTrustedDeviceToken() {
  trustedDeviceToken = ''
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(trustedDeviceTokenStorageKey)
  }
}

export function getSupabaseTrustedDeviceToken() {
  return trustedDeviceToken
}

export function hasSupabaseTrustedDeviceToken() {
  return Boolean(trustedDeviceToken)
}

export function hasSupabaseAppAccessCredential() {
  return Boolean(appAccessPinHash || trustedDeviceToken)
}

function readStoredAppAccessPinHash() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(appAccessPinHashStorageKey) ?? ''
}

function readStoredTrustedDeviceToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(trustedDeviceTokenStorageKey) ?? ''
}

function appControlFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (appAccessPinHash) {
    headers.set(appAccessHeaderName, appAccessPinHash)
  }
  if (trustedDeviceToken) {
    headers.set(trustedDeviceHeaderName, trustedDeviceToken)
  }

  return fetch(input, { ...init, headers })
}
