import { ChevronDown, ChevronUp, PencilLine, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton } from '../../components/CopyButton'
import { EmptyState } from '../../components/EmptyState'
import { SectionHeader } from '../../components/SectionHeader'
import { promptCategories, prompts as initialPrompts } from '../../data/mockData'
import type { Prompt, PromptCategory } from '../../types/app'

type PromptDraft = {
  title: string
  category: PromptCategory
  fullText: string
}

const defaultPromptCategory = promptCategories[0]

export function PromptsPage() {
  const [promptList, setPromptList] = useState<Prompt[]>(() => initialPrompts)
  const [activeCategory, setActiveCategory] = useState<'Tutte' | PromptCategory>('Tutte')
  const [openPromptId, setOpenPromptId] = useState(initialPrompts[0]?.id ?? '')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [draft, setDraft] = useState<PromptDraft>(() => createEmptyPromptDraft())
  const [editingPromptId, setEditingPromptId] = useState('')
  const [editDraft, setEditDraft] = useState<PromptDraft>(() => createEmptyPromptDraft())

  const filteredPrompts = useMemo(() => {
    return activeCategory === 'Tutte' ? promptList : promptList.filter((prompt) => prompt.category === activeCategory)
  }, [activeCategory, promptList])

  function openCreatePromptModal() {
    setDraft(createEmptyPromptDraft())
    setCreateModalOpen(true)
  }

  function openEditPrompt(prompt: Prompt) {
    setEditDraft({
      title: prompt.title,
      category: prompt.category,
      fullText: prompt.fullText,
    })
    setEditingPromptId(prompt.id)
    setOpenPromptId(prompt.id)
  }

  function closePromptModal() {
    setCreateModalOpen(false)
  }

  function handleDraftChange(field: keyof PromptDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]:
        field === 'category'
          ? (value as PromptCategory)
          : field === 'title'
            ? normalizePromptTitle(value)
            : value,
    }))
  }

  function savePrompt() {
    const title = normalizePromptTitle(draft.title.trim())
    const fullText = draft.fullText.trim()
    if (!title || !fullText) return

    const newPrompt: Prompt = {
      id: createPromptId(),
      title,
      category: draft.category,
      fullText,
    }

    setPromptList((current) => [...current, newPrompt])
    setOpenPromptId(newPrompt.id)
    if (activeCategory !== 'Tutte' && activeCategory !== newPrompt.category) {
      setActiveCategory(newPrompt.category)
    }
    closePromptModal()
  }

  function handleEditDraftChange(field: keyof PromptDraft, value: string) {
    setEditDraft((current) => ({
      ...current,
      [field]:
        field === 'category'
          ? (value as PromptCategory)
          : field === 'title'
            ? normalizePromptTitle(value)
            : value,
    }))
  }

  function saveEditedPrompt(promptId: string) {
    const title = normalizePromptTitle(editDraft.title.trim())
    const fullText = editDraft.fullText.trim()
    if (!title || !fullText) return

    setPromptList((current) =>
      current.map((prompt) => (prompt.id === promptId ? { ...prompt, title, category: editDraft.category, fullText } : prompt)),
    )
    setEditingPromptId('')
  }

  function cancelEditPrompt() {
    setEditingPromptId('')
  }

  function deletePrompt(promptId: string) {
    setPromptList((current) => current.filter((prompt) => prompt.id !== promptId))
    setOpenPromptId((current) => (current === promptId ? '' : current))
    setEditingPromptId((current) => (current === promptId ? '' : current))
  }

  return (
    <div className="page-stack prompts-page">
      <SectionHeader
        title="Libreria Prompt"
      />

      <div className="prompt-toolbar">
        <div className="prompt-category-bar" role="tablist" aria-label="Categorie prompt">
          <button
            type="button"
            className={activeCategory === 'Tutte' ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => setActiveCategory('Tutte')}
          >
            Tutte
          </button>
          {promptCategories.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <button type="button" className="secondary-button prompt-toolbar__create" onClick={openCreatePromptModal}>
          <Plus aria-hidden="true" className="button-icon" />
          Nuovo prompt
        </button>
      </div>

      {filteredPrompts.length ? (
        <div className="prompt-library" aria-label="Prompt disponibili">
          {filteredPrompts.map((prompt) => (
            <PromptLibraryCard
              key={prompt.id}
              prompt={prompt}
              open={prompt.id === openPromptId}
              isEditing={prompt.id === editingPromptId}
              editDraft={prompt.id === editingPromptId ? editDraft : null}
              onDelete={() => deletePrompt(prompt.id)}
              onEdit={() => openEditPrompt(prompt)}
              onEditChange={handleEditDraftChange}
              onEditCancel={cancelEditPrompt}
              onEditSave={() => saveEditedPrompt(prompt.id)}
              onToggle={() => setOpenPromptId((current) => (current === prompt.id ? '' : prompt.id))}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nessun prompt in questa categoria"
          message="Aggiungi un nuovo prompt oppure torna alla vista completa per consultarli tutti."
        />
      )}

      {createModalOpen ? (
        <PromptModal
          draft={draft}
          onChange={handleDraftChange}
          onClose={closePromptModal}
          onSave={savePrompt}
        />
      ) : null}
    </div>
  )
}

function PromptLibraryCard({
  prompt,
  open,
  isEditing,
  editDraft,
  onDelete,
  onEdit,
  onEditCancel,
  onEditChange,
  onEditSave,
  onToggle,
}: {
  prompt: Prompt
  open: boolean
  isEditing: boolean
  editDraft: PromptDraft | null
  onDelete: () => void
  onEdit: () => void
  onEditCancel: () => void
  onEditChange: (field: keyof PromptDraft, value: string) => void
  onEditSave: () => void
  onToggle: () => void
}) {
  const isEditSaveDisabled = !editDraft?.title.trim() || !editDraft?.fullText.trim()

  return (
    <article className={open ? 'prompt-library-card prompt-library-card--open' : 'prompt-library-card'}>
      <div className="prompt-library-card__header">
        <div className="prompt-library-card__actions">
          <CopyButton value={prompt.fullText} />
          <button type="button" className="icon-button prompt-card-action" onClick={onEdit} title="Modifica prompt" aria-label="Modifica prompt">
            <PencilLine aria-hidden="true" className="button-icon" />
          </button>
          <button type="button" className="icon-button prompt-card-action prompt-card-action--danger" onClick={onDelete} title="Elimina prompt" aria-label="Elimina prompt">
            <Trash2 aria-hidden="true" className="button-icon" />
          </button>
        </div>

        <button type="button" className="prompt-library-card__toggle" onClick={onToggle} aria-expanded={open}>
          <div className="prompt-library-card__heading">
            <h3>{prompt.title}</h3>
          </div>
          <span className="prompt-library-card__toggle-icon" aria-hidden="true">
            {open ? <ChevronUp className="button-icon" /> : <ChevronDown className="button-icon" />}
          </span>
        </button>
      </div>

      {open ? (
        <div className="prompt-library-card__content">
          {isEditing && editDraft ? (
            <>
              <div className="prompt-library-card__editor">
                <label className="settings-input">
                  <span>Titolo</span>
                  <input value={editDraft.title} type="text" onChange={(event) => onEditChange('title', event.target.value)} />
                </label>

                <label className="settings-input">
                  <span>Sezione</span>
                  <select value={editDraft.category} onChange={(event) => onEditChange('category', event.target.value)}>
                    {promptCategories.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="settings-input">
                  <span>Prompt</span>
                  <textarea
                    value={editDraft.fullText}
                    rows={9}
                    className="prompt-library-card__textarea"
                    onChange={(event) => onEditChange('fullText', event.target.value)}
                  />
                </label>
              </div>

              <div className="prompt-library-card__footer">
                <button type="button" className="secondary-button" onClick={onEditCancel}>
                  Annulla
                </button>
                <button type="button" className="secondary-button secondary-button--compact" disabled={isEditSaveDisabled} onClick={onEditSave}>
                  Salva modifiche
                </button>
              </div>
            </>
          ) : (
            <textarea value={prompt.fullText} readOnly rows={9} className="prompt-library-card__textarea" />
          )}
        </div>
      ) : null}
    </article>
  )
}

function PromptModal({
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
              <p>Compila titolo, sezione e testo del prompt mantenendo una struttura chiara e riutilizzabile.</p>
            </div>
          </div>

          <button type="button" className="secondary-button prompt-modal__close" onClick={onClose} aria-label="Chiudi modale prompt">
            <X aria-hidden="true" className="button-icon" />
          </button>
        </div>

        <div className="prompt-modal__body">
          <label className="settings-input">
            <span>Titolo</span>
            <input value={draft.title} type="text" onChange={(event) => onChange('title', event.target.value)} />
          </label>

          <label className="settings-input">
            <span>Sezione</span>
            <select value={draft.category} onChange={(event) => onChange('category', event.target.value)}>
              {promptCategories.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
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

function createEmptyPromptDraft(): PromptDraft {
  return {
    title: '',
    category: defaultPromptCategory,
    fullText: '',
  }
}

function createPromptId() {
  return `prompt-${Date.now()}`
}

function normalizePromptTitle(value: string) {
  if (!value) return ''
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}
