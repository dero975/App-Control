import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { SectionHeader } from '../../components/SectionHeader'
import { fetchDashboardProjects } from '../projects/projectRepository'
import type { Project } from '../../types/app'
import { DashboardSummary } from './DashboardSummary'
import { DashboardTable } from './DashboardTable'
import { DashboardToolbar } from './DashboardToolbar'
import type { DashboardRow, EmailFilter } from './dashboardModel'
import { normalizeEmail } from './dashboardModel'

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
        const nextProjects = await fetchDashboardProjects()
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

  const rows = useMemo<DashboardRow[]>(() => {
    return [...projects]
      .sort((left, right) => left.name.localeCompare(right.name, 'it', { sensitivity: 'base' }))
      .map((project) => {
        const githubEmail = project.githubAccountEmail.trim()
        const githubUsageCount = githubUsageMap.get(normalizeEmail(githubEmail)) ?? 0

        return {
          project,
          githubEmail,
          githubUsageCount,
        }
      })
  }, [githubUsageMap, projects])

  const platformOptions = useMemo(() => {
    const nextOptions = new Set<string>()

    for (const row of rows) {
      if (row.githubEmail) nextOptions.add('GitHub')
      if (row.project.deploy.provider.trim()) nextOptions.add(row.project.deploy.provider.trim())
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
          row.project.deploy.provider.trim() === platformFilter

        if (!matchesPlatform) return false
      }

      if (githubEmailFilter !== 'Tutte' && row.githubEmail !== githubEmailFilter) return false

      if (emailFilter === 'github-duplicates' && row.githubUsageCount <= 1) return false

      if (!normalizedSearch) return true

      const haystack = [
        row.project.name,
        row.githubEmail,
        row.project.deploy.provider,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [emailFilter, githubEmailFilter, platformFilter, rows, searchQuery])

  const summary = useMemo(() => {
    const uniqueGithubEmails = githubUsageMap.size
    const duplicatedGithubEmails = Array.from(githubUsageMap.values()).filter((count) => count > 1).length

    return {
      projectCount: projects.length,
      uniqueGithubEmails,
      duplicatedGithubEmails,
    }
  }, [githubUsageMap, projects.length])

  return (
    <div className="page-stack dashboard-page">
      <SectionHeader title="Dashboard" />

      <DashboardSummary summary={summary} />

      <section className="dashboard-panel">
        <DashboardToolbar
          emailFilter={emailFilter}
          githubEmailFilter={githubEmailFilter}
          githubEmailOptions={githubEmailOptions}
          platformFilter={platformFilter}
          platformOptions={platformOptions}
          searchQuery={searchQuery}
          onEmailFilterChange={setEmailFilter}
          onGithubEmailFilterChange={setGithubEmailFilter}
          onPlatformFilterChange={setPlatformFilter}
          onResetFilters={resetFilters}
          onSearchQueryChange={setSearchQuery}
        />

        {errorMessage ? <p className="status-message status-message--error">{errorMessage}</p> : null}

        {isLoading ? (
          <EmptyState title="Caricamento dashboard" message="Sto leggendo i dati progetto da Supabase." />
        ) : filteredRows.length ? (
          <DashboardTable rows={filteredRows} />
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
