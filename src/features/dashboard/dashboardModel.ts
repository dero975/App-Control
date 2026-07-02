import type { Project } from '../../types/app'

export type EmailFilter = 'all' | 'github-duplicates'

export type DashboardRow = {
  project: Project
  githubEmail: string
  githubUsageCount: number
}

const dashboardProviderToneMap: Record<string, string> = {
  windsurf: 'sage',
  replit: 'terracotta',
  render: 'ocean',
  cloudflare: 'amber',
  cloudeflare: 'amber',
}

const dashboardFallbackProviderTones = ['moss', 'slate', 'plum', 'sand'] as const

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function getDashboardValuePillClassName(value: string) {
  return `dashboard-value-pill dashboard-value-pill--${resolveDashboardProviderTone(value)}`
}

export function formatDashboardDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data non disponibile'

  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function resolveDashboardProviderTone(value: string) {
  const normalizedValue = value.trim().toLowerCase()
  if (!normalizedValue) return 'neutral'

  const directMatch = dashboardProviderToneMap[normalizedValue]
  if (directMatch) return directMatch

  const hash = Array.from(normalizedValue).reduce((total, character) => total + character.charCodeAt(0), 0)
  return dashboardFallbackProviderTones[hash % dashboardFallbackProviderTones.length]
}
