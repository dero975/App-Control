import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Check,
  ClockArrowDown,
  ClockArrowUp,
  Copy,
  Download,
  FileText,
  Pipette,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { EmptyState } from '../../components/EmptyState'
import { FieldGroup } from '../../components/FieldGroup'
import { MobileWorkspaceModal } from '../../components/MobileWorkspaceModal'
import { copyToClipboard } from '../../lib/clipboard'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport'
import type { PlatformAccess, Project, ProjectImage, ProjectVariable } from '../../types/app'
import {
  buildDefaultDeployAdminLink,
  buildProjectVariables,
  buildSheetFields,
  deployAdminLinkKey,
  deployPasswordFieldKey,
  formatProjectUpdatedAt,
  getDeployAdminLink,
  getDeployLink,
  getFieldValue,
  getProjectPreviewMeta,
  isDeployPasswordField,
  supabaseServiceKey,
  supabaseServiceKeyAliases,
} from './projectShared'
import {
  createProjectRecord,
  deleteProjectRecord,
  fetchProjectById,
  fetchProjects,
  saveProjectSnapshot,
  type ProjectSnapshot,
} from './projectRepository'

type ProjectImageSlot = {
  id: string
  name: string
  fileName: string
  mimeType: string
  dataUrl: string
  sizeBytes: number
  originalSizeBytes: number
}

const projectTabs = ['Dati progetto', 'Variabili', 'Immagini', 'Note', 'Sync'] as const
type SelectableFieldConfig = {
  options: readonly string[]
  promptLabel: string
  fallback: string
}

const selectableFieldConfigs: Record<string, SelectableFieldConfig> = {
  'sviluppo in': {
    options: ['Windsurf', 'Replit'],
    promptLabel: 'Nuovo ambiente di sviluppo',
    fallback: 'Windsurf',
  },
  'deploy con': {
    options: ['Render', 'CloudeFlare'],
    promptLabel: 'Nuovo provider deploy',
    fallback: 'Render',
  },
}
const addSelectOptionValue = '__add_option__'
const defaultProjectImageSlots = [
  { id: 'logo-app', name: 'Logo app' },
  { id: 'logo-app-2', name: 'Logo app 2' },
  { id: 'logo-app-3', name: 'Logo app 3' },
  { id: 'home-icon', name: 'Icona Schermata Home' },
  { id: 'browser-tab-icon', name: 'Icona Tab Browser (favicon)' },
] as const
const homeIconSlotId = 'home-icon'
const browserTabIconSlotId = 'browser-tab-icon'
const homeIconEditorSize = 512
const homeIconCornerRadius = 110
const gradientModeOptions = [
  { id: 'linear', label: 'Lineare' },
  { id: 'radial', label: 'Radiale' },
  { id: 'soft', label: 'Morbida' },
] as const
const defaultHomeIconBackgroundColor = '#ffffff'
const defaultHomeIconGradientColor = '#ffffff'
const maxImageBytes = 500 * 1024
const maxImageEdge = 1200
const legacyDefaultSyncPrompt =
  'Sincronizza questo progetto con App Control. Controlla se esiste `.agent/app-control.json`. Se esiste, usa `projectId` e `agentKey` per caricare da App Control le variabili autorizzate del progetto. Se non esiste, chiedimi la Agent Key e guidami nel collegamento del progetto. Poi genera o aggiorna `.env`, verifica che `.env` sia in `.gitignore`, integra nel codice solo le variabili necessarie, verifica la connessione Supabase senza esporre segreti, usa GitHub solo tramite `gh` o credenziali autorizzate, prima di commit o push chiedi conferma esplicita, e non stampare token, password, service role key o DB URL nei log o nella chat.'
const defaultSyncPrompt =
  'Sincronizza questo progetto con App Control. Controlla se esiste `.agent/app-control.json`. Se esiste, usa `projectId` e `agentKey` per collegare il progetto e leggere da App Control solo i dati canonici disponibili: Dati progetto (`Nome progetto`, `Mail accesso`, `Password`, `Sviluppo in`, `Accessi piattaforme`, `Deploy con`, `Password`) e Variabili (`LINK_DEPLOY`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`). Se non esiste, chiedimi la Agent Key e guidami nel collegamento del progetto. Analizza il codice reale del repository per capire quali variabili servono davvero. Se il progetto usa Vite o altre env client-side, deriva quando necessario `VITE_SUPABASE_URL` da `SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` da `SUPABASE_ANON_KEY`, senza aspettarti che siano salvate come campi separati in App Control. Se uno script, template o provider richiede `SUPABASE_DB_URL`, trattala come alias di `DATABASE_URL` e generala solo quando serve. Poi genera o aggiorna `.env`, verifica che `.env` sia in `.gitignore`, integra nel codice solo le variabili necessarie, verifica la connessione Supabase senza esporre segreti, usa GitHub solo tramite `gh` o credenziali autorizzate, prima di commit o push chiedi conferma esplicita, e non stampare token, password, service key o DB URL nei log o nella chat.'
const imageIntegrationPromptBySlotId: Record<string, string> = {
  [homeIconSlotId]:
    'Cerca nel progetto il file con nome esatto `icona schermata home.webp`. Usalo come sorgente da ottimizzare e integrare correttamente come icona schermata Home/PWA dell’app. Se per una corretta integrazione servono formati o dimensioni diverse, genera gli asset finali appropriati partendo da questo file, aggiorna i riferimenti necessari nel progetto, assicurati che il risultato finale sia leggero, ottimizzato e adatto a mantenere l’app fluida e veloce anche su dispositivi poco potenti, poi elimina il file originario non ottimizzato lasciando nel progetto solo gli asset finali effettivamente usati.',
  [browserTabIconSlotId]:
    'Cerca nel progetto il file con nome esatto `icona Tab Browser.webp`. Usalo come sorgente da ottimizzare e integrare correttamente come icona della tab del browser/favicons dell’app. Se per compatibilita browser servono formati o dimensioni diverse, genera gli asset finali appropriati partendo da questo file, aggiorna i riferimenti necessari nel progetto, assicurati che il risultato finale sia leggero, ottimizzato e adatto a mantenere l’app fluida e veloce anche su dispositivi poco potenti, poi elimina il file originario non ottimizzato lasciando nel progetto solo gli asset finali effettivamente usati.',
}
type ProjectListSortMode = 'recent-desc' | 'recent-asc' | 'name-asc' | 'name-desc'
type ProjectSaveState = 'idle' | 'saving' | 'saved' | 'error'

function getSortedProjects(projects: Project[], query: string, sortMode: ProjectListSortMode) {
  const normalizedQuery = query.trim().toLowerCase()
  const matchingProjects = projects.filter(
    (project) =>
      !normalizedQuery ||
      project.name.toLowerCase().includes(normalizedQuery) ||
      project.developmentEnvironment.toLowerCase().includes(normalizedQuery) ||
      project.status.toLowerCase().includes(normalizedQuery),
  )

  if (sortMode === 'recent-desc' || sortMode === 'recent-asc') {
    return [...matchingProjects].sort((firstProject, secondProject) => {
      const timeDiff = Date.parse(secondProject.updatedAt) - Date.parse(firstProject.updatedAt)
      return sortMode === 'recent-desc' ? timeDiff : -timeDiff
    })
  }

  return [...matchingProjects].sort((firstProject, secondProject) => {
    const sortResult = firstProject.name.localeCompare(secondProject.name, 'it', { sensitivity: 'base' })
    return sortMode === 'name-asc' ? sortResult : -sortResult
  })
}

function getVisibleProjectIds(
  projects: Project[],
  query: string,
  sortMode: ProjectListSortMode,
  previousIds?: string[],
) {
  const nextCandidateIds = getSortedProjects(projects, query, sortMode).map((project) => project.id)
  if (!previousIds?.length) return nextCandidateIds

  const nextCandidateIdSet = new Set(nextCandidateIds)
  const preservedIds = previousIds.filter((projectId) => nextCandidateIdSet.has(projectId))
  const appendedIds = nextCandidateIds.filter((projectId) => !preservedIds.includes(projectId))
  return [...preservedIds, ...appendedIds]
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
        setProjectList(projects)
        setVisibleProjectIds(getVisibleProjectIds(projects, '', 'name-asc'))
        setSelectedId(projects[0]?.id ?? '')
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
    const candidateProjects = getSortedProjects(projectList, query, sortMode)
    const candidateProjectMap = new Map(candidateProjects.map((project) => [project.id, project]))
    return visibleProjectIds
      .map((projectId) => candidateProjectMap.get(projectId))
      .filter((project): project is Project => Boolean(project))
  }, [projectList, query, sortMode, visibleProjectIds])

  const selectedProject = filteredProjects.find((project) => project.id === selectedId) ?? filteredProjects[0]
  const mobileModalProject = isMobileViewport ? projectList.find((project) => project.id === mobileModalProjectId) ?? null : null

  async function createProject() {
    const nextProject = createEmptyProject(projectList.length + 1)
    try {
      const project = isSupabaseConfigured ? await createProjectRecord(nextProject) : nextProject
      const nextProjects = [project, ...projectList]
      const nextQuery = ''
      setProjectList(nextProjects)
      setVisibleProjectIds(getVisibleProjectIds(nextProjects, nextQuery, sortMode))
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
      setProjectList(remainingProjects)
      setVisibleProjectIds(getVisibleProjectIds(remainingProjects, query, sortMode))
      setSelectedId(remainingProjects[0]?.id ?? '')
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
      setVisibleProjectIds((currentIds) => getVisibleProjectIds(nextProjects, query, sortMode, currentIds))
      return nextProjects
    })
    setSelectedId(refreshedProject.id)
  }

  function toggleAlphabeticalSort() {
    setSortMode((currentSortMode) => {
      const nextSortMode = currentSortMode === 'name-asc' ? 'name-desc' : 'name-asc'
      setVisibleProjectIds(getVisibleProjectIds(projectList, query, nextSortMode))
      return nextSortMode
    })
  }

  function toggleRecencySort() {
    setSortMode((currentSortMode) => {
      const nextSortMode = currentSortMode === 'recent-asc' ? 'recent-desc' : 'recent-asc'
      setVisibleProjectIds(getVisibleProjectIds(projectList, query, nextSortMode))
      return nextSortMode
    })
  }

  const isAlphabeticalSortActive = sortMode === 'name-asc' || sortMode === 'name-desc'
  const isRecencySortActive = sortMode === 'recent-asc' || sortMode === 'recent-desc'
  const alphabeticalSortLabel = sortMode === 'name-desc' ? 'Ordina progetti Z-A' : 'Ordina progetti A-Z'
  const recencySortLabel =
    sortMode === 'recent-asc' ? 'Ordina progetti dal meno recente al piu recente' : 'Ordina progetti dal piu recente al meno recente'

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
                setVisibleProjectIds(getVisibleProjectIds(projectList, nextQuery, sortMode))
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
                  {sortMode === 'recent-asc' ? (
                    <ClockArrowUp aria-hidden="true" className="button-icon" />
                  ) : (
                    <ClockArrowDown aria-hidden="true" className="button-icon" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="record-list record-list--desktop" aria-label="Progetti">
            {filteredProjects.map((project) => (
              <button
                type="button"
                key={project.id}
                className={project.id === selectedProject?.id ? 'record-row record-row--active' : 'record-row'}
                onClick={() => {
                  setSelectedId(project.id)
                  setActiveTab('Dati progetto')
                }}
              >
                <strong>{project.name}</strong>
                <small>{`Ultima modifica: ${formatProjectUpdatedAt(project.updatedAt)}`}</small>
                <small>{getProjectPreviewMeta(project, normalizeSelectableFieldValue)}</small>
              </button>
            ))}
          </div>

          <div className="record-list record-list--mobile" aria-label="Progetti mobile">
            {filteredProjects.map((project) => {
              const isExpanded = project.id === expandedMobileId
              const deployLink = getDeployLink(buildNormalizedSheetFields(project), project)
              const deployAdminLink = getDeployAdminLink(buildProjectVariables(project), deployLink)

              return (
                <article
                  key={project.id}
                  className={isExpanded ? 'mobile-project-card mobile-project-card--active' : 'mobile-project-card'}
                >
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
  const didMountRef = useRef(false)
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
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

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
  }, [imageSlots, operationalNotes, sheetFields, variables])

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
        {activeTab === 'Immagini' ? <ProjectImagesPanel slots={imageSlots} onChange={handleImageSlotsChange} /> : null}
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

export function VariablesPanel({
  addLabel,
  variables,
  onChange,
  title,
  valueAriaLabel,
}: {
  addLabel: string
  variables: ProjectVariable[]
  onChange: (variables: ProjectVariable[]) => void
  title: string
  valueAriaLabel: string
}) {
  const [envBlockCopied, setEnvBlockCopied] = useState(false)

  useEffect(() => {
    if (!envBlockCopied) return

    const timeout = window.setTimeout(() => setEnvBlockCopied(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [envBlockCopied])

  function updateVariable(id: string, field: 'key' | 'value' | 'sensitive', value: string | boolean) {
    const currentVariables = variables
    const targetVariable = currentVariables.find((variable) => variable.id === id)

    if (targetVariable && field === 'value' && isLinkDeployField(targetVariable.key)) {
      const currentAdminVariable = currentVariables.find((variable) => isLinkDeployAdminField(variable.key))
      const currentAutoAdminValue = buildDefaultDeployAdminLink(targetVariable.value)
      const nextDeployValue = String(value)
      const nextAutoAdminValue = buildDefaultDeployAdminLink(nextDeployValue)

      onChange(
        currentVariables.map((variable) => {
          if (variable.id === id) return { ...variable, value: nextDeployValue }
          if (!currentAdminVariable || variable.id !== currentAdminVariable.id) return variable
          if (currentAdminVariable.value && currentAdminVariable.value !== currentAutoAdminValue) return variable
          return { ...variable, value: nextAutoAdminValue }
        }),
      )
      return
    }

    onChange(currentVariables.map((variable) => (variable.id === id ? { ...variable, [field]: value } : variable)))
  }

  function updatePlatformAccess(variableId: string, accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) {
    onChange(
      variables.map((variable) =>
        variable.id === variableId
          ? {
              ...variable,
              accessAccounts: (variable.accessAccounts ?? []).map((access) =>
                access.id === accessId ? { ...access, [field]: value } : access,
              ),
            }
          : variable,
      ),
    )
  }

  function addPlatformAccess(variableId: string) {
    onChange(
      variables.map((variable) => {
        if (variable.id !== variableId) return variable

        return {
          ...variable,
          accessAccounts: [
            ...(variable.accessAccounts ?? []),
            {
              id: `access-${Date.now()}`,
              platform: getSelectValue(variable.value, selectableFieldConfigs['sviluppo in']),
              email: '',
              password: '',
            },
          ],
        }
      }),
    )
  }

  function deletePlatformAccess(variableId: string, accessId: string) {
    onChange(
      variables.map((variable) =>
        variable.id === variableId
          ? { ...variable, accessAccounts: (variable.accessAccounts ?? []).filter((access) => access.id !== accessId) }
          : variable,
      ),
    )
  }

  function deleteVariable(id: string) {
    onChange(variables.filter((variable) => variable.id !== id))
  }

  function addVariable() {
    onChange([
      ...variables,
      {
        id: `variable-${Date.now()}`,
        key: '',
        value: '',
        sensitive: true,
      },
    ])
  }

  async function copyEnvBlock() {
    const envBlock = formatVariablesEnvForCopy(variables)
    if (!envBlock) return

    await copyToClipboard(envBlock)
    setEnvBlockCopied(true)
  }

  const envBlock = formatVariablesEnvForCopy(variables)
  const isVariablesPanel = title === 'Variabili'
  const isBarePanel = title === 'Dati progetto' || title === 'Variabili'
  const githubEmailIndex = variables.findIndex((variable) => isGithubEmailField(variable.key))
  const githubPasswordIndex = variables.findIndex((variable) => isGithubPasswordField(variable.key))
  const hasGroupedGithubCredentials = title === 'Dati progetto' && githubEmailIndex !== -1 && githubPasswordIndex !== -1
  const githubCredentialsStartIndex = hasGroupedGithubCredentials ? Math.min(githubEmailIndex, githubPasswordIndex) : -1
  const githubCredentialsEndIndex = hasGroupedGithubCredentials ? Math.max(githubEmailIndex, githubPasswordIndex) : -1
  const deployIndex = variables.findIndex((variable) => isDeployField(variable.key))
  const deployPasswordIndex =
    deployIndex === -1 ? -1 : variables.findIndex((variable, index) => index > deployIndex && isDeployPasswordField(variable.key))
  const hasGroupedDeployCredentials = title === 'Dati progetto' && deployIndex !== -1 && deployPasswordIndex !== -1
  const deployCredentialsStartIndex = hasGroupedDeployCredentials ? Math.min(deployIndex, deployPasswordIndex) : -1
  const deployCredentialsEndIndex = hasGroupedDeployCredentials ? Math.max(deployIndex, deployPasswordIndex) : -1
  const linkDeployIndex = variables.findIndex((variable) => isLinkDeployField(variable.key))
  const linkDeployAdminIndex =
    linkDeployIndex === -1 ? -1 : variables.findIndex((variable, index) => index > linkDeployIndex && isLinkDeployAdminField(variable.key))
  const hasGroupedDeployLinks = title === 'Variabili' && linkDeployIndex !== -1 && linkDeployAdminIndex !== -1
  const deployLinksStartIndex = hasGroupedDeployLinks ? Math.min(linkDeployIndex, linkDeployAdminIndex) : -1
  const deployLinksEndIndex = hasGroupedDeployLinks ? Math.max(linkDeployIndex, linkDeployAdminIndex) : -1

  return (
    <div className="tab-panel-stack">
      <FieldGroup
        className={isBarePanel ? 'field-group--bare' : ''}
        title={isBarePanel ? undefined : title}
        action={
          <div className="field-group-action-row">
            {isVariablesPanel ? (
              <button
                type="button"
                className="secondary-button secondary-button--compact"
                disabled={!envBlock}
                onClick={copyEnvBlock}
                title="Copia tutte le variabili in formato .env"
              >
                <FileText aria-hidden="true" className="button-icon" />
                {envBlockCopied ? 'Copiato' : '.env render'}
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={addVariable}>
              <Plus aria-hidden="true" className="button-icon" />
              {addLabel}
            </button>
          </div>
        }
      >
        <div className="editable-variable-list">
          {variables.map((variable, index) => {
            if (hasGroupedGithubCredentials && index === githubCredentialsStartIndex) {
              return (
                <GitHubCredentialsCard
                  key="github-credentials"
                  emailVariable={variables[githubEmailIndex]}
                  passwordVariable={variables[githubPasswordIndex]}
                  onDelete={deleteVariable}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedDeployLinks && index === deployLinksStartIndex) {
              return (
                <DeployLinksCard
                  key="deploy-links"
                  deployLinkVariable={variables[linkDeployIndex]}
                  deployAdminLinkVariable={variables[linkDeployAdminIndex]}
                  onDelete={deleteVariable}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedDeployCredentials && index === deployCredentialsStartIndex) {
              return (
                <DeployCredentialsCard
                  key="deploy-credentials"
                  deployVariable={variables[deployIndex]}
                  passwordVariable={variables[deployPasswordIndex]}
                  onDelete={deleteVariable}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedGithubCredentials && index === githubCredentialsEndIndex) {
              return null
            }

            if (hasGroupedDeployLinks && index === deployLinksEndIndex) {
              return null
            }

            if (hasGroupedDeployCredentials && index === deployCredentialsEndIndex) {
              return null
            }

            return (
              <VariableEditorCard
                key={variable.id}
                variable={variable}
                onAddAccess={addPlatformAccess}
                onDelete={deleteVariable}
                onDeleteAccess={deletePlatformAccess}
                onUpdateAccess={updatePlatformAccess}
                onUpdate={updateVariable}
                valueAriaLabel={valueAriaLabel}
              />
            )
          })}
        </div>
      </FieldGroup>
    </div>
  )
}

function DeployCredentialsCard({
  deployVariable,
  passwordVariable,
  onDelete,
  onUpdate,
  valueAriaLabel,
}: {
  deployVariable: ProjectVariable
  passwordVariable: ProjectVariable
  onDelete: (id: string) => void
  onUpdate: (id: string, field: 'key' | 'value' | 'sensitive', value: string | boolean) => void
  valueAriaLabel: string
}) {
  const selectFieldConfig = getSelectableFieldConfig(deployVariable.key)
  const selectValue = selectFieldConfig ? getSelectValue(deployVariable.value, selectFieldConfig) : deployVariable.value
  const selectOptions = selectFieldConfig ? getSelectOptions(selectValue, selectFieldConfig.options) : []

  function addSelectOption() {
    if (!selectFieldConfig) return

    const nextValue = window.prompt(selectFieldConfig.promptLabel)
    const normalizedValue = nextValue?.trim()
    if (!normalizedValue) return

    onUpdate(deployVariable.id, 'value', normalizedValue)
  }

  function handleSelectChange(value: string) {
    if (value === addSelectOptionValue) {
      addSelectOption()
      return
    }

    onUpdate(deployVariable.id, 'value', value)
  }

  return (
    <article className="editable-variable-card editable-variable-card--grouped editable-variable-card--deploy">
      <div className="grouped-variable-stack">
        <div className="grouped-card-title grouped-card-title--deploy">Deploy con</div>
        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name fixed-field-name--hidden" aria-hidden="true">
              {deployVariable.key}
            </span>
            {selectFieldConfig ? (
              <div className="variable-select-row">
                <select value={selectValue} onChange={(event) => handleSelectChange(event.target.value)}>
                  {selectOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                  <option value={addSelectOptionValue}>+ Aggiungi</option>
                </select>
              </div>
            ) : null}
          </label>
          <button
            type="button"
            className="inline-icon-button trash-button"
            onClick={() => onDelete(deployVariable.id)}
            aria-label="Elimina deploy con"
            title="Elimina deploy con"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>

        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">Password</span>
            <input
              value={passwordVariable.value}
              type="text"
              onChange={(event) => onUpdate(passwordVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={passwordVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <button
            type="button"
            className="inline-icon-button trash-button"
            onClick={() => onDelete(passwordVariable.id)}
            aria-label="Elimina Password deploy"
            title="Elimina Password deploy"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

function formatVariablesEnvForCopy(variables: ProjectVariable[]) {
  const exportableVariables = variables
    .map((variable) => {
      const originalKey = variable.key.trim()
      const exportKey = normalizeEnvKey(originalKey)
      if (!originalKey || !exportKey) return null

      return {
        exportKey,
        value: variable.value.trim(),
      }
    })
    .filter((variable): variable is NonNullable<typeof variable> => Boolean(variable))

  if (!exportableVariables.length) return ''

  return exportableVariables
    .map((variable) => `${variable.exportKey}=${formatEnvValue(normalizeEnvExportValue(variable.exportKey, variable.value))}`)
    .join('\n')
}

function SupabaseFieldTitle({ title }: { title: string }) {
  return (
    <span className="fixed-field-name fixed-field-name--with-inline-copy">
      <span>{title}</span>
      <CopyButton value={title} iconOnly className="copy-button--field-title" label="Copia titolo" />
    </span>
  )
}

function DeployLinksCard({
  deployLinkVariable,
  deployAdminLinkVariable,
  onDelete,
  onUpdate,
  valueAriaLabel,
}: {
  deployLinkVariable: ProjectVariable
  deployAdminLinkVariable: ProjectVariable
  onDelete: (id: string) => void
  onUpdate: (id: string, field: 'key' | 'value' | 'sensitive', value: string | boolean) => void
  valueAriaLabel: string
}) {
  return (
    <article className="editable-variable-card editable-variable-card--grouped">
      <div className="grouped-variable-stack">
        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">{deployLinkVariable.key}</span>
            <input
              value={deployLinkVariable.value}
              type="text"
              onChange={(event) => onUpdate(deployLinkVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={deployLinkVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <button
            type="button"
            className="inline-icon-button trash-button"
            onClick={() => onDelete(deployLinkVariable.id)}
            aria-label="Elimina LINK_DEPLOY"
            title="Elimina LINK_DEPLOY"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>

        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">{deployAdminLinkVariable.key}</span>
            <input
              value={deployAdminLinkVariable.value}
              type="text"
              onChange={(event) => onUpdate(deployAdminLinkVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={deployAdminLinkVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <button
            type="button"
            className="inline-icon-button trash-button"
            onClick={() => onDelete(deployAdminLinkVariable.id)}
            aria-label="Elimina LINK_DEPLOY ADMIN"
            title="Elimina LINK_DEPLOY ADMIN"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

function normalizeEnvKey(key: string) {
  return key.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
}

function formatEnvValue(value: string) {
  if (!value) return ''
  if (!/[\s"'`$\\]/.test(value)) return value

  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function normalizeSupabaseProjectUrl(value: string) {
  return value.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

function normalizeEnvExportValue(key: string, value: string) {
  if (key === 'SUPABASE_URL' || key === 'VITE_SUPABASE_URL') {
    return normalizeSupabaseProjectUrl(value)
  }

  return value
}


function VariableEditorCard({
  variable,
  onAddAccess,
  onDelete,
  onDeleteAccess,
  onUpdateAccess,
  onUpdate,
  valueAriaLabel,
}: {
  variable: ProjectVariable
  onAddAccess: (variableId: string) => void
  onDelete: (id: string) => void
  onDeleteAccess: (variableId: string, accessId: string) => void
  onUpdateAccess: (variableId: string, accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) => void
  onUpdate: (id: string, field: 'key' | 'value' | 'sensitive', value: string | boolean) => void
  valueAriaLabel: string
}) {
  const selectFieldConfig = getSelectableFieldConfig(variable.key)
  const isDevelopmentField = variable.key.trim().toLowerCase() === 'sviluppo in'
  const isGitHubVariable = ['GITHUB_URL', 'GITHUB_TOKEN'].includes(variable.key.trim().toUpperCase())
  const isSupabaseVariable = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', ...supabaseServiceKeyAliases, 'DATABASE_URL'].includes(
    variable.key.trim().toUpperCase(),
  )
  const selectValue = selectFieldConfig ? getSelectValue(variable.value, selectFieldConfig) : variable.value
  const selectOptions = selectFieldConfig ? getSelectOptions(selectValue, selectFieldConfig.options) : []

  function addSelectOption() {
    if (!selectFieldConfig) return

    const nextValue = window.prompt(selectFieldConfig.promptLabel)
    const normalizedValue = nextValue?.trim()
    if (!normalizedValue) return

    onUpdate(variable.id, 'value', normalizedValue)
  }

  function handleSelectChange(value: string) {
    if (value === addSelectOptionValue) {
      addSelectOption()
      return
    }

    onUpdate(variable.id, 'value', value)
  }

  return (
    <article
      className={`editable-variable-card${isGitHubVariable ? ' editable-variable-card--github' : ''}${isSupabaseVariable ? ' editable-variable-card--deploy' : ''}`}
    >
      <div className="variable-field-stack">
        <label className="variable-value-input" aria-label={valueAriaLabel}>
          {isSupabaseVariable ? <SupabaseFieldTitle title={variable.key} /> : <span className="fixed-field-name">{variable.key}</span>}
          {selectFieldConfig ? (
            <div className="variable-select-row">
              <select value={selectValue} onChange={(event) => handleSelectChange(event.target.value)}>
                {selectOptions.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
                <option value={addSelectOptionValue}>+ Aggiungi</option>
              </select>
            </div>
          ) : (
            <>
              <input
                value={variable.value}
                type="text"
                onChange={(event) => onUpdate(variable.id, 'value', event.target.value)}
              />
              <CopyButton value={variable.value} iconOnly className="copy-button--inside-input" />
            </>
          )}
        </label>
        {isDevelopmentField ? (
          <PlatformAccessList
            accounts={variable.accessAccounts ?? []}
            platformOptions={selectFieldConfig?.options ?? []}
            onAdd={() => onAddAccess(variable.id)}
            onDelete={(accessId) => onDeleteAccess(variable.id, accessId)}
            onUpdate={(accessId, field, value) => onUpdateAccess(variable.id, accessId, field, value)}
          />
        ) : null}
      </div>
      <button
        type="button"
        className="inline-icon-button trash-button"
        onClick={() => onDelete(variable.id)}
        aria-label="Elimina variabile"
        title="Elimina variabile"
      >
        <Trash2 aria-hidden="true" />
      </button>
    </article>
  )
}

function GitHubCredentialsCard({
  emailVariable,
  passwordVariable,
  onDelete,
  onUpdate,
  valueAriaLabel,
}: {
  emailVariable: ProjectVariable
  passwordVariable: ProjectVariable
  onDelete: (id: string) => void
  onUpdate: (id: string, field: 'key' | 'value' | 'sensitive', value: string | boolean) => void
  valueAriaLabel: string
}) {
  return (
    <article className="editable-variable-card editable-variable-card--grouped editable-variable-card--github">
      <div className="grouped-variable-stack">
        <div className="grouped-card-title">GitHub</div>
        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">Mail accesso</span>
            <input
              value={emailVariable.value}
              type="text"
              onChange={(event) => onUpdate(emailVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={emailVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <button
            type="button"
            className="inline-icon-button trash-button"
            onClick={() => onDelete(emailVariable.id)}
            aria-label="Elimina Mail accesso"
            title="Elimina Mail accesso"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>

        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">{passwordVariable.key}</span>
            <input
              value={passwordVariable.value}
              type="text"
              onChange={(event) => onUpdate(passwordVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={passwordVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <button
            type="button"
            className="inline-icon-button trash-button"
            onClick={() => onDelete(passwordVariable.id)}
            aria-label="Elimina Password"
            title="Elimina Password"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

function PlatformAccessList({
  accounts,
  platformOptions,
  onAdd,
  onDelete,
  onUpdate,
}: {
  accounts: PlatformAccess[]
  platformOptions: readonly string[]
  onAdd: () => void
  onDelete: (accessId: string) => void
  onUpdate: (accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) => void
}) {
  function handlePlatformChange(accessId: string, value: string) {
    if (value === addSelectOptionValue) {
      const nextValue = window.prompt('Nuova piattaforma')
      const normalizedValue = nextValue?.trim()
      if (!normalizedValue) return

      onUpdate(accessId, 'platform', normalizedValue)
      return
    }

    onUpdate(accessId, 'platform', value)
  }

  return (
    <div className="platform-access-list">
      <div className="platform-access-list__header">
        <span>Accessi piattaforme</span>
        <button type="button" className="secondary-button platform-access-add-button" onClick={onAdd}>
          <Plus aria-hidden="true" className="button-icon" />
          Aggiungi accesso
        </button>
      </div>
      {accounts.map((access) => (
        <div className="platform-access-row" key={access.id}>
          <select value={access.platform} onChange={(event) => handlePlatformChange(access.id, event.target.value)}>
            {getSelectOptions(access.platform, platformOptions).map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
            <option value={addSelectOptionValue}>+ Aggiungi</option>
          </select>
          <input
            value={access.email}
            type="email"
            placeholder="Mail accesso"
            aria-label={`Mail accesso ${access.platform}`}
            onChange={(event) => onUpdate(access.id, 'email', event.target.value)}
          />
          <input
            value={access.password}
            type="text"
            placeholder="Password"
            aria-label={`Password ${access.platform}`}
            onChange={(event) => onUpdate(access.id, 'password', event.target.value)}
          />
          <button
            type="button"
            className="inline-icon-button trash-button"
            onClick={() => onDelete(access.id)}
            aria-label={`Elimina accesso ${access.platform}`}
            title={`Elimina accesso ${access.platform}`}
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

function getSelectableFieldConfig(key: string) {
  return selectableFieldConfigs[key.trim().toLowerCase()]
}

function createEmptyProject(index: number): Project {
  const name = `Nuovo progetto ${index}`
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

function getSelectOptions(value: string, options: readonly string[]) {
  const normalizedValue = value.trim()
  if (!normalizedValue || options.includes(normalizedValue)) {
    return [...options]
  }

  return [normalizedValue, ...options]
}

function getSelectValue(value: string, fieldConfig: SelectableFieldConfig) {
  const normalizedValue = value.trim()
  if (!normalizedValue || normalizedValue.toLowerCase() === 'codex') {
    return fieldConfig.fallback
  }

  return normalizedValue
}

function ProjectImagesPanel({
  slots,
  onChange,
}: {
  slots: ProjectImageSlot[]
  onChange: (slots: ProjectImageSlot[]) => void
}) {
  const [dragTargetId, setDragTargetId] = useState('')
  const [previewSlot, setPreviewSlot] = useState<ProjectImageSlot | null>(null)
  const [editorSlot, setEditorSlot] = useState<ProjectImageSlot | null>(null)
  const [copiedPromptSlotId, setCopiedPromptSlotId] = useState('')
  const primaryLogoDataUrl = slots.find((slot) => slot.id === 'logo-app')?.dataUrl ?? ''

  useEffect(() => {
    if (!copiedPromptSlotId) return

    const timeout = window.setTimeout(() => setCopiedPromptSlotId(''), 1600)
    return () => window.clearTimeout(timeout)
  }, [copiedPromptSlotId])

  function updateSlot(slotId: string, nextSlot: Partial<ProjectImageSlot>) {
    onChange(slots.map((slot) => (slot.id === slotId ? { ...slot, ...nextSlot } : slot)))
  }

  function clearSlot(slotId: string) {
    updateSlot(slotId, { dataUrl: '', fileName: '', mimeType: '', originalSizeBytes: 0, sizeBytes: 0 })
  }

  function downloadSlot(slot: ProjectImageSlot) {
    if (!slot.dataUrl) return

    const link = document.createElement('a')
    link.href = slot.dataUrl
    link.download = createDownloadFileName(slot)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleImageChange(slotId: string, file: File | undefined) {
    if (!file) return

    const optimizedImage = await optimizeImageFile(file)
    updateSlot(slotId, optimizedImage)
  }

  function handleDrop(slotId: string, fileList: FileList) {
    setDragTargetId('')
    const imageFile = Array.from(fileList).find((file) => file.type.startsWith('image/'))
    void handleImageChange(slotId, imageFile)
  }

  async function copyImagePrompt(slotId: string) {
    const prompt = imageIntegrationPromptBySlotId[slotId]
    if (!prompt) return

    await copyToClipboard(prompt)
    setCopiedPromptSlotId(slotId)
  }

  return (
    <section className="images-section">
      <h3>Immagini</h3>
      <div className="asset-list">
        {slots.map((slot) => (
          <article
            className={dragTargetId === slot.id ? 'asset-item asset-item--dragging' : 'asset-item'}
            key={slot.id}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragTargetId(slot.id)
            }}
            onDragOver={(event) => {
              event.preventDefault()
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDragTargetId('')
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              handleDrop(slot.id, event.dataTransfer.files)
            }}
          >
            {slot.dataUrl ? (
              <button
                type="button"
                className="asset-thumb asset-thumb--button"
                onClick={() => setPreviewSlot(slot)}
                aria-label={`Visualizza ${slot.name}`}
                title={`Visualizza ${slot.name}`}
              >
                <img src={slot.dataUrl} alt="" />
              </button>
            ) : (
              <div className="asset-thumb" aria-hidden="true" />
            )}
            <div className="asset-item__body">
              <div className="asset-item__title-row">
                <AssetName name={slot.name} />
                {imageIntegrationPromptBySlotId[slot.id] ? (
                  <button
                    type="button"
                    className="asset-inline-prompt-button"
                    onClick={() => void copyImagePrompt(slot.id)}
                    aria-label={copiedPromptSlotId === slot.id ? `Prompt copiato per ${slot.name}` : `Copia prompt per ${slot.name}`}
                    title={copiedPromptSlotId === slot.id ? 'Prompt copiato' : 'Copia prompt'}
                  >
                    {copiedPromptSlotId === slot.id ? (
                      <Check aria-hidden="true" className="button-icon" />
                    ) : (
                      <Copy aria-hidden="true" className="button-icon" />
                    )}
                  </button>
                ) : null}
                {slot.id === homeIconSlotId ? (
                  <button
                    type="button"
                    className="asset-inline-prompt-button editor-icon-button"
                    onClick={() => setEditorSlot(slot)}
                    aria-label="Editor icona Home"
                    title="Editor icona Home"
                  >
                    <span className="editor-icon-button__glyph" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {slot.fileName ? <span>{slot.fileName}</span> : null}
              {slot.sizeBytes ? <span>{formatFileSize(slot.sizeBytes)}</span> : null}
            </div>

            <div className="asset-item__actions">
              <label
                className="secondary-button icon-filter-button asset-side-action-button asset-file-button"
                aria-label={`Inserisci immagine per ${slot.name}`}
                title="Inserisci immagine"
              >
                <Upload aria-hidden="true" className="button-icon" />
                <input
                  accept="image/*"
                  type="file"
                  onChange={(event) => {
                    void handleImageChange(slot.id, event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              <button
                type="button"
                className="secondary-button icon-filter-button asset-side-action-button"
                disabled={!slot.dataUrl}
                onClick={() => downloadSlot(slot)}
                aria-label={`Scarica ${slot.name}`}
                title="Scarica immagine"
              >
                <Download aria-hidden="true" className="button-icon" />
              </button>
              {slot.dataUrl ? (
                <button
                  type="button"
                  className="secondary-button icon-filter-button asset-side-action-button trash-button"
                  onClick={() => clearSlot(slot.id)}
                  aria-label={`Rimuovi ${slot.name}`}
                  title={`Rimuovi ${slot.name}`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {previewSlot ? <ImagePreviewModal slot={previewSlot} onClose={() => setPreviewSlot(null)} /> : null}
      {editorSlot ? (
        <HomeIconEditorModal
          fallbackLogoDataUrl={primaryLogoDataUrl}
          slot={editorSlot}
          onClose={() => setEditorSlot(null)}
          onSave={(nextSlot) => {
            updateSlot(editorSlot.id, nextSlot)
            setEditorSlot(null)
          }}
        />
      ) : null}
    </section>
  )
}

function HomeIconEditorModal({
  fallbackLogoDataUrl,
  slot,
  onClose,
  onSave,
}: {
  fallbackLogoDataUrl: string
  slot: ProjectImageSlot
  onClose: () => void
  onSave: (slot: Partial<ProjectImageSlot>) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [backgroundColor, setBackgroundColor] = useState(defaultHomeIconBackgroundColor)
  const [gradientColor, setGradientColor] = useState(defaultHomeIconGradientColor)
  const [gradientEnabled, setGradientEnabled] = useState(true)
  const [gradientMode, setGradientMode] = useState<GradientMode>('linear')
  const [borderEnabled, setBorderEnabled] = useState(false)
  const [borderColor, setBorderColor] = useState(() => deriveBorderColor(defaultHomeIconBackgroundColor))
  const [borderColorLocked, setBorderColorLocked] = useState(true)
  const [borderWidth, setBorderWidth] = useState(28)
  const [logoDataUrl, setLogoDataUrl] = useState(slot.dataUrl || fallbackLogoDataUrl)
  const [logoScale, setLogoScale] = useState(62)
  const [dragActive, setDragActive] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let isMounted = true

    async function renderPreview() {
      try {
        await drawHomeIcon(canvasRef.current, {
          backgroundColor,
          borderColor,
          borderEnabled,
          borderWidth,
          gradientColor,
          gradientEnabled,
          gradientMode,
          logoDataUrl,
          logoScale,
        })
      } catch {
        if (isMounted) setStatus('Immagine non leggibile')
      }
    }

    void renderPreview()

    return () => {
      isMounted = false
    }
  }, [
    backgroundColor,
    borderColor,
    borderEnabled,
    borderWidth,
    gradientColor,
    gradientEnabled,
    gradientMode,
    logoDataUrl,
    logoScale,
  ])

  async function importLogo(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('Seleziona un file immagine')
      return
    }

    setStatus('')
    setLogoDataUrl(await readBlobAsDataUrl(file))
  }

  async function saveIcon() {
    setStatus('Generazione icona')
    const blob = await renderHomeIconBlob({
      backgroundColor,
      borderColor,
      borderEnabled,
      borderWidth,
      gradientColor,
      gradientEnabled,
      gradientMode,
      logoDataUrl,
      logoScale,
    })
    const dataUrl = await readBlobAsDataUrl(blob)

    onSave({
      dataUrl,
      fileName: 'Icona Schermata Home.png',
      mimeType: 'image/png',
      originalSizeBytes: blob.size,
      sizeBytes: blob.size,
    })
  }

  function handleDrop(fileList: FileList) {
    setDragActive(false)
    void importLogo(Array.from(fileList).find((file) => file.type.startsWith('image/')))
  }

  function updateBackgroundColor(value: string) {
    setBackgroundColor(value)
    if (borderColorLocked) {
      setBorderColor(deriveBorderColor(value))
    }
  }

  function updateBorderColor(value: string) {
    setBorderColor(value)
    setBorderColorLocked(false)
  }

  async function sampleColor(onSample: (value: string) => void) {
    const EyeDropperConstructor = (
      window as Window & {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
      }
    ).EyeDropper

    if (!EyeDropperConstructor) {
      setStatus('Campione colore non supportato da questo browser')
      return
    }

    try {
      const result = await new EyeDropperConstructor().open()
      onSample(result.sRGBHex)
      setStatus('Colore campionato')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setStatus('Campione colore annullato')
    }
  }

  function resetEditor() {
    resetBackground()
    resetBorder()
    setLogoDataUrl('')
    setLogoScale(62)
    setStatus('Editor ripristinato')
  }

  function resetBackground() {
    setBackgroundColor(defaultHomeIconBackgroundColor)
    setGradientColor(defaultHomeIconGradientColor)
    setGradientEnabled(true)
    setGradientMode('linear')
    if (borderColorLocked) {
      setBorderColor(deriveBorderColor(defaultHomeIconBackgroundColor))
    }
    setStatus('Sfondo ripristinato')
  }

  function resetBorder() {
    setBorderEnabled(false)
    setBorderColor(deriveBorderColor(defaultHomeIconBackgroundColor))
    setBorderColorLocked(true)
    setBorderWidth(28)
    setStatus('Bordo ripristinato')
  }

  return (
    <div className="modal-backdrop image-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="home-icon-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Editor icona Home"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="home-icon-editor__header">
          <div>
            <img
              src="/icons/nav-logo.png"
              srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
              alt="App Control"
              className="home-icon-editor__logo"
            />
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Chiudi
          </button>
        </header>

        <div className="home-icon-editor__content">
          <div
            className={dragActive ? 'home-icon-editor__preview home-icon-editor__preview--dragging' : 'home-icon-editor__preview'}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              handleDrop(event.dataTransfer.files)
            }}
          >
            <canvas ref={canvasRef} width={homeIconEditorSize} height={homeIconEditorSize} aria-label="Anteprima icona Home" />
            <span className="home-icon-editor__hint">Trascina il logo direttamente sull'icona.</span>
          </div>

          <div className="home-icon-editor__controls">
            <section className="editor-control-group">
              <div className="editor-control-group__header">
                <h3>Sfondo</h3>
                <button type="button" className="editor-reset-button" onClick={resetBackground}>
                  Reset
                </button>
              </div>
              <label>
                <span>Colore</span>
                <span className="color-sample-row">
                  <input type="color" value={backgroundColor} onChange={(event) => updateBackgroundColor(event.target.value)} />
                  <button
                    type="button"
                    className="inline-icon-button color-sample-button"
                    onClick={() => void sampleColor(updateBackgroundColor)}
                    aria-label="Campiona colore sfondo"
                    title="Campiona colore"
                  >
                    <Pipette aria-hidden="true" />
                  </button>
                </span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={gradientEnabled} onChange={(event) => setGradientEnabled(event.target.checked)} />
                Sfumatura
              </label>
              <label>
                <span>Colore sfumatura</span>
                <span className="color-sample-row">
                  <input type="color" value={gradientColor} onChange={(event) => setGradientColor(event.target.value)} />
                  <button
                    type="button"
                    className="inline-icon-button color-sample-button"
                    onClick={() => void sampleColor(setGradientColor)}
                    aria-label="Campiona colore sfumatura"
                    title="Campiona colore"
                  >
                    <Pipette aria-hidden="true" />
                  </button>
                </span>
              </label>
              {gradientEnabled ? (
                <div className="gradient-mode-grid" aria-label="Modalita sfumatura">
                  {gradientModeOptions.map((option) => (
                    <button
                      type="button"
                      className={
                        gradientMode === option.id ? 'gradient-mode-button gradient-mode-button--active' : 'gradient-mode-button'
                      }
                      key={option.id}
                      onClick={() => setGradientMode(option.id)}
                    >
                      <span className={`gradient-mode-button__preview gradient-mode-button__preview--${option.id}`} aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="editor-control-group">
              <div className="editor-control-group__header">
                <h3>Bordo</h3>
                <button type="button" className="editor-reset-button" onClick={resetBorder}>
                  Reset
                </button>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={borderEnabled} onChange={(event) => setBorderEnabled(event.target.checked)} />
                Attivo
              </label>
              <label>
                <span>Colore bordo</span>
                <span className="color-sample-row">
                  <input type="color" value={borderColor} onChange={(event) => updateBorderColor(event.target.value)} />
                  <button
                    type="button"
                    className="inline-icon-button color-sample-button"
                    onClick={() => void sampleColor(updateBorderColor)}
                    aria-label="Campiona colore bordo"
                    title="Campiona colore"
                  >
                    <Pipette aria-hidden="true" />
                  </button>
                </span>
              </label>
              <label>
                <span>Spessore</span>
                <input
                  type="range"
                  min="8"
                  max="80"
                  value={borderWidth}
                  onChange={(event) => setBorderWidth(Number(event.target.value))}
                />
              </label>
            </section>

            <section className="editor-control-group">
              <h3>Logo</h3>
              <div className="logo-action-row">
                <label className="secondary-button asset-file-button">
                  <Upload aria-hidden="true" className="button-icon" />
                  Inserisci logo
                  <input
                    accept="image/*"
                    type="file"
                    onChange={(event) => {
                      void importLogo(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                </label>
                {logoDataUrl ? (
                  <button type="button" className="secondary-button" onClick={() => setLogoDataUrl('')}>
                    Rimuovi logo
                  </button>
                ) : null}
              </div>
              <label>
                <span>Grandezza logo</span>
                <input
                  type="range"
                  min="24"
                  max="92"
                  value={logoScale}
                  onChange={(event) => setLogoScale(Number(event.target.value))}
                />
              </label>
            </section>
          </div>
        </div>

        <footer className="home-icon-editor__footer">
          <span>{status || 'Formato finale 512x512 PNG leggero e pronto per schermata Home.'}</span>
          <div className="home-icon-editor__footer-actions">
            <button type="button" className="secondary-button" onClick={resetEditor}>
              Reset
            </button>
            <button type="button" className="secondary-button" onClick={() => void saveIcon()}>
              Salva icona
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function ImagePreviewModal({ slot, onClose }: { slot: ProjectImageSlot; onClose: () => void }) {
  return (
    <div className="modal-backdrop image-preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="image-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="image-preview-modal__header">
          <img
            src="/icons/nav-logo.png"
            srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
            alt="App Control"
            className="image-preview-modal__logo"
          />
          <button type="button" className="secondary-button" onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="image-preview-modal__body">
          <img src={slot.dataUrl} alt={slot.name} />
        </div>
        <footer className="image-preview-modal__footer">
          <strong id="image-preview-title">{slot.name}</strong>
          {slot.fileName ? <span>{slot.fileName}</span> : null}
          {slot.sizeBytes ? <span>{formatFileSize(slot.sizeBytes)}</span> : null}
        </footer>
      </div>
    </div>
  )
}

type HomeIconRenderOptions = {
  backgroundColor: string
  borderColor: string
  borderEnabled: boolean
  borderWidth: number
  gradientColor: string
  gradientEnabled: boolean
  gradientMode: GradientMode
  logoDataUrl: string
  logoScale: number
}

type GradientMode = (typeof gradientModeOptions)[number]['id']

function deriveBorderColor(hexColor: string) {
  const normalizedColor = hexColor.trim().replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalizedColor)) return '#2f6f42'

  const red = Number.parseInt(normalizedColor.slice(0, 2), 16)
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16)
  const darkened = [red, green, blue].map((channel) => Math.max(0, Math.round(channel * 0.46)))

  return `#${darkened.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

async function renderHomeIconBlob(options: HomeIconRenderOptions) {
  const canvas = document.createElement('canvas')
  canvas.width = homeIconEditorSize
  canvas.height = homeIconEditorSize
  await drawHomeIcon(canvas, options)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('Esportazione icona non riuscita'))
    }, 'image/png')
  })
}

async function drawHomeIcon(canvas: HTMLCanvasElement | null, options: HomeIconRenderOptions) {
  if (!canvas) return

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas non disponibile')

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  createRoundedRectPath(context, 0, 0, canvas.width, canvas.height, homeIconCornerRadius)
  context.clip()

  context.fillStyle = options.gradientEnabled
    ? createHomeIconGradient(context, canvas.width, canvas.height, options)
    : options.backgroundColor

  context.fillRect(0, 0, canvas.width, canvas.height)

  if (options.logoDataUrl) {
    const logo = await loadDataUrlImage(options.logoDataUrl)
    const maxLogoSize = canvas.width * (options.logoScale / 100)
    const scale = Math.min(maxLogoSize / logo.naturalWidth, maxLogoSize / logo.naturalHeight)
    const logoWidth = logo.naturalWidth * scale
    const logoHeight = logo.naturalHeight * scale
    context.drawImage(logo, (canvas.width - logoWidth) / 2, (canvas.height - logoHeight) / 2, logoWidth, logoHeight)
  }

  context.restore()

  if (options.borderEnabled) {
    drawRoundedBorderRing(context, canvas.width, canvas.height, options.borderWidth, homeIconCornerRadius, options.borderColor)
  }
}

function createHomeIconGradient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: Pick<HomeIconRenderOptions, 'backgroundColor' | 'gradientColor' | 'gradientMode'>,
) {
  if (options.gradientMode === 'radial') {
    const radialGradient = context.createRadialGradient(width * 0.35, height * 0.25, 0, width * 0.5, height * 0.58, width * 0.82)
    radialGradient.addColorStop(0, options.backgroundColor)
    radialGradient.addColorStop(1, options.gradientColor)
    return radialGradient
  }

  if (options.gradientMode === 'soft') {
    const softGradient = context.createLinearGradient(width * 0.18, height * 0.08, width * 0.86, height * 0.94)
    softGradient.addColorStop(0, mixHexColors(options.backgroundColor, '#ffffff', 0.35))
    softGradient.addColorStop(0.48, options.backgroundColor)
    softGradient.addColorStop(1, options.gradientColor)
    return softGradient
  }

  const linearGradient = context.createLinearGradient(0, 0, width, height)
  linearGradient.addColorStop(0, options.backgroundColor)
  linearGradient.addColorStop(1, options.gradientColor)
  return linearGradient
}

function mixHexColors(firstColor: string, secondColor: string, amount: number) {
  const first = parseHexColor(firstColor)
  const second = parseHexColor(secondColor)
  if (!first || !second) return firstColor

  const mixed = first.map((channel, index) => Math.round(channel * (1 - amount) + second[index] * amount))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function parseHexColor(hexColor: string) {
  const normalizedColor = hexColor.trim().replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalizedColor)) return null

  return [
    Number.parseInt(normalizedColor.slice(0, 2), 16),
    Number.parseInt(normalizedColor.slice(2, 4), 16),
    Number.parseInt(normalizedColor.slice(4, 6), 16),
  ]
}

function createRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  addRoundedRectPath(context, x, y, width, height, radius)
}

function addRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.arcTo(x + width, y, x + width, y + safeRadius, safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius)
  context.lineTo(x + safeRadius, y + height)
  context.arcTo(x, y + height, x, y + height - safeRadius, safeRadius)
  context.lineTo(x, y + safeRadius)
  context.arcTo(x, y, x + safeRadius, y, safeRadius)
  context.closePath()
}

function drawRoundedBorderRing(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  borderWidth: number,
  radius: number,
  color: string,
) {
  const safeBorderWidth = Math.max(1, Math.min(borderWidth, width / 2, height / 2))
  const innerWidth = Math.max(1, width - safeBorderWidth * 2)
  const innerHeight = Math.max(1, height - safeBorderWidth * 2)

  context.save()
  context.beginPath()
  addRoundedRectPath(context, 0, 0, width, height, radius)
  addRoundedRectPath(
    context,
    safeBorderWidth,
    safeBorderWidth,
    innerWidth,
    innerHeight,
    Math.max(0, radius - safeBorderWidth),
  )
  context.fillStyle = color
  context.fill('evenodd')
  context.restore()
}

function loadDataUrlImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Logo non leggibile')))
    image.src = dataUrl
  })
}

function AssetName({ name }: { name: string }) {
  const match = name.match(/^(.*?)(\s*\(.+\))$/)
  if (!match) return <strong>{name}</strong>

  return (
    <strong>
      {match[1]}
      <span className="asset-name-note">{match[2]}</span>
    </strong>
  )
}

function buildProjectImageSlots(images: ProjectImage[] = []): ProjectImageSlot[] {
  return defaultProjectImageSlots.map((slot) => {
    const image = images.find((currentImage) => currentImage.id === slot.id)

    return {
      ...slot,
      fileName: image?.fileName ?? '',
      mimeType: image?.mimeType ?? '',
      dataUrl: image?.dataUrl ?? '',
      originalSizeBytes: image?.originalSizeBytes ?? 0,
      sizeBytes: image?.sizeBytes ?? 0,
    }
  })
}

async function optimizeImageFile(
  file: File,
): Promise<Pick<ProjectImageSlot, 'dataUrl' | 'fileName' | 'mimeType' | 'originalSizeBytes' | 'sizeBytes'>> {
  if (file.type === 'image/svg+xml') {
    const dataUrl = await readBlobAsDataUrl(file)
    return {
      dataUrl,
      fileName: file.name,
      mimeType: file.type,
      originalSizeBytes: file.size,
      sizeBytes: file.size,
    }
  }

  const image = await loadImage(file)
  const scale = Math.min(1, maxImageEdge / Math.max(image.naturalWidth, image.naturalHeight))
  let width = Math.max(1, Math.round(image.naturalWidth * scale))
  let height = Math.max(1, Math.round(image.naturalHeight * scale))
  let quality = 0.9
  let optimizedBlob = await renderImageToBlob(image, width, height, quality)

  while (optimizedBlob.size > maxImageBytes && (quality > 0.68 || width > 720 || height > 720)) {
    if (quality > 0.68) {
      quality = Math.max(0.68, quality - 0.08)
    } else {
      width = Math.max(720, Math.round(width * 0.85))
      height = Math.max(720, Math.round(height * 0.85))
    }

    optimizedBlob = await renderImageToBlob(image, width, height, quality)
  }

  const sourceBlob = file.size <= maxImageBytes && file.size <= optimizedBlob.size ? file : optimizedBlob
  const dataUrl = await readBlobAsDataUrl(sourceBlob)

  return {
    dataUrl,
    fileName: sourceBlob === file ? file.name : `${stripFileExtension(file.name)}.webp`,
    mimeType: sourceBlob.type || file.type,
    originalSizeBytes: file.size,
    sizeBytes: sourceBlob.size,
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.addEventListener('load', () => {
      URL.revokeObjectURL(url)
      resolve(image)
    })
    image.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Immagine non leggibile'))
    })

    image.src = url
  })
}

function renderImageToBlob(image: HTMLImageElement, width: number, height: number, quality: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas non disponibile')

  context.drawImage(image, 0, 0, width, height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('Ottimizzazione immagine non riuscita'))
      },
      'image/webp',
      quality,
    )
  })
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '') || 'immagine'
}

function createDownloadFileName(slot: ProjectImageSlot) {
  const extension = getDataUrlExtension(slot.dataUrl) || getFileExtension(slot.fileName) || 'png'
  return `${slot.name}.${extension}`
}

function getDataUrlExtension(dataUrl: string) {
  const mimeType = dataUrl.match(/^data:([^;]+);/)?.[1]
  if (!mimeType) return ''

  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }

  return extensionMap[mimeType] ?? mimeType.split('/')[1] ?? ''
}

function getFileExtension(fileName: string) {
  return fileName.match(/\.([^.]+)$/)?.[1] ?? ''
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  return `${Math.round(sizeBytes / 1024)} KB`
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

function isGithubEmailField(key: string) {
  return key.trim().toLowerCase() === 'mail github'
}

function isGithubPasswordField(key: string) {
  return key.trim().toLowerCase() === 'password'
}

function isDeployField(key: string) {
  return key.trim().toLowerCase() === 'deploy con'
}

function normalizeSelectableFieldValue(key: string, value: string) {
  const fieldConfig = getSelectableFieldConfig(key)
  if (!fieldConfig) return value

  return fieldConfig.options.includes(value) ? value : fieldConfig.fallback
}

function resolveSyncPrompt(value: string) {
  const normalizedValue = value.trim()
  if (!normalizedValue || normalizedValue === legacyDefaultSyncPrompt) return defaultSyncPrompt
  return normalizedValue
}

function isLinkDeployField(key: string) {
  return key.trim().toUpperCase() === 'LINK_DEPLOY'
}

function isLinkDeployAdminField(key: string) {
  return key.trim().toUpperCase() === deployAdminLinkKey.toUpperCase()
}
