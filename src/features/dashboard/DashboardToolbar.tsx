import { RotateCcw } from 'lucide-react'
import type { EmailFilter } from './dashboardModel'

export function DashboardToolbar({
  emailFilter,
  githubEmailFilter,
  githubEmailOptions,
  platformFilter,
  platformOptions,
  searchQuery,
  onEmailFilterChange,
  onGithubEmailFilterChange,
  onPlatformFilterChange,
  onResetFilters,
  onSearchQueryChange,
}: {
  emailFilter: EmailFilter
  githubEmailFilter: string
  githubEmailOptions: string[]
  platformFilter: string
  platformOptions: string[]
  searchQuery: string
  onEmailFilterChange: (value: EmailFilter) => void
  onGithubEmailFilterChange: (value: string) => void
  onPlatformFilterChange: (value: string) => void
  onResetFilters: () => void
  onSearchQueryChange: (value: string) => void
}) {
  return (
    <div className="toolbar toolbar--horizontal dashboard-toolbar">
      <label>
        <span>Cerca</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Progetto, email o piattaforma"
        />
      </label>

      <label>
        <span>Piattaforma</span>
        <select value={platformFilter} onChange={(event) => onPlatformFilterChange(event.target.value)}>
          {platformOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Email GitHub</span>
        <select value={githubEmailFilter} onChange={(event) => onGithubEmailFilterChange(event.target.value)}>
          {githubEmailOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Ricorrenza email</span>
        <select value={emailFilter} onChange={(event) => onEmailFilterChange(event.target.value as EmailFilter)}>
          <option value="all">Tutte</option>
          <option value="github-duplicates">GitHub duplicate</option>
          <option value="any-duplicates">Qualsiasi duplicata</option>
        </select>
      </label>

      <button
        type="button"
        className="dashboard-reset-button"
        onClick={onResetFilters}
        title="Reset filtri"
        aria-label="Reset filtri"
      >
        <RotateCcw aria-hidden="true" className="button-icon" />
      </button>
    </div>
  )
}
