import type { ProjectVariable, ProjectVariableTone } from '../../types/app'
import { deployAdminLinkKey, renderApiKey, supabaseServiceKeyAliases } from './projectShared'

export const variableTones: Array<{ value: ProjectVariableTone; label: string }> = [
  { value: 'green', label: 'Verde' },
  { value: 'yellow', label: 'Giallo' },
  { value: 'blue', label: 'Blu' },
  { value: 'red', label: 'Rosso' },
  { value: 'orange', label: 'Arancione' },
  { value: 'purple', label: 'Viola' },
  { value: 'teal', label: 'Turchese' },
  { value: 'pink', label: 'Rosa' },
  { value: 'indigo', label: 'Indaco' },
  { value: 'brown', label: 'Marrone' },
]

export function isProtectedVariableTitle(variable: ProjectVariable) {
  const normalizedKey = variable.key.trim().toLowerCase()
  const normalizedEnvKey = variable.key.trim().toUpperCase()
  const protectedDataKeys = new Set(['nome progetto', 'mail github', 'password', 'deploy con', 'password deploy'])
  const protectedEnvKeys = new Set([
    'LINK_DEPLOY',
    deployAdminLinkKey,
    'GITHUB_URL',
    'GITHUB_TOKEN',
    renderApiKey,
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    ...supabaseServiceKeyAliases,
    'DATABASE_URL',
  ])

  return protectedDataKeys.has(normalizedKey) || protectedEnvKeys.has(normalizedEnvKey)
}

export function getEffectiveVariableTone(variable: ProjectVariable, toneStorageKey?: string, toneOverride?: ProjectVariableTone): ProjectVariableTone {
  if (toneOverride) return toneOverride
  if (variable.tone) return variable.tone
  return readStoredVariableTone(toneStorageKey, variable) ?? 'green'
}

export function normalizeVariableTone(value: string): ProjectVariableTone {
  return variableTones.some((tone) => tone.value === value) ? value as ProjectVariableTone : 'green'
}

export function readStoredVariableTone(toneStorageKey: string | undefined, variable: ProjectVariable): ProjectVariableTone | null {
  const storageKey = getVariableToneStorageKey(toneStorageKey, variable)
  if (!storageKey) return null

  const value = window.localStorage.getItem(storageKey)
  return value ? normalizeVariableTone(value) : null
}

export function writeStoredVariableTone(toneStorageKey: string | undefined, variable: ProjectVariable, tone: ProjectVariableTone) {
  const storageKey = getVariableToneStorageKey(toneStorageKey, variable)
  if (!storageKey) return

  window.localStorage.setItem(storageKey, tone)
}

export function removeStoredVariableTone(toneStorageKey: string | undefined, variable: ProjectVariable) {
  const storageKey = getVariableToneStorageKey(toneStorageKey, variable)
  if (!storageKey) return

  window.localStorage.removeItem(storageKey)
}

function getVariableToneStorageKey(toneStorageKey: string | undefined, variable: ProjectVariable) {
  if (!toneStorageKey) return ''
  const normalizedKey = variable.key.trim().toLowerCase()
  const variableKey = normalizedKey || variable.id
  return `${toneStorageKey}:${variableKey}`
}
