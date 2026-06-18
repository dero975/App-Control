import { Suspense, lazy, useEffect, useState } from 'react'
import { AppLayout } from './app/AppLayout'
import { PinLockPage } from './features/access/PinLockPage'
import {
  appIntroSeenStorageKey,
  appUnlockedStorageKey,
  hasSupabaseTrustedDeviceToken,
  restoreTrustedDeviceAccess,
  trustedDeviceUnlockSuppressedStorageKey,
} from './lib/pinAccess'
import { clearSupabaseAppAccessPinHash, hasSupabaseAppAccessCredential } from './lib/supabase'
import type { AdminSection } from './types/app'

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ProjectsPage = lazy(() => import('./features/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const PromptsPage = lazy(() => import('./features/prompts/PromptsPage').then((module) => ({ default: module.PromptsPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))

const activeAdminSectionStorageKey = 'app-control-admin-section'
const introSplashDurationMs = 4500

function App() {
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>(() => {
    const storedSection = window.sessionStorage.getItem(activeAdminSectionStorageKey)
    return storedSection === 'prompts' || storedSection === 'settings' || storedSection === 'dashboard' ? storedSection : 'projects'
  })
  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem(appUnlockedStorageKey) === '1' && hasSupabaseAppAccessCredential(),
  )
  const [isRestoringTrustedDevice, setIsRestoringTrustedDevice] = useState(() => {
    return (
      sessionStorage.getItem(appUnlockedStorageKey) !== '1' &&
      sessionStorage.getItem(trustedDeviceUnlockSuppressedStorageKey) !== '1' &&
      hasSupabaseTrustedDeviceToken()
    )
  })
  const [showIntro, setShowIntro] = useState(() => {
    if (sessionStorage.getItem(appIntroSeenStorageKey) === '1') return false
    sessionStorage.setItem(appIntroSeenStorageKey, '1')
    return true
  })

  useEffect(() => {
    if (!showIntro) return
    const introTimer = window.setTimeout(() => setShowIntro(false), introSplashDurationMs)
    return () => window.clearTimeout(introTimer)
  }, [showIntro])

  useEffect(() => {
    if (isUnlocked || sessionStorage.getItem(trustedDeviceUnlockSuppressedStorageKey) === '1') return
    if (!hasSupabaseTrustedDeviceToken()) return

    let cancelled = false
    restoreTrustedDeviceAccess()
      .then((restored) => {
        if (cancelled) return
        if (!restored) {
          setIsRestoringTrustedDevice(false)
          return
        }
        sessionStorage.setItem(appUnlockedStorageKey, '1')
        setIsUnlocked(true)
        setIsRestoringTrustedDevice(false)
      })
      .catch(() => {
        if (!cancelled) {
          setIsUnlocked(false)
          setIsRestoringTrustedDevice(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isUnlocked])

  useEffect(() => {
    window.sessionStorage.setItem(activeAdminSectionStorageKey, activeAdminSection)
  }, [activeAdminSection])

  function lockApp() {
    sessionStorage.removeItem(appUnlockedStorageKey)
    sessionStorage.setItem(trustedDeviceUnlockSuppressedStorageKey, '1')
    clearSupabaseAppAccessPinHash()
    setIsUnlocked(false)
    setIsRestoringTrustedDevice(false)
    setActiveAdminSection('projects')
  }

  function navigateSection(nextSection: AdminSection) {
    setActiveAdminSection(nextSection)
  }

  if (!isUnlocked) {
    return showIntro || isRestoringTrustedDevice ? <IntroSplash /> : <PinLockPage onUnlock={() => setIsUnlocked(true)} />
  }

  if (showIntro) {
    return <IntroSplash />
  }

  return (
    <AppLayout activeSection={activeAdminSection} onLock={lockApp} onNavigate={navigateSection}>
      <Suspense fallback={<SectionLoading />}>
        {activeAdminSection === 'projects' ? <ProjectsPage /> : null}
        {activeAdminSection === 'prompts' ? <PromptsPage /> : null}
        {activeAdminSection === 'settings' ? <SettingsPage /> : null}
        {activeAdminSection === 'dashboard' ? <DashboardPage /> : null}
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
