import { Suspense, lazy, useEffect, useState } from 'react'
import { AppLayout } from './app/AppLayout'
import { appIntroSeenStorageKey, appUnlockedStorageKey } from './lib/pinAccess'
import type { AdminSection, AppEnvironment, Customer, CustomerSection } from './types/app'

const PinLockPage = lazy(() => import('./features/access/PinLockPage').then((module) => ({ default: module.PinLockPage })))
const CustomersPage = lazy(() => import('./features/customers/CustomersPage').then((module) => ({ default: module.CustomersPage })))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ProjectsPage = lazy(() => import('./features/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const PromptsPage = lazy(() => import('./features/prompts/PromptsPage').then((module) => ({ default: module.PromptsPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))

const activeEnvironmentStorageKey = 'app-control-environment'
const activeAdminSectionStorageKey = 'app-control-admin-section'
const activeCustomerSectionStorageKey = 'app-control-customer-section'
const activeCustomerIdStorageKey = 'app-control-customer-id'
const customerSearchQueryStorageKey = 'app-control-customer-search'

function App() {
  const [activeEnvironment, setActiveEnvironment] = useState<AppEnvironment>(() => {
    const storedEnvironment = window.sessionStorage.getItem(activeEnvironmentStorageKey)
    return storedEnvironment === 'customers' ? 'customers' : 'admin'
  })
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>(() => {
    const storedSection = window.sessionStorage.getItem(activeAdminSectionStorageKey)
    return storedSection === 'prompts' || storedSection === 'settings' || storedSection === 'dashboard' ? storedSection : 'projects'
  })
  const [activeCustomerSection, setActiveCustomerSection] = useState<CustomerSection>('customers')
  const [customerDirectory, setCustomerDirectory] = useState<Customer[]>([])
  const [activeCustomerId, setActiveCustomerId] = useState(() => window.sessionStorage.getItem(activeCustomerIdStorageKey) ?? '')
  const [customerSearchQuery, setCustomerSearchQuery] = useState(() => window.sessionStorage.getItem(customerSearchQueryStorageKey) ?? '')
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(appUnlockedStorageKey) === '1')
  const [showIntro, setShowIntro] = useState(() => {
    if (sessionStorage.getItem(appIntroSeenStorageKey) === '1') return false
    sessionStorage.setItem(appIntroSeenStorageKey, '1')
    return true
  })

  useEffect(() => {
    if (!showIntro) return
    const introTimer = window.setTimeout(() => setShowIntro(false), 5000)
    return () => window.clearTimeout(introTimer)
  }, [showIntro])

  useEffect(() => {
    window.sessionStorage.setItem(activeEnvironmentStorageKey, activeEnvironment)
  }, [activeEnvironment])

  useEffect(() => {
    window.sessionStorage.setItem(activeAdminSectionStorageKey, activeAdminSection)
  }, [activeAdminSection])

  useEffect(() => {
    window.sessionStorage.setItem(activeCustomerSectionStorageKey, activeCustomerSection)
  }, [activeCustomerSection])

  useEffect(() => {
    if (activeCustomerId) {
      window.sessionStorage.setItem(activeCustomerIdStorageKey, activeCustomerId)
      return
    }

    window.sessionStorage.removeItem(activeCustomerIdStorageKey)
  }, [activeCustomerId])

  useEffect(() => {
    if (customerSearchQuery) {
      window.sessionStorage.setItem(customerSearchQueryStorageKey, customerSearchQuery)
      return
    }

    window.sessionStorage.removeItem(customerSearchQueryStorageKey)
  }, [customerSearchQuery])

  function lockApp() {
    sessionStorage.removeItem(appUnlockedStorageKey)
    setIsUnlocked(false)
    setActiveEnvironment('admin')
    setActiveAdminSection('projects')
    setActiveCustomerSection('customers')
    setActiveCustomerId('')
    setCustomerSearchQuery('')
  }

  function navigateSection(nextSection: AdminSection | CustomerSection) {
    if (activeEnvironment === 'customers') {
      setActiveCustomerSection('customers')
      return
    }

    if (nextSection === 'projects' || nextSection === 'prompts' || nextSection === 'settings' || nextSection === 'dashboard') {
      setActiveAdminSection(nextSection)
    }
  }

  if (!isUnlocked) {
    return showIntro ? (
      <IntroSplash />
    ) : (
      <Suspense fallback={<IntroSplash />}>
        <PinLockPage onUnlock={() => setIsUnlocked(true)} />
      </Suspense>
    )
  }

  if (showIntro) {
    return <IntroSplash />
  }

  const activeSection = activeEnvironment === 'customers' ? activeCustomerSection : activeAdminSection

  return (
    <AppLayout
      activeEnvironment={activeEnvironment}
      activeSection={activeSection}
      customerDirectory={customerDirectory}
      activeCustomerId={activeCustomerId}
      customerSearchQuery={customerSearchQuery}
      onChangeEnvironment={setActiveEnvironment}
      onChangeCustomer={setActiveCustomerId}
      onChangeCustomerSearchQuery={setCustomerSearchQuery}
      onLock={lockApp}
      onNavigate={navigateSection}
    >
      <Suspense fallback={<SectionLoading />}>
        {activeEnvironment === 'admin' && activeSection === 'projects' ? <ProjectsPage /> : null}
        {activeEnvironment === 'admin' && activeSection === 'prompts' ? <PromptsPage /> : null}
        {activeEnvironment === 'admin' && activeSection === 'settings' ? <SettingsPage /> : null}
        {activeEnvironment === 'admin' && activeSection === 'dashboard' ? <DashboardPage /> : null}
        {activeEnvironment === 'customers' && activeSection === 'customers' ? (
          <CustomersPage
            customerSearchQuery={customerSearchQuery}
            selectedCustomerId={activeCustomerId}
            onCustomersChange={setCustomerDirectory}
            onSelectCustomer={setActiveCustomerId}
          />
        ) : null}
      </Suspense>
    </AppLayout>
  )
}

function IntroSplash() {
  return (
    <div className="intro-splash" aria-label="Avvio App Control">
      <img src="/icons/splash-logo.png" alt="App Control" className="intro-splash__logo" />
      <span className="intro-splash__signature">by Dero</span>
    </div>
  )
}

function SectionLoading() {
  return <div className="status-message status-message--progress">Caricamento sezione in corso</div>
}

export default App
