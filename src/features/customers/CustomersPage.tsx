import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronDown, ClockArrowDown, ClockArrowUp, Plus, Trash2 } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { EmptyState } from '../../components/EmptyState'
import { FieldGroup } from '../../components/FieldGroup'
import { MobileWorkspaceModal } from '../../components/MobileWorkspaceModal'
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport'
import {
  ProjectAgentPanel,
  VariablesPanel,
} from '../projects/ProjectsPage'
import {
  buildProjectVariables,
  buildSheetFields,
  formatProjectUpdatedAt,
  getDeployAdminLink,
  getDeployLink,
  getProjectPreviewMeta,
  inferScopeFromEnvKey,
} from '../projects/projectShared'
import {
  clearLegacyCustomerStorage,
  createCustomerProjectRecord,
  createCustomerRecord,
  deleteCustomerProjectRecord,
  deleteCustomerRecord,
  fetchCustomers,
  saveCustomerProjectSnapshot,
  saveCustomerRecord,
} from './customerRepository'
import { buildCustomerDisplayName } from './customerIdentity'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { Customer, CustomerProject, Project, ProjectVariable } from '../../types/app'

const customerProjectTabs = ['Dati progetto', 'Variabili', 'Immagini', 'Note', 'Sync'] as const
const developmentOptions = ['Windsurf', 'Replit']
const deployOptions = ['Render', 'CloudeFlare']

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'
type CustomerProjectListSortMode = 'recent-desc' | 'recent-asc' | 'name-asc' | 'name-desc'
const saveDebounceMs = 420
const createCustomerEventName = 'app-control:create-customer'

export function CustomersPage({
  customerSearchQuery,
  selectedCustomerId,
  onCustomersChange,
  onSelectCustomer,
}: {
  customerSearchQuery: string
  selectedCustomerId: string
  onCustomersChange: (customers: Customer[]) => void
  onSelectCustomer: (customerId: string) => void
}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [activeProjectTab, setActiveProjectTab] = useState<(typeof customerProjectTabs)[number]>('Dati progetto')
  const [saveState, setSaveState] = useState<SaveState>(isSupabaseConfigured ? 'loading' : 'error')
  const [saveMessage, setSaveMessage] = useState('')
  const [loadError, setLoadError] = useState(isSupabaseConfigured ? '' : 'Supabase non configurato. Il workspace Clienti ora legge e salva solo su database.')
  const [deleteCustomerCandidate, setDeleteCustomerCandidate] = useState<Customer | null>(null)
  const [deleteProjectCandidate, setDeleteProjectCandidate] = useState<{ customerId: string; project: CustomerProject } | null>(null)
  const customerSaveTimerRef = useRef<number | null>(null)
  const customerSaveVersionRef = useRef(0)
  const projectSaveTimerRef = useRef<number | null>(null)
  const projectSaveVersionRef = useRef(0)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let isCancelled = false

    async function loadCustomers() {
      setSaveState('loading')
      setSaveMessage('Caricamento workspace Clienti in corso')
      setLoadError('')

      try {
        const nextCustomers = await fetchCustomers()
        if (isCancelled) return

        clearLegacyCustomerStorage()
        setCustomers(nextCustomers)
        setSelectedProjectId((currentProjectId) => {
          const allProjects = nextCustomers.flatMap((customer) => customer.projects)
          if (currentProjectId && allProjects.some((project) => project.id === currentProjectId)) {
            return currentProjectId
          }

          return nextCustomers[0]?.projects[0]?.id ?? ''
        })
        setSaveState('idle')
        setSaveMessage('')
      } catch (error) {
        if (isCancelled) return

        setSaveState('error')
        setLoadError(getErrorMessage(error, 'Impossibile caricare il workspace Clienti da Supabase.'))
        setSaveMessage('')
      }
    }

    void loadCustomers()

    return () => {
      isCancelled = true
      if (customerSaveTimerRef.current) window.clearTimeout(customerSaveTimerRef.current)
      if (projectSaveTimerRef.current) window.clearTimeout(projectSaveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    onCustomersChange(customers)
  }, [customers, onCustomersChange])

  useEffect(() => {
    if (saveState !== 'saved') return

    const resetTimer = window.setTimeout(() => {
      setSaveState('idle')
      setSaveMessage('')
    }, 1400)

    return () => window.clearTimeout(resetTimer)
  }, [saveState])

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0] ?? null,
    [customers, selectedCustomerId],
  )
  const selectedProject = selectedCustomer?.projects.find((project) => project.id === selectedProjectId) ?? selectedCustomer?.projects[0] ?? null

  function updateCustomers(nextCustomers: Customer[]) {
    setCustomers(nextCustomers)
  }

  const createCustomer = useCallback(async () => {
    const reusableDraftCustomer = customers.find(isReusableDraftCustomer)
    if (reusableDraftCustomer) {
      onSelectCustomer(reusableDraftCustomer.id)
      setSelectedProjectId(reusableDraftCustomer.projects[0]?.id ?? '')
      setActiveProjectTab('Dati progetto')
      setSaveState('saved')
      setSaveMessage('Cliente vuoto già disponibile')
      return
    }

    setSaveState('saving')
    setSaveMessage('Creazione cliente in corso')

    try {
      const nextCustomer = await createCustomerRecord(customers.length + 1)
      updateCustomers([nextCustomer, ...customers])
      onSelectCustomer(nextCustomer.id)
      setSelectedProjectId('')
      setActiveProjectTab('Dati progetto')
      setSaveState('saved')
      setSaveMessage('Cliente creato')
    } catch (error) {
      setSaveState('error')
      setSaveMessage(getErrorMessage(error, 'Impossibile creare il cliente.'))
    }
  }, [customers, onSelectCustomer])

  useEffect(() => {
    function handleCreateCustomerRequest() {
      void createCustomer()
    }

    window.addEventListener(createCustomerEventName, handleCreateCustomerRequest)
    return () => window.removeEventListener(createCustomerEventName, handleCreateCustomerRequest)
  }, [createCustomer])

  useEffect(() => {
    if (!customers.length) return

    const normalizedQuery = customerSearchQuery.trim().toLowerCase()
    if (!normalizedQuery) return

    const customerMatchesFilter = customers.find((customer) => customer.id === selectedCustomerId)
    if (
      customerMatchesFilter &&
      [
        buildCustomerDisplayName(customerMatchesFilter),
        customerMatchesFilter.company,
        customerMatchesFilter.email,
        customerMatchesFilter.developmentEmail,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    ) {
      return
    }

    const firstMatchingCustomer = customers.find((customer) =>
      [buildCustomerDisplayName(customer), customer.company, customer.email, customer.developmentEmail]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )

    if (firstMatchingCustomer) {
      onSelectCustomer(firstMatchingCustomer.id)
    }
  }, [customerSearchQuery, customers, onSelectCustomer, selectedCustomerId])

  function updateCustomer(customerId: string, updater: (customer: Customer) => Customer) {
    let nextCustomer: Customer | null = null

    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) => {
        if (customer.id !== customerId) return customer

        nextCustomer = { ...updater(customer), updatedAt: new Date().toISOString() }
        return nextCustomer
      }),
    )

    if (nextCustomer) {
      scheduleCustomerSave(nextCustomer)
    }
  }

  async function deleteCustomer() {
    if (!deleteCustomerCandidate) return

    setSaveState('saving')
    setSaveMessage('Eliminazione cliente in corso')

    try {
      await deleteCustomerRecord(deleteCustomerCandidate.id)
      const remainingCustomers = customers.filter((customer) => customer.id !== deleteCustomerCandidate.id)
      updateCustomers(remainingCustomers)
      onSelectCustomer(remainingCustomers[0]?.id ?? '')
      setSelectedProjectId(remainingCustomers[0]?.projects[0]?.id ?? '')
      setDeleteCustomerCandidate(null)
      setSaveState('saved')
      setSaveMessage('Cliente eliminato')
    } catch (error) {
      setSaveState('error')
      setSaveMessage(getErrorMessage(error, 'Impossibile eliminare il cliente.'))
    }
  }

  async function createCustomerProject(customerId: string) {
    const targetCustomer = customers.find((customer) => customer.id === customerId)
    if (!targetCustomer) return

    setSaveState('saving')
    setSaveMessage('Creazione progetto cliente in corso')

    try {
      const nextProject = await createCustomerProjectRecord(customerId, targetCustomer.projects.length + 1)
      updateCustomers(
        customers.map((customer) =>
          customer.id === customerId
            ? {
                ...customer,
                projects: [nextProject, ...customer.projects],
              }
            : customer,
        ),
      )
      onSelectCustomer(customerId)
      setSelectedProjectId(nextProject.id)
      setActiveProjectTab('Dati progetto')
      setSaveState('saved')
      setSaveMessage('Progetto cliente creato')
    } catch (error) {
      setSaveState('error')
      setSaveMessage(getErrorMessage(error, 'Impossibile creare il progetto cliente.'))
    }
  }

  function updateCustomerProject(customerId: string, projectId: string, updater: (project: CustomerProject) => CustomerProject) {
    let nextProject: CustomerProject | null = null

    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) => {
        if (customer.id !== customerId) return customer

        return {
          ...customer,
          projects: customer.projects.map((project) => {
            if (project.id !== projectId) return project

            nextProject = { ...updater(project), updatedAt: new Date().toISOString() }
            return nextProject
          }),
        }
      }),
    )

    if (nextProject) {
      scheduleProjectSave(customerId, nextProject)
    }
  }

  async function deleteCustomerProject() {
    if (!deleteProjectCandidate) return

    const { customerId, project } = deleteProjectCandidate
    setSaveState('saving')
    setSaveMessage('Eliminazione progetto cliente in corso')

    try {
      await deleteCustomerProjectRecord(project.id)
      const nextCustomers = customers.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              projects: customer.projects.filter((currentProject) => currentProject.id !== project.id),
            }
          : customer,
      )

      updateCustomers(nextCustomers)
      const nextCustomer = nextCustomers.find((customer) => customer.id === customerId)
      setSelectedProjectId(nextCustomer?.projects[0]?.id ?? '')
      setDeleteProjectCandidate(null)
      setSaveState('saved')
      setSaveMessage('Progetto cliente eliminato')
    } catch (error) {
      setSaveState('error')
      setSaveMessage(getErrorMessage(error, 'Impossibile eliminare il progetto cliente.'))
    }
  }

  function scheduleCustomerSave(customer: Customer) {
    customerSaveVersionRef.current += 1
    const currentVersion = customerSaveVersionRef.current

    if (customerSaveTimerRef.current) {
      window.clearTimeout(customerSaveTimerRef.current)
    }

    setSaveState('saving')
    setSaveMessage('Salvataggio cliente in corso')

    customerSaveTimerRef.current = window.setTimeout(() => {
      void persistCustomer(customer, currentVersion)
    }, saveDebounceMs)
  }

  function scheduleProjectSave(customerId: string, project: CustomerProject) {
    projectSaveVersionRef.current += 1
    const currentVersion = projectSaveVersionRef.current

    if (projectSaveTimerRef.current) {
      window.clearTimeout(projectSaveTimerRef.current)
    }

    setSaveState('saving')
    setSaveMessage('Salvataggio progetto cliente in corso')

    projectSaveTimerRef.current = window.setTimeout(() => {
      void persistProject(customerId, project, currentVersion)
    }, saveDebounceMs)
  }

  async function persistCustomer(customer: Customer, version: number) {
    try {
      const savedCustomer = await saveCustomerRecord(customer)
      if (version !== customerSaveVersionRef.current) return

      setCustomers((currentCustomers) =>
        currentCustomers.map((currentCustomer) =>
          currentCustomer.id === savedCustomer.id
            ? {
                ...currentCustomer,
                createdAt: savedCustomer.createdAt,
                updatedAt: savedCustomer.updatedAt,
              }
            : currentCustomer,
        ),
      )
      setSaveState('saved')
      setSaveMessage('Salvataggio cliente completato')
    } catch (error) {
      if (version !== customerSaveVersionRef.current) return

      setSaveState('error')
      setSaveMessage(getErrorMessage(error, 'Impossibile salvare il cliente.'))
    }
  }

  async function persistProject(customerId: string, project: CustomerProject, version: number) {
    try {
      const savedProject = await saveCustomerProjectSnapshot(customerId, project)
      if (version !== projectSaveVersionRef.current) return

      setCustomers((currentCustomers) =>
        currentCustomers.map((currentCustomer) => {
          if (currentCustomer.id !== customerId) return currentCustomer

          return {
            ...currentCustomer,
            projects: currentCustomer.projects.map((currentProject) =>
              currentProject.id === savedProject.id
                ? savedProject
                : currentProject,
            ),
          }
        }),
      )
      setSaveState('saved')
      setSaveMessage('Salvataggio progetto cliente completato')
    } catch (error) {
      if (version !== projectSaveVersionRef.current) return

      setSaveState('error')
      setSaveMessage(getErrorMessage(error, 'Impossibile salvare il progetto cliente.'))
    }
  }

  return (
    <div className="page-stack customers-page">
      {loadError ? <p className="status-message status-message--error">{loadError}</p> : null}

      {saveMessage ? (
        <p
          className={[
            'status-message',
            saveState === 'saving' ? 'status-message--progress' : '',
            saveState === 'saved' ? 'status-message--success' : '',
            saveState === 'error' ? 'status-message--error' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {saveMessage}
        </p>
      ) : null}

      <section className="customers-page__detail-panel">
        {saveState === 'loading' && !customers.length ? (
          <EmptyState title="Caricamento clienti" message="Sto recuperando archivio clienti e progetti da Supabase." />
        ) : selectedCustomer ? (
          <CustomerWorkspace
            customer={selectedCustomer}
            activeProjectTab={activeProjectTab}
            selectedProject={selectedProject}
            selectedProjectId={selectedProjectId}
            onChangeProjectTab={setActiveProjectTab}
            onCreateProject={() => void createCustomerProject(selectedCustomer.id)}
            onDeleteCustomer={() => setDeleteCustomerCandidate(selectedCustomer)}
            onDeleteProject={(project) => setDeleteProjectCandidate({ customerId: selectedCustomer.id, project })}
            onSelectProject={setSelectedProjectId}
            onUpdateCustomer={(updater) => updateCustomer(selectedCustomer.id, updater)}
            onUpdateProject={(projectId, updater) => updateCustomerProject(selectedCustomer.id, projectId, updater)}
          />
        ) : (
          <EmptyState title="Nessun cliente" message="Crea il primo cliente per aprire l'archivio dedicato." />
        )}
      </section>

      {deleteCustomerCandidate ? (
        <ConfirmDialog
          title="Elimina cliente"
          description={`Stai eliminando ${deleteCustomerCandidate.name}. Anche i suoi progetti cliente verranno rimossi dal database.`}
          confirmLabel="Elimina cliente"
          onCancel={() => setDeleteCustomerCandidate(null)}
          onConfirm={() => void deleteCustomer()}
        />
      ) : null}

      {deleteProjectCandidate ? (
        <ConfirmDialog
          title="Elimina progetto cliente"
          description={`Stai eliminando ${deleteProjectCandidate.project.name} dall'archivio cliente.`}
          confirmLabel="Elimina progetto"
          onCancel={() => setDeleteProjectCandidate(null)}
          onConfirm={() => void deleteCustomerProject()}
        />
      ) : null}
    </div>
  )
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallbackMessage
}

function isReusableDraftCustomer(customer: Customer) {
  return /^Nuovo cliente \d+$/.test(buildCustomerDisplayName(customer)) &&
    !customer.company.trim() &&
    !customer.email.trim() &&
    !customer.developmentEmail.trim() &&
    !customer.password.trim() &&
    !customer.notes.trim() &&
    customer.projects.length === 0
}

function CustomerWorkspace({
  customer,
  activeProjectTab,
  selectedProject,
  selectedProjectId,
  onChangeProjectTab,
  onCreateProject,
  onDeleteCustomer,
  onDeleteProject,
  onSelectProject,
  onUpdateCustomer,
  onUpdateProject,
}: {
  customer: Customer
  activeProjectTab: (typeof customerProjectTabs)[number]
  selectedProject: CustomerProject | null
  selectedProjectId: string
  onChangeProjectTab: (tab: (typeof customerProjectTabs)[number]) => void
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
  const [mobileModalProjectId, setMobileModalProjectId] = useState('')
  const isMobileViewport = useIsMobileViewport()

  const filteredProjects = useMemo(
    () => getSortedCustomerProjects(customer.projects, projectQuery, projectSortMode),
    [customer.projects, projectQuery, projectSortMode],
  )
  const mobileModalProject = isMobileViewport ? customer.projects.find((project) => project.id === mobileModalProjectId) ?? null : null

  const isAlphabeticalSortActive = projectSortMode === 'name-asc' || projectSortMode === 'name-desc'
  const isRecencySortActive = projectSortMode === 'recent-asc' || projectSortMode === 'recent-desc'
  const alphabeticalSortLabel = projectSortMode === 'name-desc' ? 'Ordina progetti Z-A' : 'Ordina progetti A-Z'
  const recencySortLabel =
    projectSortMode === 'recent-asc' ? 'Ordina progetti dal meno recente al piu recente' : 'Ordina progetti dal piu recente al meno recente'

  function toggleAlphabeticalSort() {
    setProjectSortMode((currentSortMode) => (currentSortMode === 'name-asc' ? 'name-desc' : 'name-asc'))
  }

  function toggleRecencySort() {
    setProjectSortMode((currentSortMode) => (currentSortMode === 'recent-asc' ? 'recent-desc' : 'recent-asc'))
  }

  return (
    <div className="detail-stack customer-workspace">
      <div className="tab-scroll-area customer-workspace__body">
        <FieldGroup
          className="customer-details-card"
          title={buildCustomerDisplayName(customer)}
          description={
            isCustomerCardOpen
              ? [customer.email.trim(), customer.developmentEmail.trim()].filter(Boolean).join(' · ') || undefined
              : undefined
          }
          action={
            <div className="customer-details-card__actions">
              {isCustomerCardOpen ? (
                <button type="button" className="danger-button" onClick={onDeleteCustomer}>
                  <Trash2 aria-hidden="true" className="button-icon" />
                  Elimina cliente
                </button>
              ) : null}
              <button
                type="button"
                className={isCustomerCardOpen ? 'customer-section-toggle customer-section-toggle--open' : 'customer-section-toggle'}
                onClick={() => setIsCustomerCardOpen((currentValue) => !currentValue)}
                aria-expanded={isCustomerCardOpen}
                aria-controls="customer-details-panel"
              >
                <span>{isCustomerCardOpen ? 'Chiudi' : 'Apri'}</span>
                <ChevronDown aria-hidden="true" className="customer-section-toggle__icon" />
              </button>
            </div>
          }
        >
          {isCustomerCardOpen ? (
            <div id="customer-details-panel" className="customer-details-panel">
              <div className="customer-form-grid customer-form-grid--customer">
                <label className="settings-input">
                  <span>Nome</span>
                  <input
                    value={customer.firstName}
                    onChange={(event) => onUpdateCustomer((current) => ({ ...current, firstName: event.target.value, name: buildCustomerDisplayName({ ...current, firstName: event.target.value }) }))}
                  />
                </label>
                <label className="settings-input">
                  <span>Cognome</span>
                  <input
                    value={customer.lastName}
                    onChange={(event) => onUpdateCustomer((current) => ({ ...current, lastName: event.target.value, name: buildCustomerDisplayName({ ...current, lastName: event.target.value }) }))}
                  />
                </label>
                <label className="settings-input">
                  <span>Azienda</span>
                  <input
                    value={customer.company}
                    onChange={(event) => onUpdateCustomer((current) => ({ ...current, company: event.target.value, name: buildCustomerDisplayName({ ...current, company: event.target.value }) }))}
                  />
                </label>
                <label className="settings-input">
                  <span>Email</span>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(event) => onUpdateCustomer((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className="settings-input">
                  <span>Email sviluppo</span>
                  <input
                    type="email"
                    value={customer.developmentEmail}
                    onChange={(event) => onUpdateCustomer((current) => ({ ...current, developmentEmail: event.target.value }))}
                  />
                </label>
                <label className="settings-input">
                  <span>Password</span>
                  <input
                    type="text"
                    value={customer.password}
                    onChange={(event) => onUpdateCustomer((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
              </div>

              <label className="settings-input">
                <span>Note cliente</span>
                <textarea
                  className="customer-notes-textarea"
                  rows={6}
                  value={customer.notes}
                  onChange={(event) => onUpdateCustomer((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
            </div>
          ) : null}
        </FieldGroup>

        <div className="split-workspace customer-projects-workspace">
          <aside className="index-panel">
            <div className="toolbar">
              <input
                value={projectQuery}
                onChange={(event) => setProjectQuery(event.target.value)}
                placeholder="Cerca.."
                aria-label="Cerca progetto cliente"
              />
              <div className="toolbar__row">
                <div className="toolbar__icon-filters" aria-label="Ordinamento lista progetti cliente">
                  <button
                    type="button"
                    className={isAlphabeticalSortActive ? 'secondary-button icon-filter-button icon-filter-button--active' : 'secondary-button icon-filter-button'}
                    onClick={toggleAlphabeticalSort}
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
                    onClick={toggleRecencySort}
                    aria-label={recencySortLabel}
                    title={recencySortLabel}
                  >
                    {projectSortMode === 'recent-asc' ? (
                      <ClockArrowUp aria-hidden="true" className="button-icon" />
                    ) : (
                      <ClockArrowDown aria-hidden="true" className="button-icon" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="record-list record-list--desktop" aria-label="Progetti cliente">
              {filteredProjects.map((project) => (
                <button
                  type="button"
                  key={project.id}
                  className={project.id === selectedProjectId ? 'record-row record-row--active' : 'record-row'}
                  onClick={() => {
                    onSelectProject(project.id)
                    onChangeProjectTab('Dati progetto')
                  }}
                >
                  <strong>{project.name}</strong>
                  <small>{`Ultima modifica: ${formatProjectUpdatedAt(project.updatedAt)}`}</small>
                  <small>{getProjectPreviewMeta(buildAdminLikeProject(project))}</small>
                </button>
              ))}
            </div>

            <div className="record-list record-list--mobile" aria-label="Progetti cliente mobile">
              {filteredProjects.map((project) => {
                const isExpanded = isMobileViewport && project.id === selectedProjectId
                const adminLikeProject = buildAdminLikeProject(project)
                const variables = buildProjectVariables(adminLikeProject)
                const deployLink = getDeployLink(buildSheetFields(adminLikeProject), adminLikeProject)
                const deployAdminLink = getDeployAdminLink(variables, deployLink)

                return (
                  <article
                    key={project.id}
                    className={isExpanded ? 'mobile-project-card mobile-project-card--active' : 'mobile-project-card'}
                  >
                    <button
                      type="button"
                      className="mobile-project-card__trigger"
                      onClick={() => {
                        onSelectProject(project.id)
                        onChangeProjectTab('Dati progetto')
                      }}
                    >
                      <strong>{project.name}</strong>
                      <small>{`Ultima modifica: ${formatProjectUpdatedAt(project.updatedAt)}`}</small>
                      <small>{getProjectPreviewMeta(adminLikeProject)}</small>
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
                              onSelectProject(project.id)
                              onChangeProjectTab('Dati progetto')
                              setMobileModalProjectId(project.id)
                            }}
                          >
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

          {!isMobileViewport ? (
            <section className="detail-panel detail-panel--customer-project">
              {selectedProject ? (
                <CustomerProjectDetail
                  activeTab={activeProjectTab}
                  project={selectedProject}
                  onChangeTab={onChangeProjectTab}
                  onDelete={() => onDeleteProject(selectedProject)}
                  onUpdate={(updater) => onUpdateProject(selectedProject.id, updater)}
                />
              ) : (
                <EmptyState title="Nessun progetto cliente" message="Crea un progetto cliente oppure selezionane uno dall'archivio." />
              )}
            </section>
          ) : null}
        </div>
      </div>

      {isMobileViewport && mobileModalProject ? (
        <MobileWorkspaceModal
          title={mobileModalProject.name}
          subtitle="Scheda progetto cliente mobile"
          onClose={() => setMobileModalProjectId('')}
        >
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
        </MobileWorkspaceModal>
      ) : null}
    </div>
  )
}

function CustomerProjectDetail({
  activeTab,
  project,
  inlineMobile = false,
  onChangeTab,
  onDelete,
  onUpdate,
}: {
  activeTab: (typeof customerProjectTabs)[number]
  project: CustomerProject
  inlineMobile?: boolean
  onChangeTab: (tab: (typeof customerProjectTabs)[number]) => void
  onDelete: () => void
  onUpdate: (updater: (project: CustomerProject) => CustomerProject) => void
}) {
  const adminLikeProject = useMemo(() => buildAdminLikeProject(project), [project])
  const sheetFields = useMemo(() => buildSheetFields(adminLikeProject), [adminLikeProject])
  const variables = useMemo(() => buildProjectVariables(adminLikeProject), [adminLikeProject])
  const deployLink = getDeployLink(sheetFields, adminLikeProject)
  const deployAdminLink = getDeployAdminLink(variables, deployLink)
  const createdAtLabel = formatProjectUpdatedAt(project.createdAt)
  const hasOperationalNotes = project.operationalNotes.trim().length > 0

  return (
    <div className={inlineMobile ? 'detail-stack customer-project-detail customer-project-detail--mobile' : 'detail-stack customer-project-detail'}>
      <div className="detail-heading">
        <div>
          <h2>{project.name}</h2>
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
          <button type="button" className="danger-button" onClick={onDelete}>
            <Trash2 aria-hidden="true" className="button-icon" />
            Elimina progetto
          </button>
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="Sezioni progetto cliente">
        {customerProjectTabs.map((tab) => (
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
            onClick={() => onChangeTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="tab-scroll-area">
        {activeTab === 'Dati progetto' ? (
          <VariablesPanel
            addLabel="Aggiungi campo"
            onChange={(nextSheetFields) => onUpdate((current) => applySheetFieldsToCustomerProject(current, nextSheetFields))}
            title="Dati progetto"
            valueAriaLabel="Valore campo foglio"
            variables={sheetFields}
          />
        ) : null}
        {activeTab === 'Variabili' ? (
          <VariablesPanel
            addLabel="Aggiungi variabile"
            onChange={(nextVariables) => onUpdate((current) => applyVariablesToCustomerProject(current, nextVariables))}
            title="Variabili"
            valueAriaLabel="Valore variabile"
            variables={variables}
          />
        ) : null}
        {activeTab === 'Immagini' ? (
          <EmptyState title="Immagini" message="La gestione immagini per i progetti cliente non è ancora collegata al database." />
        ) : null}
        {activeTab === 'Note' ? (
          <div className="notes-panel">
            <FieldGroup title="Note operative" className="field-group--bare">
              <textarea
                className="notes-panel-textarea"
                rows={7}
                value={project.operationalNotes}
                onChange={(event) => onUpdate((current) => ({ ...current, operationalNotes: event.target.value }))}
              />
            </FieldGroup>
          </div>
        ) : null}
        {activeTab === 'Sync' ? (
          <ProjectAgentPanel project={adminLikeProject} />
        ) : null}
      </div>
    </div>
  )
}

function buildAdminLikeProject(project: CustomerProject): Project {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    status: project.status,
    developmentEnvironment: project.developmentEnvironment,
    githubRepoUrl: project.githubRepoUrl,
    githubAccountEmail: project.githubAccountEmail,
    linkedSecretLabel: project.linkedSecretLabel,
    supabase: {
      projectUrl: '',
      anonKeyLabel: '',
      serviceRoleLabel: '',
      databaseUrlLabel: '',
    },
    deploy: {
      provider: project.deploy.provider,
      url: project.deploy.url,
      accountEmail: project.deploy.accountEmail,
    },
    operationalNotes: project.operationalNotes,
    agent: {
      projectId: '',
      agentKey: '',
      syncPrompt: '',
    },
    promptIds: [],
    assetIds: [],
    env: project.env,
    dataFields: project.dataFields,
    platformAccesses: project.platformAccesses,
    images: [],
  }
}

function getSortedCustomerProjects(projects: CustomerProject[], query: string, sortMode: CustomerProjectListSortMode) {
  const normalizedQuery = query.trim().toLowerCase()
  const matchingProjects = projects.filter((project) => {
    const adminLikeProject = buildAdminLikeProject(project)
    return (
      !normalizedQuery ||
      project.name.toLowerCase().includes(normalizedQuery) ||
      getProjectPreviewMeta(adminLikeProject).toLowerCase().includes(normalizedQuery) ||
      formatProjectUpdatedAt(project.updatedAt).toLowerCase().includes(normalizedQuery)
    )
  })

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

function applySheetFieldsToCustomerProject(project: CustomerProject, sheetFields: ProjectVariable[]): CustomerProject {
  const getField = (key: string) => sheetFields.find((field) => field.key.trim().toLowerCase() === key.toLowerCase())
  const customDataFields = sheetFields.filter((field) => {
    const normalizedKey = field.key.trim().toLowerCase()
    return !['nome progetto', 'mail github', 'password', 'sviluppo in', 'deploy con', 'password deploy'].includes(normalizedKey)
  })
  const deployPasswordField = getField('password deploy')
  const developmentField = getField('sviluppo in')

  return {
    ...project,
    name: getField('nome progetto')?.value ?? project.name,
    githubAccountEmail: getField('mail github')?.value ?? '',
    linkedSecretLabel: getField('password')?.value ?? '',
    developmentEnvironment: getField('sviluppo in')?.value || developmentOptions[0],
    deploy: {
      ...project.deploy,
      provider: getField('deploy con')?.value || deployOptions[0],
    },
    platformAccesses: (developmentField?.accessAccounts ?? []).map((access) => ({
      id: access.id || createLocalId(),
      platform: access.platform,
      email: access.email,
      password: access.password,
    })),
    dataFields: [
      ...(deployPasswordField
        ? [
            {
              id: deployPasswordField.id,
              key: deployPasswordField.key,
              value: deployPasswordField.value,
              sensitive: deployPasswordField.sensitive,
            },
          ]
        : []),
      ...customDataFields.map((field) => ({
        id: field.id,
        key: field.key,
        value: field.value,
        sensitive: field.sensitive,
      })),
    ],
  }
}

function applyVariablesToCustomerProject(project: CustomerProject, variables: ProjectVariable[]): CustomerProject {
  const getVariable = (key: string) => variables.find((variable) => variable.key.trim().toUpperCase() === key.toUpperCase())

  return {
    ...project,
    githubRepoUrl: getVariable('GITHUB_URL')?.value ?? '',
    deploy: {
      ...project.deploy,
      url: getVariable('LINK_DEPLOY')?.value ?? '',
    },
    env: variables
      .filter((variable) => {
        const normalizedKey = variable.key.trim().toUpperCase()
        return normalizedKey !== 'GITHUB_URL' && normalizedKey !== 'LINK_DEPLOY ADMIN'
      })
      .map((variable) => ({
        key: variable.key,
        value: variable.value,
        scope: inferScopeFromEnvKey(variable.key),
        sensitive: variable.sensitive,
      })),
  }
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="confirm-modal__actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
