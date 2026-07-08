import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { NameProjectModal } from './NameProjectModal'
import { EmptyState } from '../../components/EmptyState'
import { MobileWorkspaceModal } from '../../components/MobileWorkspaceModal'
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport'
import { getNextPinnedRecordIds, readPinnedRecordIds, sortPinnedRecordIdsFirst, writePinnedRecordIds } from '../../lib/pinnedRecords'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { Project } from '../../types/app'
import { ProjectDetail } from './ProjectDetail'
import { ProjectIndexPanel } from './ProjectIndexPanel'
import {
  pinnedProjectIdsStorageKey,
  type ProjectListSortMode,
  type ProjectTab,
} from './projectPageConstants'
import { createEmptyProject, getSortedProjects, getVisibleProjectIds } from './projectPageModel'
import {
  createProjectRecord,
  deleteProjectRecord,
  fetchProjectById,
  fetchProjects,
  saveProjectSnapshot,
  type ProjectSnapshot,
} from './projectRepository'

export function ProjectsPage() {
  const [projectList, setProjectList] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [expandedMobileId, setExpandedMobileId] = useState('')
  const [mobileModalProjectId, setMobileModalProjectId] = useState('')
  const [activeTab, setActiveTab] = useState<ProjectTab>('Dati progetto')
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<ProjectListSortMode>('name-asc')
  const [deleteCandidate, setDeleteCandidate] = useState<Project | null>(null)
  const [isNamingProject, setIsNamingProject] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [visibleProjectIds, setVisibleProjectIds] = useState<string[]>([])
  const [loadedProjectIds, setLoadedProjectIds] = useState<Set<string>>(() => new Set())
  const [pinnedProjectIds, setPinnedProjectIds] = useState(() => readPinnedRecordIds(pinnedProjectIdsStorageKey))
  const isMobileViewport = useIsMobileViewport()

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let isMounted = true
    async function loadProjects() {
      await Promise.resolve()
      if (!isMounted) return

      setIsLoadingProjects(true)
      setLoadError('')
      try {
        const projects = await fetchProjects()
        if (!isMounted) return

        const storedPinnedProjectIds = readPinnedRecordIds(pinnedProjectIdsStorageKey)
        const nextVisibleProjectIds = getVisibleProjectIds(projects, '', 'name-asc', storedPinnedProjectIds)
        // Mantieni in cache i dettagli gia caricati (solo per i progetti ancora
        // presenti): evita il loader/flicker sul progetto auto-selezionato ad ogni
        // ricarica della lista. Per gli id gia caricati conserva l'oggetto completo
        // esistente invece di sostituirlo con la versione leggera.
        const nextProjectIds = new Set(projects.map((project) => project.id))
        setProjectList((currentProjects) => {
          const loadedById = new Map(
            currentProjects.filter((project) => nextProjectIds.has(project.id)).map((project) => [project.id, project]),
          )
          return projects.map((project) => loadedById.get(project.id) ?? project)
        })
        setLoadedProjectIds((currentLoadedIds) => new Set([...currentLoadedIds].filter((id) => nextProjectIds.has(id))))
        setPinnedProjectIds(storedPinnedProjectIds)
        setVisibleProjectIds(nextVisibleProjectIds)
        setSelectedId(nextVisibleProjectIds[0] ?? '')
        setExpandedMobileId('')
      } catch (error) {
        if (isMounted) setLoadError(error instanceof Error ? error.message : 'Errore caricamento progetti')
      } finally {
        if (isMounted) setIsLoadingProjects(false)
      }
    }

    void loadProjects()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredProjects = useMemo(() => {
    const candidateProjects = getSortedProjects(projectList, query, sortMode, pinnedProjectIds)
    const candidateProjectMap = new Map(candidateProjects.map((project) => [project.id, project]))
    return visibleProjectIds
      .map((projectId) => candidateProjectMap.get(projectId))
      .filter((project): project is Project => Boolean(project))
  }, [pinnedProjectIds, projectList, query, sortMode, visibleProjectIds])

  const effectiveSelectedId = filteredProjects.some((project) => project.id === selectedId)
    ? selectedId
    : filteredProjects[0]?.id ?? ''
  const selectedProject = filteredProjects.find((project) => project.id === effectiveSelectedId) ?? null
  const selectedProjectIsLoaded = selectedProject ? loadedProjectIds.has(selectedProject.id) : false
  const mobileModalProject = isMobileViewport ? projectList.find((project) => project.id === mobileModalProjectId) ?? null : null
  const mobileModalProjectIsLoaded = mobileModalProject ? loadedProjectIds.has(mobileModalProject.id) : false

  useEffect(() => {
    if (!isSupabaseConfigured || !effectiveSelectedId || loadedProjectIds.has(effectiveSelectedId)) return

    let isCancelled = false
    fetchProjectById(effectiveSelectedId)
      .then((project) => {
        if (isCancelled) return
        setProjectList((currentProjects) => currentProjects.map((currentProject) => (currentProject.id === project.id ? project : currentProject)))
        setLoadedProjectIds((currentIds) => new Set(currentIds).add(project.id))
        setLoadError('')
      })
      .catch((error) => {
        if (!isCancelled) setLoadError(error instanceof Error ? error.message : 'Errore caricamento dettaglio progetto')
      })

    return () => {
      isCancelled = true
    }
  }, [effectiveSelectedId, loadedProjectIds])

  async function createProject(name: string) {
    setIsNamingProject(false)
    const nextProject = createEmptyProject(name)
    try {
      const project = isSupabaseConfigured ? await createProjectRecord(nextProject) : nextProject
      const nextProjects = [project, ...projectList]
      setProjectList(nextProjects)
      setLoadedProjectIds((currentIds) => new Set(currentIds).add(project.id))
      setVisibleProjectIds(getVisibleProjectIds(nextProjects, '', sortMode, pinnedProjectIds))
      setSelectedId(project.id)
      setExpandedMobileId('')
      setActiveTab('Dati progetto')
      setQuery('')
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Errore creazione progetto')
    }
  }

  async function deleteProject() {
    if (!deleteCandidate) return

    try {
      if (isSupabaseConfigured) await deleteProjectRecord(deleteCandidate.id)

      const remainingProjects = projectList.filter((project) => project.id !== deleteCandidate.id)
      const remainingPinnedProjectIds = pinnedProjectIds.filter((projectId) => projectId !== deleteCandidate.id)
      const nextVisibleProjectIds = getVisibleProjectIds(remainingProjects, query, sortMode, remainingPinnedProjectIds)
      setProjectList(remainingProjects)
      setPinnedProjectIds(remainingPinnedProjectIds)
      writePinnedRecordIds(pinnedProjectIdsStorageKey, remainingPinnedProjectIds)
      setVisibleProjectIds(nextVisibleProjectIds)
      setSelectedId(nextVisibleProjectIds[0] ?? '')
      setExpandedMobileId((currentExpandedId) => (currentExpandedId === deleteCandidate.id ? '' : currentExpandedId))
      setActiveTab('Dati progetto')
      setDeleteCandidate(null)
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Errore eliminazione progetto')
    }
  }

  async function saveProject(snapshot: ProjectSnapshot) {
    if (!isSupabaseConfigured) return

    await saveProjectSnapshot(snapshot)
    const refreshedProject = await fetchProjectById(snapshot.project.id)
    setLoadedProjectIds((currentIds) => new Set(currentIds).add(refreshedProject.id))
    setProjectList((currentProjects) => {
      const nextProjects = currentProjects.map((project) => (project.id === refreshedProject.id ? refreshedProject : project))
      setVisibleProjectIds((currentIds) => getVisibleProjectIds(nextProjects, query, sortMode, pinnedProjectIds, currentIds))
      return nextProjects
    })
    setSelectedId(refreshedProject.id)
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery)
    setVisibleProjectIds(getVisibleProjectIds(projectList, nextQuery, sortMode, pinnedProjectIds))
  }

  function handleSelectProject(projectId: string, tab: ProjectTab = 'Dati progetto') {
    setSelectedId(projectId)
    setActiveTab(tab)
    setExpandedMobileId((currentId) => (currentId === projectId ? '' : projectId))
  }

  function togglePinnedProject(projectId: string) {
    setPinnedProjectIds((currentPinnedProjectIds) => {
      const nextPinnedProjectIds = getNextPinnedRecordIds(currentPinnedProjectIds, projectId)
      writePinnedRecordIds(pinnedProjectIdsStorageKey, nextPinnedProjectIds)
      setVisibleProjectIds((currentVisibleProjectIds) =>
        currentVisibleProjectIds.length
          ? sortPinnedRecordIdsFirst(currentVisibleProjectIds, nextPinnedProjectIds)
          : getVisibleProjectIds(projectList, query, sortMode, nextPinnedProjectIds),
      )
      return nextPinnedProjectIds
    })
  }

  function toggleAlphabeticalSort() {
    setSortMode((currentSortMode) => {
      const nextSortMode = currentSortMode === 'name-asc' ? 'name-desc' : 'name-asc'
      setVisibleProjectIds(getVisibleProjectIds(projectList, query, nextSortMode, pinnedProjectIds))
      return nextSortMode
    })
  }

  function toggleRecencySort() {
    setSortMode('recent-desc')
    setVisibleProjectIds(getVisibleProjectIds(projectList, query, 'recent-desc', pinnedProjectIds))
  }

  return (
    <div className="page-stack projects-page">
      <div className="split-workspace">
        <ProjectIndexPanel
          expandedMobileId={expandedMobileId}
          filteredProjects={filteredProjects}
          pinnedProjectIds={pinnedProjectIds}
          query={query}
          selectedProjectId={selectedProject?.id ?? ''}
          sortMode={sortMode}
          onChangeQuery={handleQueryChange}
          onCreateProject={() => setIsNamingProject(true)}
          onOpenMobileProject={(projectId) => {
            handleSelectProject(projectId)
            setMobileModalProjectId(projectId)
          }}
          onSelectProject={handleSelectProject}
          onToggleAlphabeticalSort={toggleAlphabeticalSort}
          onTogglePinnedProject={togglePinnedProject}
          onToggleRecencySort={toggleRecencySort}
        />
        <section className="detail-panel">
          <ProjectDetailSlot
            activeTab={activeTab}
            isLoadingProjects={isLoadingProjects}
            selectedProject={selectedProject}
            selectedProjectIsLoaded={selectedProjectIsLoaded}
            onRequestDelete={setDeleteCandidate}
            onSave={isSupabaseConfigured ? saveProject : undefined}
            onTabChange={setActiveTab}
          />
        </section>
      </div>

      {loadError ? <p className="status-message status-message--error">{loadError}</p> : null}
      {isNamingProject ? (
        <NameProjectModal onCancel={() => setIsNamingProject(false)} onConfirm={(name) => void createProject(name)} />
      ) : null}

      {deleteCandidate ? (
        <ConfirmDialog
          title="Elimina progetto"
          description={`Stai eliminando ${deleteCandidate.name}. L'azione rimuove il progetto dalla sessione corrente.`}
          confirmLabel="Elimina"
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => void deleteProject()}
        />
      ) : null}
      {isMobileViewport && mobileModalProject ? (
        <MobileWorkspaceModal title={mobileModalProject.name} subtitle="Scheda progetto mobile" onClose={() => setMobileModalProjectId('')}>
          {mobileModalProjectIsLoaded ? (
            <ProjectDetail
              key={mobileModalProject.id}
              activeTab={activeTab}
              mobileModal
              onRequestDelete={() => {
                setMobileModalProjectId('')
                setDeleteCandidate(mobileModalProject)
              }}
              onSave={isSupabaseConfigured ? saveProject : undefined}
              onTabChange={setActiveTab}
              project={mobileModalProject}
            />
          ) : (
            <EmptyState title="Caricamento progetto" message="Sto recuperando il dettaglio completo da Supabase." />
          )}
        </MobileWorkspaceModal>
      ) : null}
    </div>
  )
}

function ProjectDetailSlot({
  activeTab,
  isLoadingProjects,
  selectedProject,
  selectedProjectIsLoaded,
  onRequestDelete,
  onSave,
  onTabChange,
}: {
  activeTab: ProjectTab
  isLoadingProjects: boolean
  selectedProject: Project | null
  selectedProjectIsLoaded: boolean
  onRequestDelete: (project: Project) => void
  onSave?: (snapshot: ProjectSnapshot) => Promise<void>
  onTabChange: (tab: ProjectTab) => void
}) {
  if (selectedProject && selectedProjectIsLoaded) {
    return (
      <ProjectDetail
        key={selectedProject.id}
        activeTab={activeTab}
        onRequestDelete={() => onRequestDelete(selectedProject)}
        onSave={onSave}
        onTabChange={onTabChange}
        project={selectedProject}
      />
    )
  }

  if (selectedProject) {
    return <EmptyState title="Caricamento progetto" message="Sto recuperando dati, variabili e immagini da Supabase." />
  }

  return (
    <EmptyState
      title={isLoadingProjects ? 'Caricamento progetti' : 'Nessun progetto'}
      message={isLoadingProjects ? 'Lettura da Supabase in corso.' : 'Crea un progetto per iniziare.'}
    />
  )
}
