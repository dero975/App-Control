import { useEffect, useState } from 'react'
import { AppLayout } from './app/AppLayout'
import { PinLockPage } from './features/access/PinLockPage'
import { ProjectsPage } from './features/projects/ProjectsPage'
import { PromptsPage } from './features/prompts/PromptsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { appUnlockedStorageKey } from './lib/pinAccess'
import type { AppSection } from './types/app'

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('projects')
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(appUnlockedStorageKey) === '1')
  const [showIntro, setShowIntro] = useState(true)

  useEffect(() => {
    const introTimer = window.setTimeout(() => setShowIntro(false), 5000)
    return () => window.clearTimeout(introTimer)
  }, [])

  function lockApp() {
    sessionStorage.removeItem(appUnlockedStorageKey)
    setIsUnlocked(false)
    setActiveSection('projects')
  }

  if (!isUnlocked) {
    return showIntro ? <IntroSplash /> : <PinLockPage onUnlock={() => setIsUnlocked(true)} />
  }

  if (showIntro) {
    return <IntroSplash />
  }

  return (
    <AppLayout activeSection={activeSection} onLock={lockApp} onNavigate={setActiveSection}>
      {activeSection === 'projects' ? <ProjectsPage /> : null}
      {activeSection === 'prompts' ? <PromptsPage /> : null}
      {activeSection === 'settings' ? <SettingsPage onLock={lockApp} /> : null}
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

export default App
