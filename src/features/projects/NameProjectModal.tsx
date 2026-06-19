import { useState } from 'react'

export function NameProjectModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: (name: string) => void
}) {
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const canConfirm = trimmed.length > 0

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm(trimmed)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="name-project-title">
        <div>
          <h2 id="name-project-title">Nome del nuovo progetto</h2>
          <p>Dai un nome al progetto per crearlo.</p>
          <input
            type="text"
            className="name-project-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleConfirm()
            }}
            aria-label="Nome del nuovo progetto"
            autoFocus
          />
        </div>
        <div className="confirm-modal__actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="secondary-button" onClick={handleConfirm} disabled={!canConfirm}>
            Crea progetto
          </button>
        </div>
      </div>
    </div>
  )
}
