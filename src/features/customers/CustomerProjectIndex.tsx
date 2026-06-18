import { ArrowDownWideNarrow, ArrowUpWideNarrow, ClockArrowDown, Pin, Plus } from 'lucide-react'
import type { CustomerProject } from '../../types/app'
import { handleExternalLinkClick } from '../../lib/externalLink'
import { formatProjectUpdatedAt, getDeployAdminLink, getDeployLink } from '../projects/projectShared'
import type { CustomerProjectListSortMode, CustomerProjectTab } from './customerPageConstants'
import { getCustomerProjectComputedData } from './customerProjectModel'

export function CustomerProjectIndex({
  filteredProjects,
  isMobileViewport,
  pinnedProjectIds,
  projectQuery,
  projectSortMode,
  selectedProjectId,
  onChangeProjectTab,
  onCreateProject,
  onOpenMobileProject,
  onProjectQueryChange,
  onSelectProject,
  onToggleAlphabeticalSort,
  onTogglePinnedProject,
  onToggleRecencySort,
}: {
  filteredProjects: CustomerProject[]
  isMobileViewport: boolean
  pinnedProjectIds: string[]
  projectQuery: string
  projectSortMode: CustomerProjectListSortMode
  selectedProjectId: string
  onChangeProjectTab: (tab: CustomerProjectTab) => void
  onCreateProject: () => void
  onOpenMobileProject: (projectId: string) => void
  onProjectQueryChange: (value: string) => void
  onSelectProject: (projectId: string) => void
  onToggleAlphabeticalSort: () => void
  onTogglePinnedProject: (projectId: string) => void
  onToggleRecencySort: () => void
}) {
  const isAlphabeticalSortActive = projectSortMode === 'name-asc' || projectSortMode === 'name-desc'
  const isRecencySortActive = projectSortMode === 'recent-desc'
  const alphabeticalSortLabel = projectSortMode === 'name-desc' ? 'Ordina progetti Z-A' : 'Ordina progetti A-Z'
  const recencySortLabel = 'Ordina progetti dal piu recente al meno recente'

  return (
    <aside className="index-panel">
      <div className="toolbar">
        <input
          value={projectQuery}
          onChange={(event) => onProjectQueryChange(event.target.value)}
          placeholder="Cerca.."
          aria-label="Cerca progetto cliente"
        />
        <div className="toolbar__row">
          <div className="toolbar__icon-filters" aria-label="Ordinamento lista progetti cliente">
            <button
              type="button"
              className={isAlphabeticalSortActive ? 'secondary-button icon-filter-button icon-filter-button--active' : 'secondary-button icon-filter-button'}
              onClick={onToggleAlphabeticalSort}
              aria-label={alphabeticalSortLabel}
              title={alphabeticalSortLabel}
            >
              {projectSortMode === 'name-desc' ? (
                <ArrowDownWideNarrow aria-hidden="true" className="button-icon" />
              ) : (
                <ArrowUpWideNarrow aria-hidden="true" className="button-icon" />
              )}
            </button>
          </div>
          <button type="button" className="secondary-button toolbar__primary-action" onClick={onCreateProject}>
            <Plus aria-hidden="true" className="button-icon" />
            Nuovo progetto cliente
          </button>
          <div className="toolbar__icon-filters" aria-label="Ordinamento lista progetti cliente">
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
        onChangeProjectTab={onChangeProjectTab}
        onSelectProject={onSelectProject}
        onTogglePinnedProject={onTogglePinnedProject}
      />
      <ProjectMobileList
        filteredProjects={filteredProjects}
        isMobileViewport={isMobileViewport}
        pinnedProjectIds={pinnedProjectIds}
        selectedProjectId={selectedProjectId}
        onChangeProjectTab={onChangeProjectTab}
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
  onChangeProjectTab,
  onSelectProject,
  onTogglePinnedProject,
}: ProjectListProps) {
  return (
    <div className="record-list record-list--desktop" aria-label="Progetti cliente">
      {filteredProjects.map((project) => {
        const isPinned = pinnedProjectIds.includes(project.id)
        return (
          <article key={project.id} className={getProjectRowClassName(project.id, selectedProjectId, isPinned)}>
            <button type="button" className="record-row__main" onClick={() => selectProject(project.id, onSelectProject, onChangeProjectTab)}>
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
  filteredProjects,
  isMobileViewport,
  pinnedProjectIds,
  selectedProjectId,
  onChangeProjectTab,
  onOpenMobileProject,
  onSelectProject,
  onTogglePinnedProject,
}: ProjectListProps & { isMobileViewport: boolean; onOpenMobileProject: (projectId: string) => void }) {
  return (
    <div className="record-list record-list--mobile" aria-label="Progetti cliente mobile">
      {filteredProjects.map((project) => {
        const isExpanded = isMobileViewport && project.id === selectedProjectId
        const isPinned = pinnedProjectIds.includes(project.id)
        const { adminLikeProject, sheetFields, variables } = getCustomerProjectComputedData(project)
        const deployLink = getDeployLink(sheetFields, adminLikeProject)
        const deployAdminLink = getDeployAdminLink(variables, deployLink)

        return (
          <article key={project.id} className={getMobileProjectCardClassName(isExpanded, isPinned)}>
            <ProjectPinButton isPinned={isPinned} onClick={() => onTogglePinnedProject(project.id)} />
            <button type="button" className="mobile-project-card__trigger" onClick={() => selectProject(project.id, onSelectProject, onChangeProjectTab)}>
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

function ProjectMobileLinks({
  deployAdminLink,
  deployLink,
  onOpen,
}: {
  deployAdminLink: string
  deployLink: string
  onOpen: () => void
}) {
  return (
    <div className="mobile-project-card__links">
      {deployLink ? <ProjectMobileLink value={deployLink} /> : null}
      {deployAdminLink ? <ProjectMobileLink value={deployAdminLink} /> : null}
      <div className="mobile-project-card__actions">
        <button type="button" className="secondary-button mobile-project-card__action" onClick={onOpen}>
          Apri scheda progetto
        </button>
      </div>
    </div>
  )
}

function ProjectMobileLink({ value }: { value: string }) {
  return (
    <a className="mobile-project-card__link" href={value} target="_blank" rel="noreferrer" onClick={(event) => handleExternalLinkClick(event, value)}>
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

type ProjectListProps = {
  filteredProjects: CustomerProject[]
  pinnedProjectIds: string[]
  selectedProjectId: string
  onChangeProjectTab: (tab: CustomerProjectTab) => void
  onSelectProject: (projectId: string) => void
  onTogglePinnedProject: (projectId: string) => void
}

function selectProject(projectId: string, onSelectProject: (projectId: string) => void, onChangeProjectTab: (tab: CustomerProjectTab) => void) {
  onSelectProject(projectId)
  onChangeProjectTab('Dati progetto')
}

function getProjectRowClassName(projectId: string, selectedProjectId: string, isPinned: boolean) {
  return ['record-row', projectId === selectedProjectId ? 'record-row--active' : '', isPinned ? 'record-row--pinned' : ''].filter(Boolean).join(' ')
}

function getMobileProjectCardClassName(isExpanded: boolean, isPinned: boolean) {
  return ['mobile-project-card', isExpanded ? 'mobile-project-card--active' : '', isPinned ? 'mobile-project-card--pinned' : ''].filter(Boolean).join(' ')
}
