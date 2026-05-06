import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Trash2, Upload } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { EmptyState } from '../../components/EmptyState'
import { FieldGroup } from '../../components/FieldGroup'
import { SectionHeader } from '../../components/SectionHeader'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { PlatformAccess, Project, ProjectVariable } from '../../types/app'
import {
  createProjectRecord,
  deleteProjectRecord,
  fetchProjects,
  saveProjectSnapshot,
  type ProjectSnapshot,
} from './projectRepository'

type ProjectImageSlot = {
  id: string
  name: string
  fileName: string
  dataUrl: string
  sizeBytes: number
  originalSizeBytes: number
}

const projectTabs = ['Dati progetto', 'Variabili', 'Immagini', 'Note'] as const
const orderedProjectKeys = [
  'LINK_DEPLOY',
  'GITHUB_URL',
  'GITHUB_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
] as const
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
  { id: 'logo-app', name: 'logo app' },
  { id: 'logo-app-2', name: 'logo app 2' },
  { id: 'logo-app-3', name: 'logo app 3' },
  { id: 'home-icon', name: 'Icona Schermata Home' },
  { id: 'browser-tab-icon', name: 'Icona Tab Browser (favicon)' },
] as const
const maxImageBytes = 500 * 1024
const maxImageEdge = 1200
const defaultSyncPrompt =
  'Sincronizza questo progetto con App Control. Controlla se esiste `.agent/app-control.json`. Se esiste, usa `projectId` e `agentKey` per caricare da App Control le variabili autorizzate del progetto. Se non esiste, chiedimi la Agent Key e guidami nel collegamento del progetto. Poi genera o aggiorna `.env`, verifica che `.env` sia in `.gitignore`, integra nel codice solo le variabili necessarie, verifica la connessione Supabase senza esporre segreti, usa GitHub solo tramite `gh` o credenziali autorizzate, prima di commit o push chiedi conferma esplicita, e non stampare token, password, service role key o DB URL nei log o nella chat.'

export function ProjectsPage() {
  const [projectList, setProjectList] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [activeTab, setActiveTab] = useState<(typeof projectTabs)[number]>('Dati progetto')
  const [query, setQuery] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<Project | null>(null)
  const [loadError, setLoadError] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

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
        setSelectedId(projects[0]?.id ?? '')
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
    const normalizedQuery = query.trim().toLowerCase()
    return projectList.filter(
      (project) =>
        !normalizedQuery ||
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.developmentEnvironment.toLowerCase().includes(normalizedQuery) ||
        project.status.toLowerCase().includes(normalizedQuery),
    )
  }, [projectList, query])

  const selectedProject = filteredProjects.find((project) => project.id === selectedId) ?? filteredProjects[0]

  async function createProject() {
    const nextProject = createEmptyProject(projectList.length + 1)
    try {
      const project = isSupabaseConfigured ? await createProjectRecord(nextProject) : nextProject
      setProjectList((currentProjects) => [project, ...currentProjects])
      setSelectedId(project.id)
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
      if (isSupabaseConfigured) {
        await deleteProjectRecord(deleteCandidate.id)
      }

      const remainingProjects = projectList.filter((project) => project.id !== deleteCandidate.id)
      setProjectList(remainingProjects)
      setSelectedId(remainingProjects[0]?.id ?? '')
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
    const refreshedProjects = await fetchProjects()
    setProjectList(refreshedProjects)
    setSelectedId(snapshot.project.id)
  }

  return (
    <div className="page-stack">
      <SectionHeader title="Progetti" />

      <div className="split-workspace">
        <aside className="index-panel">
          <div className="toolbar">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca.."
              aria-label="Cerca progetto"
            />
            <button type="button" className="secondary-button" onClick={createProject}>
              <Plus aria-hidden="true" className="button-icon" />
              Nuovo progetto
            </button>
          </div>

          <div className="record-list" aria-label="Progetti">
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
                <small>{getProjectPreviewMeta(project)}</small>
              </button>
            ))}
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
    </div>
  )
}

function ProjectDetail({
  project,
  activeTab,
  onSave,
  onRequestDelete,
  onTabChange,
}: {
  project: Project
  activeTab: (typeof projectTabs)[number]
  onSave?: (snapshot: ProjectSnapshot) => Promise<void>
  onRequestDelete: () => void
  onTabChange: (tab: (typeof projectTabs)[number]) => void
}) {
  const [sheetFields, setSheetFields] = useState<ProjectVariable[]>(() => buildSheetFields(project))
  const [variables, setVariables] = useState<ProjectVariable[]>(() => buildProjectVariables(project))
  const [imageSlots, setImageSlots] = useState<ProjectImageSlot[]>(() => buildProjectImageSlots())
  const [saveStatus, setSaveStatus] = useState('')
  const projectTitle = getFieldValue(sheetFields, 'nome progetto') || project.name
  const deployLink = getDeployLink(sheetFields, project)

  async function handleSave() {
    if (!onSave) return

    setSaveStatus('Salvataggio in corso')
    try {
      await onSave({ project, sheetFields, variables })
      setSaveStatus('Salvato')
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Errore salvataggio')
    }
  }

  return (
    <div className="detail-stack">
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
        </div>
        <div className="detail-heading__actions">
          {onSave ? (
            <button type="button" className="secondary-button" onClick={handleSave}>
              Salva modifiche
            </button>
          ) : null}
          <button type="button" className="danger-button" onClick={onRequestDelete}>
            <Trash2 aria-hidden="true" className="button-icon" />
            Elimina progetto
          </button>
        </div>
      </div>

      {saveStatus ? <p className="status-message">{saveStatus}</p> : null}

      <div className="tab-row" role="tablist" aria-label="Sezioni progetto">
        {projectTabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={activeTab === tab ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dati progetto' ? (
        <>
          <VariablesPanel
            addLabel="Aggiungi campo"
            onChange={setSheetFields}
            title="Dati progetto"
            valueAriaLabel="Valore campo foglio"
            variables={sheetFields}
          />
          <ProjectAgentPanel project={project} />
        </>
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
      {activeTab === 'Immagini' ? <ProjectImagesPanel slots={imageSlots} onChange={setImageSlots} /> : null}
      {activeTab === 'Note' ? (
        <FieldGroup title="Note operative">
          <textarea value={project.operationalNotes} readOnly rows={7} />
        </FieldGroup>
      ) : null}
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

function VariablesPanel({
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
  function updateVariable(id: string, field: 'key' | 'value' | 'sensitive', value: string | boolean) {
    onChange(variables.map((variable) => (variable.id === id ? { ...variable, [field]: value } : variable)))
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

  return (
    <div className="detail-stack">
      <FieldGroup
        title={title}
        action={
          <button type="button" className="secondary-button" onClick={addVariable}>
            <Plus aria-hidden="true" className="button-icon" />
            {addLabel}
          </button>
        }
      >
        <div className="editable-variable-list">
          {variables.map((variable) => (
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
          ))}
        </div>
      </FieldGroup>
    </div>
  )
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
    <article className="editable-variable-card">
      <div className="variable-field-stack">
        <label className="variable-value-input" aria-label={valueAriaLabel}>
          <span className="fixed-field-name">{variable.key}</span>
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
    env: [
      { key: 'SUPABASE_URL', value: '', scope: 'Supabase', sensitive: false },
      { key: 'SUPABASE_ANON_KEY', value: '', scope: 'Supabase', sensitive: true },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', value: '', scope: 'Supabase', sensitive: true },
      { key: 'SUPABASE_DB_URL', value: '', scope: 'Supabase', sensitive: true },
      { key: 'GITHUB_TOKEN', value: '', scope: 'GitHub', sensitive: true },
      { key: 'RENDER_SERVICE_ID', value: '', scope: 'Deploy', sensitive: false },
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

  function updateSlot(slotId: string, nextSlot: Partial<ProjectImageSlot>) {
    onChange(slots.map((slot) => (slot.id === slotId ? { ...slot, ...nextSlot } : slot)))
  }

  function clearSlot(slotId: string) {
    updateSlot(slotId, { dataUrl: '', fileName: '', originalSizeBytes: 0, sizeBytes: 0 })
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
            <div className="asset-thumb" aria-hidden="true">
              {slot.dataUrl ? <img src={slot.dataUrl} alt="" /> : null}
            </div>
            <div className="asset-item__body">
              <AssetName name={slot.name} />
              {slot.fileName ? <span>{slot.fileName}</span> : null}
              {slot.sizeBytes ? <span>{formatFileSize(slot.sizeBytes)}</span> : null}
            </div>
            <div className="asset-item__actions">
              <label className="secondary-button asset-file-button">
                <Upload aria-hidden="true" className="button-icon" />
                Inserisci
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
                className="secondary-button"
                disabled={!slot.dataUrl}
                onClick={() => downloadSlot(slot)}
              >
                <Download aria-hidden="true" className="button-icon" />
                Scarica
              </button>
              {slot.dataUrl ? (
                <button
                  type="button"
                  className="inline-icon-button trash-button"
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
    </section>
  )
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

function buildProjectImageSlots(): ProjectImageSlot[] {
  return defaultProjectImageSlots.map((slot) => ({
    ...slot,
    fileName: '',
    dataUrl: '',
    originalSizeBytes: 0,
    sizeBytes: 0,
  }))
}

async function optimizeImageFile(file: File): Promise<Pick<ProjectImageSlot, 'dataUrl' | 'fileName' | 'originalSizeBytes' | 'sizeBytes'>> {
  if (file.type === 'image/svg+xml') {
    const dataUrl = await readBlobAsDataUrl(file)
    return {
      dataUrl,
      fileName: file.name,
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

function ProjectAgentPanel({ project }: { project: Project }) {
  const agentConfig = formatAgentConfig(project)

  return (
    <FieldGroup title="Agent sync">
      <div className="agent-sync-block">
        <div className="agent-sync-block__header">
          <span>Prompt sincronizzazione</span>
        </div>
        <div className="agent-sync-box">
          <div className="agent-sync-readonly" aria-label="Prompt sincronizzazione">
            {project.agent.syncPrompt}
          </div>
          <CopyButton value={project.agent.syncPrompt} className="copy-button--inside-panel" />
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

function buildSheetFields(project: Project): ProjectVariable[] {
  return [
    {
      id: 'sheet-nome-progetto',
      key: 'nome progetto',
      value: project.name,
      sensitive: false,
    },
    {
      id: 'sheet-mail-github',
      key: 'mail github',
      value: project.githubAccountEmail,
      sensitive: false,
    },
    {
      id: 'sheet-psw',
      key: 'Password',
      value: project.linkedSecretLabel,
      sensitive: false,
    },
    {
      id: 'sheet-sviluppo-in',
      key: 'sviluppo in',
      value: normalizeSelectableFieldValue('sviluppo in', project.developmentEnvironment),
      sensitive: false,
      accessAccounts: project.platformAccesses ?? [],
    },
    {
      id: 'sheet-deploy-con',
      key: 'deploy con',
      value: normalizeSelectableFieldValue('deploy con', project.deploy.provider),
      sensitive: false,
    },
    ...(project.dataFields ?? []),
  ]
}

function getProjectPreviewMeta(project: Project) {
  const sheetFields = buildSheetFields(project)
  return `${getFieldValue(sheetFields, 'sviluppo in')} / ${getFieldValue(sheetFields, 'deploy con')}`
}

function normalizeSelectableFieldValue(key: string, value: string) {
  const fieldConfig = getSelectableFieldConfig(key)
  if (!fieldConfig) return value

  return fieldConfig.options.includes(value) ? value : fieldConfig.fallback
}

function getFieldValue(fields: ProjectVariable[], key: string) {
  return fields.find((field) => field.key.trim().toLowerCase() === key)?.value.trim()
}

function getDeployLink(fields: ProjectVariable[], project: Project) {
  const deployFieldValue = getFieldValue(fields, 'deploy con')
  if (deployFieldValue?.startsWith('http://') || deployFieldValue?.startsWith('https://')) {
    return deployFieldValue
  }

  return project.deploy.url
}

function buildProjectVariables(project: Project): ProjectVariable[] {
  const variableMap = new Map(project.env.map((variable) => [variable.key, variable]))

  return [
    {
      id: 'link-deploy',
      key: 'LINK_DEPLOY',
      value: project.deploy.url,
      sensitive: false,
    },
    {
      id: 'github-url',
      key: 'GITHUB_URL',
      value: project.githubRepoUrl,
      sensitive: false,
    },
    ...orderedProjectKeys
      .filter((key) => key !== 'LINK_DEPLOY' && key !== 'GITHUB_URL')
      .map((key) => {
        const sourceVariable = variableMap.get(key)
        return {
          id: key.toLowerCase().replaceAll('_', '-'),
          key,
          value: sourceVariable?.value ?? '',
          sensitive: sourceVariable?.sensitive ?? true,
        }
      }),
  ]
}
