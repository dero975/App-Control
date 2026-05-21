import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { Customer, CustomerProject } from '../../types/app'
import {
  getFirstMatchingCustomer,
  getNextSelectedProjectId,
  mergeLoadedCustomerProject,
  mergeSavedCustomer,
  prependCustomerProject,
  removeCustomerProject,
  replaceCustomerProject,
  selectCustomerProject,
} from './customerControllerHelpers'
import {
  clearLegacyCustomerStorage,
  createCustomerProjectRecord,
  createCustomerRecord,
  deleteCustomerProjectRecord,
  deleteCustomerRecord,
  fetchCustomerProjectById,
  fetchCustomers,
  saveCustomerProjectSnapshot,
  saveCustomerRecord,
} from './customerRepository'
import { createCustomerEventName, customerProjectTabs, saveDebounceMs, type SaveState } from './customerPageConstants'
import { getErrorMessage, isReusableDraftCustomer } from './customerUtils'

export function useCustomersPageController({
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
  const [loadedCustomerProjectIds, setLoadedCustomerProjectIds] = useState<Set<string>>(() => new Set())
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
        setLoadedCustomerProjectIds(new Set())
        setSelectedProjectId((currentProjectId) => getNextSelectedProjectId(nextCustomers, currentProjectId))
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
  const effectiveSelectedProjectId = selectedCustomer?.projects.some((project) => project.id === selectedProjectId)
    ? selectedProjectId
    : selectedCustomer?.projects[0]?.id ?? ''
  const selectedProject = selectedCustomer?.projects.find((project) => project.id === effectiveSelectedProjectId) ?? null
  const selectedProjectIsLoaded = selectedProject ? loadedCustomerProjectIds.has(selectedProject.id) : false

  useEffect(() => {
    if (!isSupabaseConfigured || !effectiveSelectedProjectId || loadedCustomerProjectIds.has(effectiveSelectedProjectId)) return

    let isCancelled = false
    fetchCustomerProjectById(effectiveSelectedProjectId)
      .then((project) => {
        if (isCancelled) return
        setCustomers((currentCustomers) => mergeLoadedCustomerProject(currentCustomers, project))
        setLoadedCustomerProjectIds((currentIds) => new Set(currentIds).add(project.id))
        setLoadError('')
      })
      .catch((error) => {
        if (isCancelled) return
        setLoadError(getErrorMessage(error, 'Impossibile caricare il dettaglio progetto cliente.'))
      })

    return () => {
      isCancelled = true
    }
  }, [effectiveSelectedProjectId, loadedCustomerProjectIds])

  const createCustomer = useCallback(async () => {
    const reusableDraftCustomer = customers.find(isReusableDraftCustomer)
    if (reusableDraftCustomer) {
      selectCustomerProject(reusableDraftCustomer, onSelectCustomer, setSelectedProjectId, setActiveProjectTab)
      setSaveState('saved')
      setSaveMessage('Cliente vuoto già disponibile')
      return
    }

    setSaveState('saving')
    setSaveMessage('Creazione cliente in corso')
    try {
      const nextCustomer = await createCustomerRecord(customers.length + 1)
      setCustomers([nextCustomer, ...customers])
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
    const matchingCustomer = getFirstMatchingCustomer(customers, customerSearchQuery, selectedCustomerId)
    if (matchingCustomer) onSelectCustomer(matchingCustomer.id)
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
    if (nextCustomer) scheduleCustomerSave(nextCustomer)
  }

  async function deleteCustomer() {
    if (!deleteCustomerCandidate) return

    setSaveState('saving')
    setSaveMessage('Eliminazione cliente in corso')
    try {
      await deleteCustomerRecord(deleteCustomerCandidate.id)
      const remainingCustomers = customers.filter((customer) => customer.id !== deleteCustomerCandidate.id)
      setCustomers(remainingCustomers)
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
      setLoadedCustomerProjectIds((currentIds) => new Set(currentIds).add(nextProject.id))
      setCustomers((currentCustomers) => prependCustomerProject(currentCustomers, customerId, nextProject))
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
    if (nextProject) scheduleProjectSave(customerId, nextProject)
  }

  async function deleteCustomerProject() {
    if (!deleteProjectCandidate) return

    const { customerId, project } = deleteProjectCandidate
    setSaveState('saving')
    setSaveMessage('Eliminazione progetto cliente in corso')
    try {
      await deleteCustomerProjectRecord(project.id)
      const nextCustomers = removeCustomerProject(customers, customerId, project.id)
      setCustomers(nextCustomers)
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
    if (customerSaveTimerRef.current) window.clearTimeout(customerSaveTimerRef.current)

    setSaveState('saving')
    setSaveMessage('Salvataggio cliente in corso')
    customerSaveTimerRef.current = window.setTimeout(() => {
      void persistCustomer(customer, currentVersion)
    }, saveDebounceMs)
  }

  function scheduleProjectSave(customerId: string, project: CustomerProject) {
    projectSaveVersionRef.current += 1
    const currentVersion = projectSaveVersionRef.current
    if (projectSaveTimerRef.current) window.clearTimeout(projectSaveTimerRef.current)

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

      setCustomers((currentCustomers) => mergeSavedCustomer(currentCustomers, savedCustomer))
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

      setLoadedCustomerProjectIds((currentIds) => new Set(currentIds).add(savedProject.id))
      setCustomers((currentCustomers) => replaceCustomerProject(currentCustomers, customerId, savedProject))
      setSaveState('saved')
      setSaveMessage('Salvataggio progetto cliente completato')
    } catch (error) {
      if (version !== projectSaveVersionRef.current) return
      setSaveState('error')
      setSaveMessage(getErrorMessage(error, 'Impossibile salvare il progetto cliente.'))
    }
  }

  return {
    activeProjectTab,
    customers,
    deleteCustomer,
    deleteCustomerCandidate,
    deleteCustomerProject,
    deleteProjectCandidate,
    effectiveSelectedProjectId,
    loadedCustomerProjectIds,
    loadError,
    saveMessage,
    saveState,
    selectedCustomer,
    selectedProject,
    selectedProjectIsLoaded,
    createCustomerProject,
    setActiveProjectTab,
    setDeleteCustomerCandidate,
    setDeleteProjectCandidate,
    setSelectedProjectId,
    updateCustomer,
    updateCustomerProject,
  }
}
