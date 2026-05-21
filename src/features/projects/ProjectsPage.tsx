import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ClockArrowDown,
  FileText,
  Pin,
  Plus,
  Trash2,
} from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { EmptyState } from '../../components/EmptyState'
import { FieldGroup } from '../../components/FieldGroup'
import { MobileWorkspaceModal } from '../../components/MobileWorkspaceModal'
import { getNextPinnedRecordIds, readPinnedRecordIds, sortPinnedRecordIdsFirst, sortPinnedRecordsFirst, writePinnedRecordIds } from '../../lib/pinnedRecords'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport'
import type { Project, ProjectVariable } from '../../types/app'
import {
  buildProjectVariables,
  buildSheetFields,
  deployPasswordFieldKey,
  formatProjectUpdatedAt,
  getDeployAdminLink,
  getDeployLink,
  getFieldValue,
  normalizeProjectName,
  supabaseServiceKey,
} from './projectShared'
import { normalizeSelectableFieldValue } from './projectFieldOptions'
import { buildProjectImageSlots, getProjectImageSlotsSignature, type ProjectImageSlot } from './projectImageModel'
import { VariablesPanel } from './VariablesPanel'
import {
  createProjectRecord,
  deleteProjectRecord,
  fetchProjectById,
  fetchProjects,
  saveProjectSnapshot,
  type ProjectSnapshot,
} from './projectRepository'

const ProjectImagesPanel = lazy(() => import('./ProjectImagesPanel').then((module) => ({ default: module.ProjectImagesPanel })))

const projectTabs = ['Dati progetto', 'Variabili', 'Immagini', 'Note', 'Sync'] as const
const pinnedProjectIdsStorageKey = 'app-control-pinned-project-ids'
const legacyDefaultSyncPrompt =
  'Sincronizza questo progetto con App Control. Controlla se esiste `.agent/app-control.json`. Se esiste, usa `projectId` e `agentKey` per caricare da App Control le variabili autorizzate del progetto. Se non esiste, chiedimi la Agent Key e guidami nel collegamento del progetto. Poi genera o aggiorna `.env`, verifica che `.env` sia in `.gitignore`, integra nel codice solo le variabili necessarie, verifica la connessione Supabase senza esporre segreti, usa GitHub solo tramite `gh` o credenziali autorizzate, prima di commit o push chiedi conferma esplicita, e non stampare token, password, service role key o DB URL nei log o nella chat.'
const defaultSyncPrompt =
  'Sincronizza questo progetto con App Control. Controlla se esiste `.agent/app-control.json`. Se esiste, usa `projectId` e `agentKey` per collegare il progetto e leggere da App Control solo i dati canonici disponibili: Dati progetto (`Nome progetto`, `Mail accesso`, `Password`, `Sviluppo in`, `Accessi piattaforme`, `Deploy con`, `Password`) e Variabili (`LINK_DEPLOY`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`). Se non esiste, chiedimi la Agent Key e guidami nel collegamento del progetto. Analizza il codice reale del repository per capire quali variabili servono davvero. Se il progetto usa Vite o altre env client-side, deriva quando necessario `VITE_SUPABASE_URL` da `SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` da `SUPABASE_ANON_KEY`, senza aspettarti che siano salvate come campi separati in App Control. Se uno script, template o provider richiede `SUPABASE_DB_URL`, trattala come alias di `DATABASE_URL` e generala solo quando serve. Poi genera o aggiorna `.env`, verifica che `.env` sia in `.gitignore`, integra nel codice solo le variabili necessarie, verifica la connessione Supabase senza esporre segreti, usa GitHub solo tramite `gh` o credenziali autorizzate, prima di commit o push chiedi conferma esplicita, e non stampare token, password, service key o DB URL nei log o nella chat.'
type ProjectListSortMode = 'recent-desc' | 'name-asc' | 'name-desc'
type ProjectSaveState = 'idle' | 'saving' | 'saved' | 'error'

function getProjectDetailSignature({
  imageSlotsSignature,
  operationalNotes,
  sheetFields,
  variables,
}: {
  imageSlotsSignature: string
  operationalNotes: string
  sheetFields: ProjectVariable[]
  variables: ProjectVariable[]
}) {
  return JSON.stringify({
    imageSlotsSignature,
    operationalNotes,
    sheetFields: sheetFields.map(normalizeProjectVariableForSignature),
    variables: variables.map(normalizeProjectVariableForSignature),
  })
}

function normalizeProjectVariableForSignature(variable: ProjectVariable) {
  return {
    id: variable.id,
    key: variable.key,
    value: variable.value,
    sensitive: variable.sensitive,
    accessAccounts: (variable.accessAccounts ?? []).map((access) => ({
      id: access.id,
      platform: access.platform,
      email: access.email,
      password: access.password,
    })),
  }
}

function getSortedProjects(projects: Project[], query: string, sortMode: ProjectListSortMode, pinnedProjectIds: string[] = []) {
  const normalizedQuery = query.trim().toLowerCase()
  const matchingProjects = projects.filter(
    (project) =>
      !normalizedQuery ||
      project.name.toLowerCase().includes(normalizedQuery) ||
      project.developmentEnvironment.toLowerCase().includes(normalizedQuery) ||
      project.status.toLowerCase().includes(normalizedQuery),
  )

  if (sortMode === 'recent-desc') {
    const sortedProjects = [...matchingProjects].sort((firstProject, secondProject) => {
      const timeDiff = Date.parse(secondProject.updatedAt) - Date.parse(firstProject.updatedAt)
      return timeDiff
    })
    return sortPinnedRecordsFirst(sortedProjects, pinnedProjectIds)
  }

  const sortedProjects = [...matchingProjects].sort((firstProject, secondProject) => {
    const sortResult = firstProject.name.localeCompare(secondProject.name, 'it', { sensitivity: 'base' })
    return sortMode === 'name-asc' ? sortResult : -sortResult
  })
  return sortPinnedRecordsFirst(sortedProjects, pinnedProjectIds)
}

function getVisibleProjectIds(
  projects: Project[],
  query: string,
  sortMode: ProjectListSortMode,
  pinnedProjectIds: string[] = [],
  previousIds?: string[],
) {
  const nextCandidateIds = getSortedProjects(projects, query, sortMode, pinnedProjectIds).map((project) => project.id)
  if (!previousIds?.length) return nextCandidateIds

  const nextCandidateIdSet = new Set(nextCandidateIds)
  const preservedIds = previousIds.filter((projectId) => nextCandidateIdSet.has(projectId))
  const appendedIds = nextCandidateIds.filter((projectId) => !preservedIds.includes(projectId))
  return sortPinnedRecordsFirst([...preservedIds, ...appendedIds].map((id) => ({ id })), pinnedProjectIds).map((project) => project.id)
}

export function ProjectsPage() {
  const [projectList, setProjectList] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [expandedMobileId, setExpandedMobileId] = useState('')
  const [mobileModalProjectId, setMobileModalProjectId] = useState('')
  const [activeTab, setActiveTab] = useState<(typeof projectTabs)[number]>('Dati progetto')
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<ProjectListSortMode>('name-asc')
  const [deleteCandidate, setDeleteCandidate] = useState<Project | null>(null)
  const [loadError, setLoadError] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [visibleProjectIds, setVisibleProjectIds] = useState<string[]>([])
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
        setProjectList(projects)
        setPinnedProjectIds(storedPinnedProjectIds)
        setVisibleProjectIds(nextVisibleProjectIds)
        setSelectedId(nextVisibleProjectIds[0] ?? '')
        setExpandedMobileId('')
      } catch (error) {
        if (!isMounted) return
        setLoadError(error instanceof Error ? error.message : 'Errore caricamento progetti')
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

  const selectedProject = filteredProjects.find((project) => project.id === selectedId) ?? filteredProjects[0]
  const mobileModalProject = isMobileViewport ? projectList.find((project) => project.id === mobileModalProjectId) ?? null : null

  async function createProject() {
    const nextProject = createEmptyProject(projectList.length + 1)
    try {
      const project = isSupabaseConfigured ? await createProjectRecord(nextProject) : nextProject
      const nextProjects = [project, ...projectList]
      const nextQuery = ''
      setProjectList(nextProjects)
      setVisibleProjectIds(getVisibleProjectIds(nextProjects, nextQuery, sortMode, pinnedProjectIds))
      setSelectedId(project.id)
      setExpandedMobileId('')
      setActiveTab('Dati progetto')
      setQuery(nextQuery)
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Errore creazione progetto')
    }
  }

  async function deleteProject() {
    if (!deleteCandidate) return

    try {
      if (isSupabaseConfigured) {
        await deleteProjectRecord(deleteCandidate.id)
      }

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
    setProjectList((currentProjects) => {
      const nextProjects = currentProjects.map((project) => (project.id === refreshedProject.id ? refreshedProject : project))
      setVisibleProjectIds((currentIds) => getVisibleProjectIds(nextProjects, query, sortMode, pinnedProjectIds, currentIds))
      return nextProjects
    })
    setSelectedId(refreshedProject.id)
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

  const isAlphabeticalSortActive = sortMode === 'name-asc' || sortMode === 'name-desc'
  const isRecencySortActive = sortMode === 'recent-desc'
  const alphabeticalSortLabel = sortMode === 'name-desc' ? 'Ordina progetti Z-A' : 'Ordina progetti A-Z'
  const recencySortLabel = 'Ordina progetti dal piu recente al meno recente'

  return (
    <div className="page-stack projects-page">
      <div className="split-workspace">
        <aside className="index-panel">
          <div className="toolbar">
            <input
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value
                setQuery(nextQuery)
                setVisibleProjectIds(getVisibleProjectIds(projectList, nextQuery, sortMode, pinnedProjectIds))
              }}
              placeholder="Cerca.."
              aria-label="Cerca progetto"
            />
            <div className="toolbar__row">
              <div className="toolbar__icon-filters" aria-label="Ordinamento lista progetti">
                <button
                  type="button"
                  className={isAlphabeticalSortActive ? 'secondary-button icon-filter-button icon-filter-button--active' : 'secondary-button icon-filter-button'}
                  onClick={toggleAlphabeticalSort}
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
              <button type="button" className="secondary-button toolbar__primary-action" onClick={createProject}>
                <Plus aria-hidden="true" className="button-icon" />
                Nuovo progetto
              </button>
              <div className="toolbar__icon-filters" aria-label="Ordinamento lista progetti">
                <button
                  type="button"
                  className={isRecencySortActive ? 'secondary-button icon-filter-button icon-filter-button--active' : 'secondary-button icon-filter-button'}
                  onClick={toggleRecencySort}
                  aria-label={recencySortLabel}
                  title={recencySortLabel}
                >
                  <ClockArrowDown aria-hidden="true" className="button-icon" />
                </button>
              </div>
            </div>
          </div>

          <div className="record-list record-list--desktop" aria-label="Progetti">
            {filteredProjects.map((project) => {
              const isPinned = pinnedProjectIds.includes(project.id)
              return (
                <article
                  key={project.id}
                  className={[
                    'record-row',
                    project.id === selectedProject?.id ? 'record-row--active' : '',
                    isPinned ? 'record-row--pinned' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <button
                    type="button"
                    className="record-row__main"
                    onClick={() => {
                      setSelectedId(project.id)
                      setActiveTab('Dati progetto')
                    }}
                  >
                    <strong>{project.name}</strong>
                    <small>{`Ultima modifica: ${formatProjectUpdatedAt(project.updatedAt)}`}</small>
                  </button>
                  <button
                    type="button"
                    className={isPinned ? 'project-pin-button project-pin-button--active' : 'project-pin-button'}
                    aria-label={isPinned ? 'Rimuovi progetto fissato' : 'Fissa progetto in alto'}
                    aria-pressed={isPinned}
                    title={isPinned ? 'Rimuovi progetto fissato' : 'Fissa progetto in alto'}
                    onClick={() => togglePinnedProject(project.id)}
                  >
                    <Pin aria-hidden="true" className="button-icon" />
                  </button>
                </article>
              )
            })}
          </div>

          <div className="record-list record-list--mobile" aria-label="Progetti mobile">
            {filteredProjects.map((project) => {
              const isExpanded = project.id === expandedMobileId
              const isPinned = pinnedProjectIds.includes(project.id)
              const deployLink = getDeployLink(buildNormalizedSheetFields(project), project)
              const deployAdminLink = getDeployAdminLink(buildProjectVariables(project), deployLink)

              return (
                <article
                  key={project.id}
                  className={[
                    'mobile-project-card',
                    isExpanded ? 'mobile-project-card--active' : '',
                    isPinned ? 'mobile-project-card--pinned' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <button
                    type="button"
                    className={isPinned ? 'project-pin-button project-pin-button--active' : 'project-pin-button'}
                    aria-label={isPinned ? 'Rimuovi progetto fissato' : 'Fissa progetto in alto'}
                    aria-pressed={isPinned}
                    title={isPinned ? 'Rimuovi progetto fissato' : 'Fissa progetto in alto'}
                    onClick={() => togglePinnedProject(project.id)}
                  >
                    <Pin aria-hidden="true" className="button-icon" />
                  </button>
                  <button
                    type="button"
                    className="mobile-project-card__trigger"
                    onClick={() => {
                      setSelectedId(project.id)
                      setActiveTab('Dati progetto')
                      setExpandedMobileId((currentId) => (currentId === project.id ? '' : project.id))
                    }}
                  >
                    <strong>{project.name}</strong>
                    <small>{`Ultima modifica: ${formatProjectUpdatedAt(project.updatedAt)}`}</small>
                  </button>
                  {isExpanded ? (
                    <div className="mobile-project-card__links">
                      {deployLink ? (
                        <a className="mobile-project-card__link" href={deployLink} target="_blank" rel="noreferrer">
                          {deployLink}
                        </a>
                      ) : null}
                      {deployAdminLink ? (
                        <a className="mobile-project-card__link" href={deployAdminLink} target="_blank" rel="noreferrer">
                          {deployAdminLink}
                        </a>
                      ) : null}
                      <div className="mobile-project-card__actions">
                        <button
                          type="button"
                          className="secondary-button mobile-project-card__action"
                          onClick={() => {
                            setSelectedId(project.id)
                            setActiveTab('Dati progetto')
                            setMobileModalProjectId(project.id)
                          }}
                        >
                          <FileText aria-hidden="true" className="button-icon" />
                          Apri scheda progetto
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </aside>

        <section className="detail-panel">
          {selectedProject ? (
            <ProjectDetail
              key={selectedProject.id}
              activeTab={activeTab}
              onRequestDelete={() => setDeleteCandidate(selectedProject)}
              onSave={isSupabaseConfigured ? saveProject : undefined}
              onTabChange={setActiveTab}
              project={selectedProject}
            />
          ) : (
            <EmptyState
              title={isLoadingProjects ? 'Caricamento progetti' : 'Nessun progetto'}
              message={isLoadingProjects ? 'Lettura da Supabase in corso.' : 'Crea un progetto per iniziare.'}
            />
          )}
        </section>
      </div>

      {loadError ? <p className="status-message status-message--error">{loadError}</p> : null}

      {deleteCandidate ? (
        <ConfirmDeleteProjectModal project={deleteCandidate} onCancel={() => setDeleteCandidate(null)} onConfirm={deleteProject} />
      ) : null}

      {isMobileViewport && mobileModalProject ? (
        <MobileWorkspaceModal
          title={mobileModalProject.name}
          subtitle="Scheda progetto mobile"
          onClose={() => setMobileModalProjectId('')}
        >
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
        </MobileWorkspaceModal>
      ) : null}
    </div>
  )
}

function ProjectDetail({
  project,
  activeTab,
  mobileModal = false,
  onSave,
  onRequestDelete,
  onTabChange,
}: {
  project: Project
  activeTab: (typeof projectTabs)[number]
  mobileModal?: boolean
  onSave?: (snapshot: ProjectSnapshot) => Promise<void>
  onRequestDelete: () => void
  onTabChange: (tab: (typeof projectTabs)[number]) => void
}) {
  const [sheetFields, setSheetFields] = useState<ProjectVariable[]>(() => buildNormalizedSheetFields(project))
  const [variables, setVariables] = useState<ProjectVariable[]>(() => buildProjectVariables(project))
  const [imageSlots, setImageSlots] = useState<ProjectImageSlot[]>(() => buildProjectImageSlots(project.images))
  const [operationalNotes, setOperationalNotes] = useState(project.operationalNotes)
  const [saveState, setSaveState] = useState<ProjectSaveState>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const imageSlotsSignature = useMemo(() => getProjectImageSlotsSignature(imageSlots), [imageSlots])
  const detailSignature = useMemo(
    () => getProjectDetailSignature({ imageSlotsSignature, operationalNotes, sheetFields, variables }),
    [imageSlotsSignature, operationalNotes, sheetFields, variables],
  )
  const lastSavedSignatureRef = useRef(detailSignature)
  const saveContextRef = useRef({ onSave, project })
  const saveVersionRef = useRef(0)
  const projectTitle = getFieldValue(sheetFields, 'nome progetto') || project.name
  const deployLink = getDeployLink(sheetFields, project)
  const deployAdminLink = getDeployAdminLink(variables, deployLink)
  const createdAtLabel = formatProjectUpdatedAt(project.createdAt)

  useEffect(() => {
    saveContextRef.current = { onSave, project }
  }, [onSave, project])

  useEffect(() => {
    if (saveState !== 'saved') return

    const resetTimer = window.setTimeout(() => {
      setSaveState((currentState) => (currentState === 'saved' ? 'idle' : currentState))
      setSaveMessage((currentMessage) => (currentMessage === 'Salvataggio completato' ? '' : currentMessage))
    }, 1600)

    return () => window.clearTimeout(resetTimer)
  }, [saveState])

  useEffect(() => {
    if (detailSignature === lastSavedSignatureRef.current) return

    const currentSaveVersion = saveVersionRef.current + 1
    saveVersionRef.current = currentSaveVersion

    const saveTimer = window.setTimeout(() => {
      const { onSave: saveSnapshot, project: currentProject } = saveContextRef.current
      if (!saveSnapshot) return

      setSaveState('saving')
      setSaveMessage('Salvataggio in corso')

      void saveSnapshot({
        project: {
          ...currentProject,
          operationalNotes,
        },
        sheetFields,
        variables,
        images: imageSlots,
      })
        .then(() => {
          if (saveVersionRef.current !== currentSaveVersion) return
          lastSavedSignatureRef.current = detailSignature
          setSaveState('saved')
          setSaveMessage('Salvataggio completato')
        })
        .catch((error) => {
          if (saveVersionRef.current !== currentSaveVersion) return
          setSaveState('error')
          setSaveMessage(error instanceof Error ? error.message : 'Errore salvataggio progetto')
        })
    }, 650)

    return () => window.clearTimeout(saveTimer)
  }, [detailSignature, imageSlots, operationalNotes, sheetFields, variables])

  function handleImageSlotsChange(nextImageSlots: ProjectImageSlot[]) {
    setImageSlots(nextImageSlots)
  }

  const hasOperationalNotes = operationalNotes.trim().length > 0

  return (
    <div className={mobileModal ? 'detail-stack detail-stack--mobile-modal' : 'detail-stack'}>
      <div className="detail-heading">
        <div>
          <h2>{projectTitle}</h2>
          {deployLink ? (
            <div className="project-deploy-link">
              <a href={deployLink} target="_blank" rel="noreferrer">
                {deployLink}
              </a>
              <CopyButton value={deployLink} iconOnly />
            </div>
          ) : null}
          {deployAdminLink ? (
            <div className="project-deploy-link">
              <a href={deployAdminLink} target="_blank" rel="noreferrer">
                {deployAdminLink}
              </a>
              <CopyButton value={deployAdminLink} iconOnly />
            </div>
          ) : null}
          <p className="project-created-at">{`Data creazione: ${createdAtLabel}`}</p>
        </div>
        <div className="detail-heading__actions">
          <button type="button" className="danger-button" onClick={onRequestDelete}>
            <Trash2 aria-hidden="true" className="button-icon" />
            Elimina progetto
          </button>
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="Sezioni progetto">
        {projectTabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={[
              'tab-button',
              activeTab === tab ? 'tab-button--active' : '',
              tab === 'Note' && hasOperationalNotes ? 'tab-button--has-content' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {saveMessage ? (
        <p
          className={[
            'status-message',
            saveState === 'error' ? 'status-message--error' : '',
            saveState === 'saving' ? 'status-message--progress' : '',
            saveState === 'saved' ? 'status-message--success' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {saveMessage}
        </p>
      ) : null}

      <div className="tab-scroll-area">
        {activeTab === 'Dati progetto' ? (
          <VariablesPanel
            addLabel="Aggiungi campo"
            onChange={setSheetFields}
            title="Dati progetto"
            valueAriaLabel="Valore campo foglio"
            variables={sheetFields}
          />
        ) : null}
        {activeTab === 'Variabili' ? (
          <VariablesPanel
            addLabel="Aggiungi variabile"
            onChange={setVariables}
            title="Variabili"
            valueAriaLabel="Valore variabile"
            variables={variables}
          />
        ) : null}
        {activeTab === 'Immagini' ? (
          <Suspense fallback={<div className="status-message status-message--progress">Caricamento immagini</div>}>
            <ProjectImagesPanel slots={imageSlots} onChange={handleImageSlotsChange} />
          </Suspense>
        ) : null}
        {activeTab === 'Note' ? (
          <div className="notes-panel">
            <FieldGroup title="Note operative" className="field-group--bare">
              <textarea
                value={operationalNotes}
                rows={7}
                className="notes-panel-textarea"
                onChange={(event) => setOperationalNotes(event.target.value)}
              />
            </FieldGroup>
          </div>
        ) : null}
        {activeTab === 'Sync' ? <ProjectAgentPanel project={project} /> : null}
      </div>
    </div>
  )
}

function ConfirmDeleteProjectModal({
  project,
  onCancel,
  onConfirm,
}: {
  project: Project
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-project-title">
        <div>
          <h2 id="delete-project-title">Elimina progetto</h2>
          <p>
            Stai eliminando <strong>{project.name}</strong>. L'azione rimuove il progetto dalla sessione corrente.
          </p>
        </div>
        <div className="confirm-modal__actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            Elimina
          </button>
        </div>
      </div>
    </div>
  )
}

function createEmptyProject(index: number): Project {
  const name = normalizeProjectName(`Nuovo progetto ${index}`)
  const projectId = createProjectSlug(name)

  return {
    id: `project-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'Attivo',
    developmentEnvironment: 'Windsurf',
    githubRepoUrl: '',
    githubAccountEmail: '',
    linkedSecretLabel: '',
    supabase: {
      projectUrl: '',
      anonKeyLabel: '',
      serviceRoleLabel: '',
      databaseUrlLabel: '',
    },
    deploy: {
      provider: 'Render',
      url: '',
      accountEmail: '',
    },
    operationalNotes: '',
    agent: {
      projectId,
      agentKey: generateAgentKey(),
      syncPrompt: defaultSyncPrompt,
    },
    promptIds: [],
    assetIds: [],
    images: [],
    dataFields: [
      {
        id: `data-password-deploy-${Date.now()}`,
        key: deployPasswordFieldKey,
        value: '',
        sensitive: true,
      },
    ],
    env: [
      { key: 'SUPABASE_URL', value: '', scope: 'Supabase', sensitive: false },
      { key: 'SUPABASE_ANON_KEY', value: '', scope: 'Supabase', sensitive: true },
      { key: supabaseServiceKey, value: '', scope: 'Supabase', sensitive: true },
      { key: 'DATABASE_URL', value: '', scope: 'Supabase', sensitive: true },
      { key: 'GITHUB_TOKEN', value: '', scope: 'GitHub', sensitive: true },
    ],
  }
}

function createProjectSlug(name: string) {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalizedName || `progetto-${Date.now()}`
}

function generateAgentKey() {
  return Array.from({ length: 4 }, () => generateAgentKeyGroup()).join('-')
}

function generateAgentKeyGroup() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = new Uint32Array(5)
  crypto.getRandomValues(values)

  return Array.from(values, (value) => chars[value % chars.length]).join('')
}

export function ProjectAgentPanel({ project }: { project: Project }) {
  const agentConfig = formatAgentConfig(project)
  const syncPrompt = resolveSyncPrompt(project.agent.syncPrompt)

  return (
    <div className="agent-sync-panel">
      <FieldGroup title="Agent sync" className="field-group--bare">
        <div className="agent-sync-block">
          <div className="agent-sync-block__header">
            <span>Prompt sincronizzazione</span>
          </div>
          <div className="agent-sync-box">
            <div className="agent-sync-readonly" aria-label="Prompt sincronizzazione">
              {syncPrompt}
            </div>
            <CopyButton value={syncPrompt} className="copy-button--inside-panel" />
          </div>
        </div>

        <div className="agent-sync-block">
          <div className="agent-sync-block__header">
            <span>.agent/app-control.json</span>
          </div>
          <div className="agent-sync-box">
            <pre>{agentConfig}</pre>
            <CopyButton value={agentConfig} className="copy-button--inside-panel" />
          </div>
        </div>
      </FieldGroup>
    </div>
  )
}

function formatAgentConfig(project: Project) {
  return JSON.stringify(
    {
      projectId: project.agent.projectId,
      agentKey: project.agent.agentKey,
    },
    null,
    2,
  )
}

function buildNormalizedSheetFields(project: Project) {
  return buildSheetFields(project, normalizeSelectableFieldValue)
}

function resolveSyncPrompt(value: string) {
  const normalizedValue = value.trim()
  if (!normalizedValue || normalizedValue === legacyDefaultSyncPrompt) return defaultSyncPrompt
  return normalizedValue
}
