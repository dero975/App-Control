import { useMemo, useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { MobileWorkspaceModal } from '../../components/MobileWorkspaceModal'
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport'
import { getNextPinnedRecordIds, readPinnedRecordIds, writePinnedRecordIds } from '../../lib/pinnedRecords'
import type { Customer, CustomerProject } from '../../types/app'
import {
  customerPinnedProjectIdsStoragePrefix,
  type CustomerProjectListSortMode,
  type CustomerProjectTab,
} from './customerPageConstants'
import { CustomerDetailsCard } from './CustomerDetailsCard'
import { CustomerProjectDetail } from './CustomerProjectDetail'
import { CustomerProjectIndex } from './CustomerProjectIndex'
import { getSortedCustomerProjects } from './customerProjectModel'

export function CustomerWorkspace({
  customer,
  activeProjectTab,
  selectedProject,
  selectedProjectIsLoaded,
  selectedProjectId,
  loadedProjectIds,
  onChangeProjectTab,
  onCreateProject,
  onDeleteCustomer,
  onDeleteProject,
  onSelectProject,
  onUpdateCustomer,
  onUpdateProject,
}: {
  customer: Customer
  activeProjectTab: CustomerProjectTab
  selectedProject: CustomerProject | null
  selectedProjectIsLoaded: boolean
  selectedProjectId: string
  loadedProjectIds: Set<string>
  onChangeProjectTab: (tab: CustomerProjectTab) => void
  onCreateProject: () => void
  onDeleteCustomer: () => void
  onDeleteProject: (project: CustomerProject) => void
  onSelectProject: (projectId: string) => void
  onUpdateCustomer: (updater: (customer: Customer) => Customer) => void
  onUpdateProject: (projectId: string, updater: (project: CustomerProject) => CustomerProject) => void
}) {
  const [isCustomerCardOpen, setIsCustomerCardOpen] = useState(false)
  const [projectQuery, setProjectQuery] = useState('')
  const [projectSortMode, setProjectSortMode] = useState<CustomerProjectListSortMode>('recent-desc')
  const [pinnedProjectIds, setPinnedProjectIds] = useState(() => readPinnedRecordIds(`${customerPinnedProjectIdsStoragePrefix}${customer.id}`))
  const [mobileModalProjectId, setMobileModalProjectId] = useState('')
  const isMobileViewport = useIsMobileViewport()

  const filteredProjects = useMemo(
    () => getSortedCustomerProjects(customer.projects, projectQuery, projectSortMode, pinnedProjectIds),
    [customer.projects, pinnedProjectIds, projectQuery, projectSortMode],
  )
  const mobileModalProject = isMobileViewport ? customer.projects.find((project) => project.id === mobileModalProjectId) ?? null : null
  const mobileModalProjectIsLoaded = mobileModalProject ? loadedProjectIds.has(mobileModalProject.id) : false

  function toggleAlphabeticalSort() {
    setProjectSortMode((currentSortMode) => (currentSortMode === 'name-asc' ? 'name-desc' : 'name-asc'))
  }

  function togglePinnedProject(projectId: string) {
    setPinnedProjectIds((currentPinnedProjectIds) => {
      const nextPinnedProjectIds = getNextPinnedRecordIds(currentPinnedProjectIds, projectId)
      writePinnedRecordIds(`${customerPinnedProjectIdsStoragePrefix}${customer.id}`, nextPinnedProjectIds)
      return nextPinnedProjectIds
    })
  }

  return (
    <div className="detail-stack customer-workspace">
      <div className="tab-scroll-area customer-workspace__body">
        <CustomerDetailsCard
          customer={customer}
          isOpen={isCustomerCardOpen}
          onDelete={onDeleteCustomer}
          onToggleOpen={() => setIsCustomerCardOpen((currentValue) => !currentValue)}
          onUpdateCustomer={onUpdateCustomer}
        />

        <div className="split-workspace customer-projects-workspace">
          <CustomerProjectIndex
            filteredProjects={filteredProjects}
            isMobileViewport={isMobileViewport}
            pinnedProjectIds={pinnedProjectIds}
            projectQuery={projectQuery}
            projectSortMode={projectSortMode}
            selectedProjectId={selectedProjectId}
            onChangeProjectTab={onChangeProjectTab}
            onCreateProject={onCreateProject}
            onOpenMobileProject={(projectId) => {
              onSelectProject(projectId)
              onChangeProjectTab('Dati progetto')
              setMobileModalProjectId(projectId)
            }}
            onProjectQueryChange={setProjectQuery}
            onSelectProject={onSelectProject}
            onToggleAlphabeticalSort={toggleAlphabeticalSort}
            onTogglePinnedProject={togglePinnedProject}
            onToggleRecencySort={() => setProjectSortMode('recent-desc')}
          />
          {!isMobileViewport ? (
            <section className="detail-panel detail-panel--customer-project">
              <CustomerProjectDetailSlot
                activeProjectTab={activeProjectTab}
                selectedProject={selectedProject}
                selectedProjectIsLoaded={selectedProjectIsLoaded}
                onChangeProjectTab={onChangeProjectTab}
                onDeleteProject={onDeleteProject}
                onUpdateProject={onUpdateProject}
              />
            </section>
          ) : null}
        </div>
      </div>

      {isMobileViewport && mobileModalProject ? (
        <MobileWorkspaceModal title={mobileModalProject.name} subtitle="Scheda progetto cliente mobile" onClose={() => setMobileModalProjectId('')}>
          {mobileModalProjectIsLoaded ? (
            <CustomerProjectDetail
              activeTab={activeProjectTab}
              project={mobileModalProject}
              onChangeTab={onChangeProjectTab}
              onDelete={() => {
                setMobileModalProjectId('')
                onDeleteProject(mobileModalProject)
              }}
              onUpdate={(updater) => onUpdateProject(mobileModalProject.id, updater)}
              inlineMobile
            />
          ) : (
            <EmptyState title="Caricamento progetto cliente" message="Sto recuperando il dettaglio completo da Supabase." />
          )}
        </MobileWorkspaceModal>
      ) : null}
    </div>
  )
}

function CustomerProjectDetailSlot({
  activeProjectTab,
  selectedProject,
  selectedProjectIsLoaded,
  onChangeProjectTab,
  onDeleteProject,
  onUpdateProject,
}: {
  activeProjectTab: CustomerProjectTab
  selectedProject: CustomerProject | null
  selectedProjectIsLoaded: boolean
  onChangeProjectTab: (tab: CustomerProjectTab) => void
  onDeleteProject: (project: CustomerProject) => void
  onUpdateProject: (projectId: string, updater: (project: CustomerProject) => CustomerProject) => void
}) {
  if (selectedProject && selectedProjectIsLoaded) {
    return (
      <CustomerProjectDetail
        activeTab={activeProjectTab}
        project={selectedProject}
        onChangeTab={onChangeProjectTab}
        onDelete={() => onDeleteProject(selectedProject)}
        onUpdate={(updater) => onUpdateProject(selectedProject.id, updater)}
      />
    )
  }

  if (selectedProject) {
    return <EmptyState title="Caricamento progetto cliente" message="Sto recuperando dati progetto, variabili e accessi da Supabase." />
  }

  return <EmptyState title="Nessun progetto cliente" message="Crea un progetto cliente oppure selezionane uno dall'archivio." />
}
