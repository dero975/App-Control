export function ConfirmDeletePromptModal({
  promptTitle,
  onCancel,
  onConfirm,
}: {
  promptTitle: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop prompt-modal-backdrop" role="presentation">
      <div className="prompt-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-prompt-title">
        <div className="prompt-confirm-modal__header">
          <div className="prompt-confirm-modal__brand">
            <img
              src="/icons/nav-logo.png"
              srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
              alt="App Control"
              className="prompt-confirm-modal__logo"
            />
            <h2 id="delete-prompt-title">Elimina prompt</h2>
          </div>
        </div>

        <div className="prompt-confirm-modal__body">
          <p>
            Stai per eliminare <strong>{promptTitle}</strong>.
          </p>
          <p>Questa azione non e reversibile.</p>
        </div>

        <div className="confirm-modal__actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            Elimina prompt
          </button>
        </div>
      </div>
    </div>
  )
}
