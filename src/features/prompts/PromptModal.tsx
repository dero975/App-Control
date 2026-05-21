import { Plus } from 'lucide-react'
import { PromptCategoryTabs } from './PromptCategoryTabs'
import type { PromptDraft } from './promptPageTypes'

export function PromptModal({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: PromptDraft
  onChange: (field: keyof PromptDraft, value: string) => void
  onClose: () => void
  onSave: () => void
}) {
  const isSaveDisabled = !draft.title.trim() || !draft.fullText.trim()

  return (
    <div className="modal-backdrop prompt-modal-backdrop" role="presentation">
      <div className="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
        <div className="prompt-modal__header">
          <div className="prompt-modal__brand">
            <img
              src="/icons/nav-logo.png"
              srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
              alt="App Control"
              className="prompt-modal__logo"
            />
            <div>
              <h2 id="prompt-modal-title">Nuovo prompt</h2>
            </div>
          </div>
        </div>

        <div className="prompt-modal__body">
          <label className="settings-input">
            <span>Titolo</span>
            <input
              value={draft.title}
              type="text"
              className="prompt-title-input"
              onChange={(event) => onChange('title', event.target.value)}
            />
          </label>

          <label className="settings-input">
            <span>Sezione</span>
            <PromptCategoryTabs value={draft.category} onChange={(category) => onChange('category', category)} />
          </label>

          <label className="settings-input">
            <span>Prompt</span>
            <textarea
              value={draft.fullText}
              rows={12}
              className="prompt-modal__textarea"
              onChange={(event) => onChange('fullText', event.target.value)}
            />
          </label>
        </div>

        <div className="prompt-modal__footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Annulla
          </button>
          <button type="button" className="secondary-button prompt-modal__save" disabled={isSaveDisabled} onClick={onSave}>
            <Plus aria-hidden="true" className="button-icon" />
            Crea prompt
          </button>
        </div>
      </div>
    </div>
  )
}
