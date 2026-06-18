import { useState } from 'react'
import { getNavigationItems } from './navigation'
import type { AppSection } from '../types/app'
import { copyToClipboard } from '../lib/clipboard'

const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/1bmNXfzFZpisko8M6MpN7gOnw8U3ibQGXXbEmXRBvOmA/edit?gid=832828269#gid=832828269'
const githubCliAuthCommand = 'gh auth login -h github.com -p https -w'
const githubTokenUrl = 'https://github.com/settings/tokens/new'

type SidebarProps = {
  activeSection: AppSection
  onLock: () => void
  onNavigate: (section: AppSection) => void
}

export function Sidebar({ activeSection, onLock, onNavigate }: SidebarProps) {
  const navigationItems = getNavigationItems()
  const [showGitHubAuthToast, setShowGitHubAuthToast] = useState(false)

  async function startGitHubCliAuth() {
    await copyToClipboard(githubCliAuthCommand)
    setShowGitHubAuthToast(true)
    window.setTimeout(() => setShowGitHubAuthToast(false), 2200)
  }

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

      <div className="sidebar__footer-actions">
        <div className="sidebar-newproject-guide" aria-label="Promemoria nuovo progetto">
          <span className="sidebar-newproject-guide__title">Nuovo progetto — i tuoi step</span>
          <ol className="sidebar-newproject-guide__list">
            <li>Crea account: GitHub, Supabase, Render</li>
            <li>Crea progetto in App Control + 5 variabili</li>
            <li>Copia il testo del tab Sync</li>
            <li>In Devin incolla: prompt bootstrap + testo Sync</li>
          </ol>
        </div>

        <a className="sidebar-token-link" href={githubTokenUrl} target="_blank" rel="noreferrer">
          <GitHubMarkIcon />
          Token Github
        </a>
        <button type="button" className="sidebar-cli-auth-button" onClick={() => void startGitHubCliAuth()}>
          Auth Github 8
        </button>
        {showGitHubAuthToast ? (
          <div className="sidebar-auth-toast" role="status" aria-live="polite">
            <strong>Comando copiato</strong>
            <span>Apri Terminale e incolla.</span>
          </div>
        ) : null}
        <a className="sidebar-utility-button" href={googleSheetUrl} target="_blank" rel="noreferrer">
          Foglio Google
        </a>

        <button type="button" className="sidebar-lock-button" onClick={onLock}>
          Esci
        </button>
      </div>
    </aside>
  )
}

function GitHubMarkIcon() {
  return (
    <svg className="sidebar-token-link__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.22c0 4.52 2.87 8.35 6.84 9.7.5.09.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.51.47-3.16-.63-3.36-1.2-.11-.29-.6-1.19-1.02-1.43-.35-.19-.85-.66-.01-.67.79-.01 1.35.74 1.54 1.05.9 1.55 2.34 1.11 2.91.85.09-.67.35-1.11.64-1.37-2.22-.26-4.55-1.14-4.55-5.05 0-1.11.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.71 0 0 .84-.27 2.75 1.05.8-.23 1.65-.34 2.5-.34s1.7.11 2.5.34c1.91-1.32 2.75-1.05 2.75-1.05.55 1.4.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.05 10.05 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  )
}
