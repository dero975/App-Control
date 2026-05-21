import { ArrowDownWideNarrow, ArrowUpWideNarrow, ClockArrowDown, FileText, Pin, Plus } from 'lucide-react'
import type { Project } from '../../types/app'
import { buildProjectVariables, formatProjectUpdatedAt, getDeployAdminLink, getDeployLink } from './projectShared'
import { buildNormalizedSheetFields } from './projectPageModel'
import type { ProjectListSortMode, ProjectTab } from './projectPageConstants'

export function ProjectIndexPanel({
  expandedMobileId,
  filteredProjects,
  pinnedProjectIds,
  query,
  selectedProjectId,
  sortMode,
  onChangeQuery,
  onCreateProject,
  onOpenMobileProject,
  onSelectProject,
  onToggleAlphabeticalSort,
  onTogglePinnedProject,
  onToggleRecencySort,
}: {
  expandedMobileId: string
  filteredProjects: Project[]
  pinnedProjectIds: string[]
  query: string
  selectedProjectId: string
  sortMode: ProjectListSortMode
  onChangeQuery: (value: string) => void
  onCreateProject: () => void
  onOpenMobileProject: (projectId: string) => void
  onSelectProject: (projectId: string, tab?: ProjectTab) => void
  onToggleAlphabeticalSort: () => void
  onTogglePinnedProject: (projectId: string) => void
  onToggleRecencySort: () => void
}) {
  const isAlphabeticalSortActive = sortMode === 'name-asc' || sortMode === 'name-desc'
  const isRecencySortActive = sortMode === 'recent-desc'
  const alphabeticalSortLabel = sortMode === 'name-desc' ? 'Ordina progetti Z-A' : 'Ordina progetti A-Z'
  const recencySortLabel = 'Ordina progetti dal piu recente al meno recente'

  return (
    <aside className="index-panel">
      <div className="toolbar">
        <input value={query} onChange={(event) => onChangeQuery(event.target.value)} placeholder="Cerca.." aria-label="Cerca progetto" />
        <div className="toolbar__row">
          <div className="toolbar__icon-filters" aria-label="Ordinamento lista progetti">
            <button
              type="button"
              className={isAlphabeticalSortActive ? 'secondary-button icon-filter-button icon-filter-button--active' : 'secondary-button icon-filter-button'}
              onClick={onToggleAlphabeticalSort}
              aria-label={alphabeticalSortLabel}
              title={alphabeticalSortLabel}
            >
              {sortMode === 'name-desc' ? (
                <ArrowDownWideNarrow aria-hidden="true" className="button-icon" />
              ) : (
                <ArrowUpWideNarrow aria-hidden="true" className="button-icon" />
              )}
            </button>
          </div>
          <button type="button" className="secondary-button toolbar__primary-action" onClick={onCreateProject}>
            <Plus aria-hidden="true" className="button-icon" />
            Nuovo progetto
          </button>
          <div className="toolbar__icon-filters" aria-label="Ordinamento lista progetti">
            <button
              type="button"
              className={isRecencySortActive ? 'secondary-button icon-filter-button icon-filter-button--active' : 'secondary-button icon-filter-button'}
              onClick={onToggleRecencySort}
              aria-label={recencySortLabel}
              title={recencySortLabel}
            >
              <ClockArrowDown aria-hidden="true" className="button-icon" />
            </button>
          </div>
        </div>
      </div>

      <ProjectDesktopList
        filteredProjects={filteredProjects}
        pinnedProjectIds={pinnedProjectIds}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
        onTogglePinnedProject={onTogglePinnedProject}
      />
      <ProjectMobileList
        expandedMobileId={expandedMobileId}
        filteredProjects={filteredProjects}
        pinnedProjectIds={pinnedProjectIds}
        onOpenMobileProject={onOpenMobileProject}
        onSelectProject={onSelectProject}
        onTogglePinnedProject={onTogglePinnedProject}
      />
    </aside>
  )
}

function ProjectDesktopList({
  filteredProjects,
  pinnedProjectIds,
  selectedProjectId,
  onSelectProject,
  onTogglePinnedProject,
}: {
  filteredProjects: Project[]
  pinnedProjectIds: string[]
  selectedProjectId: string
  onSelectProject: (projectId: string, tab?: ProjectTab) => void
  onTogglePinnedProject: (projectId: string) => void
}) {
  return (
    <div className="record-list record-list--desktop" aria-label="Progetti">
      {filteredProjects.map((project) => {
        const isPinned = pinnedProjectIds.includes(project.id)
        return (
          <article key={project.id} className={getProjectRowClassName(project.id, selectedProjectId, isPinned)}>
            <button type="button" className="record-row__main" onClick={() => onSelectProject(project.id, 'Dati progetto')}>
              <strong>{project.name}</strong>
              <small>{`Ultima modifica: ${formatProjectUpdatedAt(project.updatedAt)}`}</small>
            </button>
            <ProjectPinButton isPinned={isPinned} onClick={() => onTogglePinnedProject(project.id)} />
          </article>
        )
      })}
    </div>
  )
}

function ProjectMobileList({
  expandedMobileId,
  filteredProjects,
  pinnedProjectIds,
  onOpenMobileProject,
  onSelectProject,
  onTogglePinnedProject,
}: {
  expandedMobileId: string
  filteredProjects: Project[]
  pinnedProjectIds: string[]
  onOpenMobileProject: (projectId: string) => void
  onSelectProject: (projectId: string, tab?: ProjectTab) => void
  onTogglePinnedProject: (projectId: string) => void
}) {
  return (
    <div className="record-list record-list--mobile" aria-label="Progetti mobile">
      {filteredProjects.map((project) => {
        const isExpanded = project.id === expandedMobileId
        const isPinned = pinnedProjectIds.includes(project.id)
        const deployLink = getDeployLink(buildNormalizedSheetFields(project), project)
        const deployAdminLink = getDeployAdminLink(buildProjectVariables(project), deployLink)

        return (
          <article key={project.id} className={getMobileProjectCardClassName(isExpanded, isPinned)}>
            <ProjectPinButton isPinned={isPinned} onClick={() => onTogglePinnedProject(project.id)} />
            <button type="button" className="mobile-project-card__trigger" onClick={() => onSelectProject(project.id, 'Dati progetto')}>
              <strong>{project.name}</strong>
              <small>{`Ultima modifica: ${formatProjectUpdatedAt(project.updatedAt)}`}</small>
            </button>
            {isExpanded ? (
              <ProjectMobileLinks deployAdminLink={deployAdminLink} deployLink={deployLink} onOpen={() => onOpenMobileProject(project.id)} />
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function ProjectMobileLinks({ deployAdminLink, deployLink, onOpen }: { deployAdminLink: string; deployLink: string; onOpen: () => void }) {
  return (
    <div className="mobile-project-card__links">
      {deployLink ? <ProjectMobileLink value={deployLink} /> : null}
      {deployAdminLink ? <ProjectMobileLink value={deployAdminLink} /> : null}
      <div className="mobile-project-card__actions">
        <button type="button" className="secondary-button mobile-project-card__action" onClick={onOpen}>
          <FileText aria-hidden="true" className="button-icon" />
          Apri scheda progetto
        </button>
      </div>
    </div>
  )
}

function ProjectMobileLink({ value }: { value: string }) {
  return (
    <a className="mobile-project-card__link" href={value} target="_blank" rel="noreferrer">
      {value}
    </a>
  )
}

function ProjectPinButton({ isPinned, onClick }: { isPinned: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={isPinned ? 'project-pin-button project-pin-button--active' : 'project-pin-button'}
      aria-label={isPinned ? 'Rimuovi progetto fissato' : 'Fissa progetto in alto'}
      aria-pressed={isPinned}
      title={isPinned ? 'Rimuovi progetto fissato' : 'Fissa progetto in alto'}
      onClick={onClick}
    >
      <Pin aria-hidden="true" className="button-icon" />
    </button>
  )
}

function getProjectRowClassName(projectId: string, selectedProjectId: string, isPinned: boolean) {
  return ['record-row', projectId === selectedProjectId ? 'record-row--active' : '', isPinned ? 'record-row--pinned' : ''].filter(Boolean).join(' ')
}

function getMobileProjectCardClassName(isExpanded: boolean, isPinned: boolean) {
  return ['mobile-project-card', isExpanded ? 'mobile-project-card--active' : '', isPinned ? 'mobile-project-card--pinned' : ''].filter(Boolean).join(' ')
}
