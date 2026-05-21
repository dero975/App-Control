export function HomeIconEditorHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="home-icon-editor__header">
      <div>
        <img
          src="/icons/nav-logo.png"
          srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
          alt="App Control"
          className="home-icon-editor__logo"
        />
      </div>
      <button type="button" className="secondary-button" onClick={onClose}>
        Chiudi
      </button>
    </header>
  )
}

export function HomeIconEditorFooter({
  status,
  onReset,
  onSave,
}: {
  status: string
  onReset: () => void
  onSave: () => void
}) {
  return (
    <footer className="home-icon-editor__footer">
      <span>{status || 'Formato finale 512x512 PNG leggero e pronto per schermata Home.'}</span>
      <div className="home-icon-editor__footer-actions">
        <button type="button" className="secondary-button" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="secondary-button" onClick={onSave}>
          Salva icona
        </button>
      </div>
    </footer>
  )
}
