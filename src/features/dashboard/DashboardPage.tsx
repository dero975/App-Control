import { RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { SectionHeader } from '../../components/SectionHeader'
import { fetchProjects } from '../projects/projectRepository'
import type { PlatformAccess, Project } from '../../types/app'

type EmailFilter = 'all' | 'github-duplicates' | 'any-duplicates'

type DashboardRow = {
  project: Project
  githubEmail: string
  githubUsageCount: number
  platformAccesses: Array<
    PlatformAccess & {
      emailUsageCount: number
    }
  >
  hasAnyDuplicateEmail: boolean
}

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('Tutte')
  const [githubEmailFilter, setGithubEmailFilter] = useState('Tutte')
  const [emailFilter, setEmailFilter] = useState<EmailFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  function resetFilters() {
    setSearchQuery('')
    setPlatformFilter('Tutte')
    setGithubEmailFilter('Tutte')
    setEmailFilter('all')
  }

  useEffect(() => {
    let active = true

    void loadProjects()

    return () => {
      active = false
    }

    async function loadProjects() {
      setIsLoading(true)
      try {
        const nextProjects = await fetchProjects()
        if (!active) return
        setProjects(nextProjects)
        setErrorMessage('')
      } catch (error) {
        if (!active) return
        setProjects([])
        setErrorMessage(error instanceof Error ? error.message : 'Errore caricamento dashboard')
      } finally {
        if (active) setIsLoading(false)
      }
    }
  }, [])

  const githubUsageMap = useMemo(() => {
    const counts = new Map<string, number>()

    for (const project of projects) {
      const email = normalizeEmail(project.githubAccountEmail)
      if (!email) continue
      counts.set(email, (counts.get(email) ?? 0) + 1)
    }

    return counts
  }, [projects])

  const platformEmailUsageMap = useMemo(() => {
    const counts = new Map<string, number>()

    for (const project of projects) {
      for (const access of project.platformAccesses ?? []) {
        const email = normalizeEmail(access.email)
        if (!email) continue
        counts.set(email, (counts.get(email) ?? 0) + 1)
      }
    }

    return counts
  }, [projects])

  const rows = useMemo<DashboardRow[]>(() => {
    return [...projects]
      .sort((left, right) => left.name.localeCompare(right.name, 'it', { sensitivity: 'base' }))
      .map((project) => {
        const githubEmail = project.githubAccountEmail.trim()
        const githubUsageCount = githubUsageMap.get(normalizeEmail(githubEmail)) ?? 0
        const platformAccesses = (project.platformAccesses ?? []).map((access) => ({
          ...access,
          emailUsageCount: platformEmailUsageMap.get(normalizeEmail(access.email)) ?? 0,
        }))
        const hasAnyDuplicateEmail =
          githubUsageCount > 1 || platformAccesses.some((access) => access.email && access.emailUsageCount > 1)

        return {
          project,
          githubEmail,
          githubUsageCount,
          platformAccesses,
          hasAnyDuplicateEmail,
        }
      })
  }, [githubUsageMap, platformEmailUsageMap, projects])

  const platformOptions = useMemo(() => {
    const nextOptions = new Set<string>()

    for (const row of rows) {
      if (row.githubEmail) nextOptions.add('GitHub')
      if (row.project.developmentEnvironment.trim()) nextOptions.add(row.project.developmentEnvironment.trim())
      if (row.project.deploy.provider.trim()) nextOptions.add(row.project.deploy.provider.trim())
      for (const access of row.platformAccesses) {
        if (access.platform.trim()) nextOptions.add(access.platform.trim())
      }
    }

    return ['Tutte', ...Array.from(nextOptions).sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))]
  }, [rows])

  const githubEmailOptions = useMemo(() => {
    const nextOptions = new Set<string>()

    for (const row of rows) {
      if (row.githubEmail) nextOptions.add(row.githubEmail)
    }

    return ['Tutte', ...Array.from(nextOptions).sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))]
  }, [rows])

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return rows.filter((row) => {
      if (platformFilter !== 'Tutte') {
        const matchesPlatform =
          (platformFilter === 'GitHub' && Boolean(row.githubEmail)) ||
          row.project.developmentEnvironment.trim() === platformFilter ||
          row.project.deploy.provider.trim() === platformFilter ||
          row.platformAccesses.some((access) => access.platform.trim() === platformFilter)

        if (!matchesPlatform) return false
      }

      if (githubEmailFilter !== 'Tutte' && row.githubEmail !== githubEmailFilter) return false

      if (emailFilter === 'github-duplicates' && row.githubUsageCount <= 1) return false
      if (emailFilter === 'any-duplicates' && !row.hasAnyDuplicateEmail) return false

      if (!normalizedSearch) return true

      const haystack = [
        row.project.name,
        row.githubEmail,
        row.project.developmentEnvironment,
        row.project.deploy.provider,
        ...row.platformAccesses.flatMap((access) => [access.platform, access.email]),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [emailFilter, githubEmailFilter, platformFilter, rows, searchQuery])

  const summary = useMemo(() => {
    const uniqueGithubEmails = githubUsageMap.size
    const duplicatedGithubEmails = Array.from(githubUsageMap.values()).filter((count) => count > 1).length
    const duplicatedPlatformEmails = Array.from(platformEmailUsageMap.values()).filter((count) => count > 1).length

    return {
      projectCount: projects.length,
      uniqueGithubEmails,
      duplicatedGithubEmails,
      duplicatedPlatformEmails,
    }
  }, [githubUsageMap, platformEmailUsageMap, projects.length])

  return (
    <div className="page-stack dashboard-page">
      <SectionHeader
        title="Dashboard"
      />

      <div className="info-grid dashboard-summary-grid" aria-label="Riepilogo dashboard">
        <div className="info-pill">
          <span>Progetti</span>
          <strong>{summary.projectCount}</strong>
        </div>
        <div className="info-pill">
          <span>Email GitHub uniche</span>
          <strong>{summary.uniqueGithubEmails}</strong>
        </div>
        <div className="info-pill">
          <span>Email GitHub condivise</span>
          <strong>{summary.duplicatedGithubEmails}</strong>
        </div>
        <div className="info-pill">
          <span>Email piattaforma condivise</span>
          <strong>{summary.duplicatedPlatformEmails}</strong>
        </div>
      </div>

      <section className="dashboard-panel">
        <div className="toolbar toolbar--horizontal dashboard-toolbar">
          <label>
            <span>Cerca</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Progetto, email o piattaforma"
            />
          </label>

          <label>
            <span>Piattaforma</span>
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
              {platformOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Email GitHub</span>
            <select value={githubEmailFilter} onChange={(event) => setGithubEmailFilter(event.target.value)}>
              {githubEmailOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Ricorrenza email</span>
            <select value={emailFilter} onChange={(event) => setEmailFilter(event.target.value as EmailFilter)}>
              <option value="all">Tutte</option>
              <option value="github-duplicates">GitHub duplicate</option>
              <option value="any-duplicates">Qualsiasi duplicata</option>
            </select>
          </label>

          <button
            type="button"
            className="dashboard-reset-button"
            onClick={resetFilters}
            title="Reset filtri"
            aria-label="Reset filtri"
          >
            <RotateCcw aria-hidden="true" className="button-icon" />
          </button>
        </div>

        {errorMessage ? <p className="status-message status-message--error">{errorMessage}</p> : null}

        {isLoading ? (
          <EmptyState title="Caricamento dashboard" message="Sto leggendo i dati progetto da Supabase." />
        ) : filteredRows.length ? (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Progetto</th>
                  <th>GitHub</th>
                  <th>Sviluppo</th>
                  <th>Accessi piattaforme</th>
                  <th>Deploy</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.project.id}>
                    <td>
                      <div className="dashboard-project-cell">
                        <strong>{row.project.name}</strong>
                        <span>Creato: {formatDashboardDate(row.project.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      {row.githubEmail ? (
                        <div className="dashboard-email-cell">
                          <strong>{row.githubEmail}</strong>
                        </div>
                      ) : (
                        <span className="dashboard-muted">Nessuna email GitHub</span>
                      )}
                    </td>
                    <td>
                      <span className="dashboard-value-pill">{row.project.developmentEnvironment || 'Non impostato'}</span>
                    </td>
                    <td>
                      {row.platformAccesses.length ? (
                        <div className="dashboard-access-list">
                          {row.platformAccesses.map((access) => (
                            <div key={access.id} className="dashboard-access-item">
                              <span>{access.email || 'Nessuna email'}</span>
                              {access.email && access.emailUsageCount > 1 ? (
                                <span className="dashboard-badge">{access.emailUsageCount} progetti</span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="dashboard-muted">Nessun accesso piattaforma</span>
                      )}
                    </td>
                    <td>
                      <span className="dashboard-value-pill">{row.project.deploy.provider || 'Non impostato'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nessun risultato"
            message="Modifica i filtri oppure verifica che i dati progetto contengano email e piattaforme da consultare."
          />
        )}
      </section>
    </div>
  )
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function formatDashboardDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data non disponibile'

  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
