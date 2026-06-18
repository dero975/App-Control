import type { ReactNode } from 'react'
import type { AppSection } from '../types/app'
import { getNavigationItems } from './navigation'
import { Sidebar } from './Sidebar'

type AppLayoutProps = {
  activeSection: AppSection
  children: ReactNode
  onLock: () => void
  onNavigate: (section: AppSection) => void
}

export function AppLayout({ activeSection, children, onLock, onNavigate }: AppLayoutProps) {
  const navigationItems = getNavigationItems()

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onLock={onLock} onNavigate={onNavigate} />

      <div className="mobile-nav" aria-label="Navigazione mobile">
        <div className="mobile-nav__brand">
          <img
            src="/icons/nav-logo.png"
            srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
            alt="App Control"
            className="brand-logo"
          />
        </div>
        <div className="mobile-nav__controls">
          <select value={activeSection} onChange={(event) => onNavigate(event.target.value as AppSection)}>
            {navigationItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <main className="main-content">{children}</main>
    </div>
  )
}
