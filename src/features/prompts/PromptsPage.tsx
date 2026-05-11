import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { CopyButton } from '../../components/CopyButton'
import { EmptyState } from '../../components/EmptyState'
import { SectionHeader } from '../../components/SectionHeader'
import type { Prompt, PromptCategory } from '../../types/app'
import { defaultPromptCategory, promptCategories } from './promptCatalog'
import { createPromptRecord, deletePromptRecord, fetchPrompts, updatePromptRecord } from './promptRepository'

type PromptDraft = {
  title: string
  category: PromptCategory
  fullText: string
}

export function PromptsPage() {
  const [promptList, setPromptList] = useState<Prompt[]>([])
  const [activeCategory, setActiveCategory] = useState<'Tutte' | PromptCategory>('Tutte')
  const [openPromptId, setOpenPromptId] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<Prompt | null>(null)
  const [draft, setDraft] = useState<PromptDraft>(() => createEmptyPromptDraft())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const saveTimeoutsRef = useRef<Record<string, number>>({})
  const dragSourcePromptIdRef = useRef('')
  const dragStartOrderRef = useRef<string[]>([])
  const [draggingPromptId, setDraggingPromptId] = useState('')
  const [dragPreviewOrder, setDragPreviewOrder] = useState<string[] | null>(null)
  const [dragOverPromptId, setDragOverPromptId] = useState('')

  const filteredPrompts = useMemo(() => {
    const nextPrompts = activeCategory === 'Tutte' ? promptList : promptList.filter((prompt) => prompt.category === activeCategory)

    if (activeCategory === 'Tutte') {
      return [...nextPrompts].sort((left, right) => left.title.localeCompare(right.title, 'it', { sensitivity: 'base' }))
    }

    if (dragPreviewOrder?.length) {
      const promptById = new Map(nextPrompts.map((prompt) => [prompt.id, prompt]))
      return dragPreviewOrder.map((promptId) => promptById.get(promptId)).filter((prompt): prompt is Prompt => Boolean(prompt))
    }

    return [...nextPrompts].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
      return left.title.localeCompare(right.title, 'it', { sensitivity: 'base' })
    })
  }, [activeCategory, dragPreviewOrder, promptList])

  useEffect(() => {
    let active = true

    void loadPrompts()

    return () => {
      active = false
      for (const timeoutId of Object.values(saveTimeoutsRef.current)) {
        window.clearTimeout(timeoutId)
      }
      saveTimeoutsRef.current = {}
    }

    async function loadPrompts() {
      setIsLoading(true)
      try {
        const prompts = await fetchPrompts()
        if (!active) return
        setPromptList(prompts)
        setOpenPromptId((current) => (current && prompts.some((prompt) => prompt.id === current) ? current : ''))
        setErrorMessage('')
      } catch (error) {
        if (!active) return
        setPromptList([])
        setErrorMessage(error instanceof Error ? error.message : 'Errore caricamento prompt')
      } finally {
        if (active) setIsLoading(false)
      }
    }
  }, [])

  function openCreatePromptModal() {
    setDraft(createEmptyPromptDraft())
    setCreateModalOpen(true)
    setErrorMessage('')
  }

  function setActivePromptCategory(nextCategory: 'Tutte' | PromptCategory) {
    dragSourcePromptIdRef.current = ''
    dragStartOrderRef.current = []
    setDraggingPromptId('')
    setDragPreviewOrder(null)
    setDragOverPromptId('')
    setActiveCategory(nextCategory)
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

  async function savePrompt() {
    const title = normalizePromptTitle(draft.title.trim())
    const fullText = draft.fullText.trim()
    if (!title || !fullText) return

    try {
      const newPrompt = await createPromptRecord({
        title,
        category: draft.category,
        fullText,
        sortOrder: getNextPromptSortOrder(promptList, draft.category),
      })

      setPromptList((current) => [...current, newPrompt])
      setOpenPromptId(newPrompt.id)
      if (activeCategory !== 'Tutte' && activeCategory !== newPrompt.category) {
        setActiveCategory(newPrompt.category)
      }
      setErrorMessage('')
      closePromptModal()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Errore creazione prompt')
    }
  }

  function handlePromptChange(promptId: string, field: keyof PromptDraft, value: string) {
    if (field === 'category') {
      handlePromptCategoryChange(promptId, value as PromptCategory)
      return
    }

    const nextValue = field === 'title' ? normalizePromptTitle(value) : value

    setPromptList((current) => {
      const nextPrompts = current.map((prompt) => (prompt.id === promptId ? { ...prompt, [field]: nextValue } : prompt))
      const nextPrompt = nextPrompts.find((prompt) => prompt.id === promptId)
      if (nextPrompt) schedulePromptSave(nextPrompt)
      return nextPrompts
    })
  }

  function handlePromptCategoryChange(promptId: string, nextCategory: PromptCategory) {
    setPromptList((current) => {
      const targetPrompt = current.find((prompt) => prompt.id === promptId)
      if (!targetPrompt || targetPrompt.category === nextCategory) return current

      const nextSortOrder = getNextPromptSortOrder(current.filter((prompt) => prompt.id !== promptId), nextCategory)
      const nextPrompt = { ...targetPrompt, category: nextCategory, sortOrder: nextSortOrder }
      const nextPrompts = current.map((prompt) => (prompt.id === promptId ? nextPrompt : prompt))
      schedulePromptSave(nextPrompt)
      return nextPrompts
    })
  }

  async function deletePrompt() {
    if (!deleteCandidate) return

    const promptId = deleteCandidate.id
    clearScheduledPromptSave(promptId)

    try {
      await deletePromptRecord(promptId)
      setPromptList((current) => current.filter((prompt) => prompt.id !== promptId))
      setOpenPromptId((current) => (current === promptId ? '' : current))
      setDeleteCandidate(null)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Errore eliminazione prompt')
    }
  }

  function schedulePromptSave(prompt: Prompt) {
    clearScheduledPromptSave(prompt.id)
    saveTimeoutsRef.current[prompt.id] = window.setTimeout(() => {
      void persistPrompt(prompt)
    }, 450)
  }

  function clearScheduledPromptSave(promptId: string) {
    const timeoutId = saveTimeoutsRef.current[promptId]
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      delete saveTimeoutsRef.current[promptId]
    }
  }

  async function persistPrompt(prompt: Prompt) {
    clearScheduledPromptSave(prompt.id)
    try {
      await updatePromptRecord(prompt.id, {
        title: normalizePromptTitle(prompt.title),
        category: prompt.category,
        fullText: prompt.fullText,
        sortOrder: prompt.sortOrder,
      })
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Errore aggiornamento prompt')
    }
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, promptId: string) {
    if (activeCategory === 'Tutte') return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', promptId)
    dragSourcePromptIdRef.current = promptId
    dragStartOrderRef.current = filteredPrompts.map((prompt) => prompt.id)
    setDraggingPromptId(promptId)
    setDragPreviewOrder(filteredPrompts.map((prompt) => prompt.id))
    setDragOverPromptId(promptId)
  }

  function handleDragEnter(promptId: string) {
    if (activeCategory === 'Tutte') return
    const sourcePromptId = dragSourcePromptIdRef.current
    if (!sourcePromptId || sourcePromptId === promptId) return
    setDragOverPromptId(promptId)

    setDragPreviewOrder((current) => {
      const baseOrder = current?.length ? current : filteredPrompts.map((prompt) => prompt.id)
      const sourceIndex = baseOrder.indexOf(sourcePromptId)
      const targetIndex = baseOrder.indexOf(promptId)
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return baseOrder

      const nextOrder = [...baseOrder]
      nextOrder.splice(sourceIndex, 1)
      nextOrder.splice(targetIndex, 0, sourcePromptId)
      return nextOrder
    })
  }

  async function handleDragEnd() {
    if (activeCategory === 'Tutte') return

    const sourcePromptId = dragSourcePromptIdRef.current
    const previewOrder = dragPreviewOrder
    const startOrder = dragStartOrderRef.current

    dragSourcePromptIdRef.current = ''
    dragStartOrderRef.current = []
    setDraggingPromptId('')
    setDragOverPromptId('')

    if (!sourcePromptId || !previewOrder?.length || previewOrder.join('|') === startOrder.join('|')) {
      setDragPreviewOrder(null)
      return
    }

    const category = activeCategory
    const promptById = new Map(promptList.map((prompt) => [prompt.id, prompt]))
    const nextCategoryPrompts = previewOrder
      .map((promptId, index) => {
        const prompt = promptById.get(promptId)
        return prompt ? { ...prompt, sortOrder: index } : null
      })
      .filter((prompt): prompt is Prompt => Boolean(prompt))

    setPromptList((current) =>
      current.map((prompt) => {
        if (prompt.category !== category) return prompt
        const nextPrompt = nextCategoryPrompts.find((item) => item.id === prompt.id)
        return nextPrompt ?? prompt
      }),
    )

    setDragPreviewOrder(null)

    try {
      await Promise.all(
        nextCategoryPrompts.map((prompt, index) =>
          updatePromptRecord(prompt.id, {
            title: normalizePromptTitle(prompt.title),
            category: prompt.category,
            fullText: prompt.fullText,
            sortOrder: index,
          }),
        ),
      )
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Errore riordino prompt')
      try {
        const prompts = await fetchPrompts()
        setPromptList(prompts)
      } catch {
        // keep current local state if reload fails
      }
    }
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
            onClick={() => setActivePromptCategory('Tutte')}
          >
            Tutte
          </button>
          {promptCategories.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => setActivePromptCategory(category)}
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

      {errorMessage ? <p className="status-message status-message--error">{errorMessage}</p> : null}

      {isLoading ? (
        <EmptyState title="Caricamento prompt" message="Sto leggendo la libreria Prompt da Supabase." />
      ) : filteredPrompts.length ? (
        <div className="prompt-library" aria-label="Prompt disponibili">
          {filteredPrompts.map((prompt) => (
            <PromptLibraryCard
              key={prompt.id}
              prompt={prompt}
              open={prompt.id === openPromptId}
              draggable={activeCategory !== 'Tutte'}
              isDragPreviewActive={Boolean(dragPreviewOrder?.length)}
              isDragging={draggingPromptId === prompt.id}
              isDragOver={dragOverPromptId === prompt.id && draggingPromptId !== prompt.id}
              onDragStart={(event) => handleDragStart(event, prompt.id)}
              onDragEnter={() => handleDragEnter(prompt.id)}
              onDragEnd={() => void handleDragEnd()}
              onDelete={() => setDeleteCandidate(prompt)}
              onChange={(field, value) => handlePromptChange(prompt.id, field, value)}
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

      {deleteCandidate ? (
        <ConfirmDeletePromptModal
          promptTitle={deleteCandidate.title}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={deletePrompt}
        />
      ) : null}
    </div>
  )
}

function PromptLibraryCard({
  prompt,
  open,
  draggable,
  isDragPreviewActive,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDelete,
  onChange,
  onToggle,
}: {
  prompt: Prompt
  open: boolean
  draggable: boolean
  isDragPreviewActive: boolean
  isDragging: boolean
  isDragOver: boolean
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void
  onDragEnter: () => void
  onDragEnd: () => void
  onDelete: () => void
  onChange: (field: keyof PromptDraft, value: string) => void
  onToggle: () => void
}) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const dragPreviewRef = useRef<HTMLElement | null>(null)
  const rowClassName = [
    'prompt-library-row',
    draggable ? 'prompt-library-row--sortable' : '',
    isDragPreviewActive ? 'prompt-library-row--sorting' : '',
    isDragging ? 'prompt-library-row--dragging' : '',
    isDragOver ? 'prompt-library-row--drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ')

  function cleanupDragPreview() {
    dragPreviewRef.current?.remove()
    dragPreviewRef.current = null
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    onDragStart(event)

    const rowElement = rowRef.current
    if (!rowElement) return

    const rowRect = rowElement.getBoundingClientRect()
    const dragPreview = rowElement.cloneNode(true) as HTMLDivElement
    dragPreview.classList.add('prompt-library-row--drag-preview')
    dragPreview.style.width = `${Math.round(rowRect.width)}px`
    dragPreview.style.position = 'fixed'
    dragPreview.style.top = '-10000px'
    dragPreview.style.left = '-10000px'
    dragPreview.style.pointerEvents = 'none'
    dragPreview.style.zIndex = '9999'
    document.body.appendChild(dragPreview)
    dragPreviewRef.current = dragPreview

    const dragOffsetX = Math.min(32, Math.max(20, rowRect.width * 0.08))
    const dragOffsetY = rowRect.height / 2
    event.dataTransfer.setDragImage(dragPreview, dragOffsetX, dragOffsetY)
  }

  function handleDragEnd() {
    cleanupDragPreview()
    onDragEnd()
  }

  return (
    <div
      ref={rowRef}
      className={rowClassName}
      onDragEnter={draggable ? onDragEnter : undefined}
      onDragOver={draggable ? (event) => event.preventDefault() : undefined}
    >
      {draggable ? (
        <button
          type="button"
          draggable
          className="inline-icon-button prompt-drag-handle"
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          title="Trascina per riordinare"
          aria-label="Trascina per riordinare"
        >
          <GripVertical aria-hidden="true" className="button-icon" />
        </button>
      ) : null}

      <article className={['prompt-library-card', open ? 'prompt-library-card--open' : ''].filter(Boolean).join(' ')}>
        <div className="prompt-library-card__header">
          <div className="prompt-library-card__actions">
            <CopyButton value={buildPromptClipboardValue(prompt)} />
          </div>

          <button type="button" className="prompt-library-card__toggle" onClick={onToggle} aria-expanded={open}>
            {open ? <span className="prompt-library-card__heading prompt-library-card__heading--hidden" aria-hidden="true" /> : (
              <div className="prompt-library-card__heading">
                <h3>{prompt.title}</h3>
              </div>
            )}
            <span className="prompt-library-card__toggle-icon" aria-hidden="true">
              {open ? <ChevronUp className="button-icon" /> : <ChevronDown className="button-icon" />}
            </span>
          </button>

          <button
            type="button"
            className="inline-icon-button trash-button"
            onClick={onDelete}
            title="Elimina prompt"
            aria-label="Elimina prompt"
          >
            <Trash2 aria-hidden="true" className="button-icon" />
          </button>
        </div>

        {open ? (
          <div className="prompt-library-card__content">
            <div className="prompt-library-card__editor">
              <label className="settings-input">
                <span>Titolo</span>
                <input
                  value={prompt.title}
                  type="text"
                  className="prompt-title-input"
                  onChange={(event) => onChange('title', event.target.value)}
                />
              </label>

              <label className="settings-input">
                <span>Sezione</span>
                <PromptCategoryTabs value={prompt.category} onChange={(category) => onChange('category', category)} />
              </label>

              <label className="settings-input">
                <span>Prompt</span>
                <textarea
                  value={prompt.fullText}
                  rows={9}
                  className="prompt-library-card__textarea"
                  onChange={(event) => onChange('fullText', event.target.value)}
                />
              </label>
            </div>
          </div>
        ) : null}
      </article>
    </div>
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

function ConfirmDeletePromptModal({
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

function createEmptyPromptDraft(): PromptDraft {
  return {
    title: '',
    category: defaultPromptCategory,
    fullText: '',
  }
}

function getNextPromptSortOrder(prompts: Prompt[], category: PromptCategory) {
  const categoryPrompts = prompts.filter((prompt) => prompt.category === category)
  if (!categoryPrompts.length) return 0
  return Math.max(...categoryPrompts.map((prompt) => prompt.sortOrder)) + 1
}

function normalizePromptTitle(value: string) {
  if (!value) return ''
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function buildPromptClipboardValue(prompt: Prompt) {
  const title = prompt.title.trim()
  const fullText = stripPromptTitlePrefix(prompt.fullText, title)

  if (!title) return fullText
  if (!fullText) return title

  return `${title}\n\n${fullText}`
}

function stripPromptTitlePrefix(value: string, title: string) {
  const fullText = value.trim()
  if (!fullText) return ''

  const normalizedTitle = title.trim().toLowerCase()
  const lines = fullText.split(/\r?\n/)
  const firstLine = lines[0]?.trim().toLowerCase() ?? ''

  if (normalizedTitle && firstLine === `titolo: ${normalizedTitle}`) {
    return lines.slice(1).join('\n').trim()
  }

  return fullText
}

function PromptCategoryTabs({
  value,
  onChange,
}: {
  value: PromptCategory
  onChange: (category: PromptCategory) => void
}) {
  return (
    <div className="prompt-category-tabs" role="tablist" aria-label="Sezione prompt">
      {promptCategories.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={value === category}
          className={value === category ? 'tab-button tab-button--active' : 'tab-button'}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
