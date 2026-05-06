import { useState } from 'react'
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

  function lockApp() {
    sessionStorage.removeItem(appUnlockedStorageKey)
    setIsUnlocked(false)
    setActiveSection('projects')
  }

  if (!isUnlocked) {
    return <PinLockPage onUnlock={() => setIsUnlocked(true)} />
  }

  return (
    <AppLayout activeSection={activeSection} onLock={lockApp} onNavigate={setActiveSection}>
      {activeSection === 'projects' ? <ProjectsPage /> : null}
      {activeSection === 'prompts' ? <PromptsPage /> : null}
      {activeSection === 'settings' ? <SettingsPage onLock={lockApp} /> : null}
    </AppLayout>
  )
}

export default App
