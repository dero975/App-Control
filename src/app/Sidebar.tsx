import { navigationItems } from './navigation'
import type { AppSection } from '../types/app'

type SidebarProps = {
  activeSection: AppSection
  onLock: () => void
  onNavigate: (section: AppSection) => void
}

export function Sidebar({ activeSection, onLock, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Navigazione principale">
      <div className="sidebar__brand">
        <img
          src="/icons/nav-logo.png"
          srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
          alt="App Control"
          className="brand-logo"
        />
      </div>

      <nav className="sidebar__nav">
        {navigationItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={item.id === activeSection ? 'nav-item nav-item--active' : 'nav-item'}
            onClick={() => onNavigate(item.id)}
          >
            <span>
              <strong>{item.label}</strong>
            </span>
          </button>
        ))}
      </nav>

      <button type="button" className="sidebar-lock-button" onClick={onLock}>
        Esci
      </button>
    </aside>
  )
}
