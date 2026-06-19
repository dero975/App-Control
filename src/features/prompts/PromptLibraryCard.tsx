import { ChevronDown, ChevronUp, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { useRef, type DragEvent } from 'react'
import { CopyButton } from '../../components/CopyButton'
import type { Prompt } from '../../types/app'
import { PromptCategoryTabs } from './PromptCategoryTabs'
import type { PromptDraft } from './promptPageTypes'
import { buildPromptClipboardValue } from './promptPageUtils'

export function PromptLibraryCard({
  prompt,
  open,
  editing,
  draggable,
  isDragPreviewActive,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDelete,
  onChange,
  onEdit,
  onToggle,
}: {
  prompt: Prompt
  open: boolean
  editing: boolean
  draggable: boolean
  isDragPreviewActive: boolean
  isDragging: boolean
  isDragOver: boolean
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void
  onDragEnter: () => void
  onDragEnd: () => void
  onDelete: () => void
  onChange: (field: keyof PromptDraft, value: string) => void
  onEdit: () => void
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

      <article
        className={['prompt-library-card', open ? 'prompt-library-card--open' : '', editing ? 'prompt-library-card--editing' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <div className="prompt-library-card__header">
          <div className="prompt-library-card__actions">
            <CopyButton value={buildPromptClipboardValue(prompt)} iconOnly />
          </div>

          <button type="button" className="prompt-library-card__toggle" onClick={onToggle} aria-expanded={open}>
            {open ? (
              <span className="prompt-library-card__heading prompt-library-card__heading--hidden" aria-hidden="true" />
            ) : (
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
            className={['inline-icon-button prompt-edit-button', editing ? 'prompt-edit-button--active' : ''].filter(Boolean).join(' ')}
            onClick={onEdit}
            title={editing ? 'Blocca modifica prompt' : 'Modifica prompt'}
            aria-label={editing ? 'Blocca modifica prompt' : 'Modifica prompt'}
            aria-pressed={editing}
          >
            <Pencil aria-hidden="true" className="button-icon" />
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
                  readOnly={!editing}
                  onChange={(event) => onChange('title', event.target.value)}
                />
              </label>

              <label className="settings-input">
                <span>Sezione</span>
                <PromptCategoryTabs value={prompt.category} disabled={!editing} onChange={(category) => onChange('category', category)} />
              </label>

              <label className="settings-input">
                <span>Prompt</span>
                <textarea
                  value={prompt.fullText}
                  rows={9}
                  className="prompt-library-card__textarea"
                  readOnly={!editing}
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
