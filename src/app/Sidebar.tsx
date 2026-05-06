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
        <div>
          <strong>App Control</strong>
          <span>Private workspace</span>
        </div>
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

      <div className="sidebar__footer">
        <span>Light mode</span>
        <strong>Supabase sync</strong>
        <button type="button" className="sidebar-lock-button" onClick={onLock}>
          Esci
        </button>
      </div>
    </aside>
  )
}
