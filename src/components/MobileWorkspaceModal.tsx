import type { ReactNode } from 'react'

export function MobileWorkspaceModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="modal-backdrop mobile-workspace-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="mobile-workspace-modal" role="dialog" aria-modal="true" aria-labelledby="mobile-workspace-modal-title" onClick={(event) => event.stopPropagation()}>
        <header className="mobile-workspace-modal__header">
          <div className="mobile-workspace-modal__header-copy">
            <h2 id="mobile-workspace-modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="mobile-workspace-modal__body">{children}</div>
      </div>
    </div>
  )
}
