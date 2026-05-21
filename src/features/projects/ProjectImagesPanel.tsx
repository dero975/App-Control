import { useEffect, useState } from 'react'
import { Check, Copy, Download, Trash2, Upload } from 'lucide-react'
import { copyToClipboard } from '../../lib/clipboard'
import { AssetName } from './AssetName'
import { homeIconSlotId, type ProjectImageSlot } from './projectImageModel'
import { HomeIconEditorModal } from './HomeIconEditorModal'
import { ImagePreviewModal } from './ImagePreviewModal'
import { imageIntegrationPromptBySlotId } from './projectImageConstants'
import { createDownloadFileName, formatFileSize, optimizeImageFile } from './projectImageFileUtils'

export function ProjectImagesPanel({
  slots,
  onChange,
}: {
  slots: ProjectImageSlot[]
  onChange: (slots: ProjectImageSlot[]) => void
}) {
  const [dragTargetId, setDragTargetId] = useState('')
  const [previewSlot, setPreviewSlot] = useState<ProjectImageSlot | null>(null)
  const [editorSlot, setEditorSlot] = useState<ProjectImageSlot | null>(null)
  const [copiedPromptSlotId, setCopiedPromptSlotId] = useState('')
  const primaryLogoDataUrl = slots.find((slot) => slot.id === 'logo-app')?.dataUrl ?? ''

  useEffect(() => {
    if (!copiedPromptSlotId) return

    const timeout = window.setTimeout(() => setCopiedPromptSlotId(''), 1600)
    return () => window.clearTimeout(timeout)
  }, [copiedPromptSlotId])

  function updateSlot(slotId: string, nextSlot: Partial<ProjectImageSlot>) {
    onChange(slots.map((slot) => (slot.id === slotId ? { ...slot, ...nextSlot } : slot)))
  }

  function clearSlot(slotId: string) {
    updateSlot(slotId, { dataUrl: '', fileName: '', mimeType: '', originalSizeBytes: 0, sizeBytes: 0 })
  }

  function downloadSlot(slot: ProjectImageSlot) {
    if (!slot.dataUrl) return

    const link = document.createElement('a')
    link.href = slot.dataUrl
    link.download = createDownloadFileName(slot)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleImageChange(slotId: string, file: File | undefined) {
    if (!file) return

    const optimizedImage = await optimizeImageFile(file)
    updateSlot(slotId, optimizedImage)
  }

  function handleDrop(slotId: string, fileList: FileList) {
    setDragTargetId('')
    const imageFile = Array.from(fileList).find((file) => file.type.startsWith('image/'))
    void handleImageChange(slotId, imageFile)
  }

  async function copyImagePrompt(slotId: string) {
    const prompt = imageIntegrationPromptBySlotId[slotId]
    if (!prompt) return

    await copyToClipboard(prompt)
    setCopiedPromptSlotId(slotId)
  }

  return (
    <section className="images-section">
      <h3>Immagini</h3>
      <div className="asset-list">
        {slots.map((slot) => (
          <article
            className={dragTargetId === slot.id ? 'asset-item asset-item--dragging' : 'asset-item'}
            key={slot.id}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragTargetId(slot.id)
            }}
            onDragOver={(event) => {
              event.preventDefault()
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDragTargetId('')
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              handleDrop(slot.id, event.dataTransfer.files)
            }}
          >
            {slot.dataUrl ? (
              <button
                type="button"
                className="asset-thumb asset-thumb--button"
                onClick={() => setPreviewSlot(slot)}
                aria-label={`Visualizza ${slot.name}`}
                title={`Visualizza ${slot.name}`}
              >
                <img src={slot.dataUrl} alt="" />
              </button>
            ) : (
              <div className="asset-thumb" aria-hidden="true" />
            )}
            <div className="asset-item__body">
              <div className="asset-item__title-row">
                <AssetName name={slot.name} />
                {imageIntegrationPromptBySlotId[slot.id] ? (
                  <button
                    type="button"
                    className="asset-inline-prompt-button"
                    onClick={() => void copyImagePrompt(slot.id)}
                    aria-label={copiedPromptSlotId === slot.id ? `Prompt copiato per ${slot.name}` : `Copia prompt per ${slot.name}`}
                    title={copiedPromptSlotId === slot.id ? 'Prompt copiato' : 'Copia prompt'}
                  >
                    {copiedPromptSlotId === slot.id ? (
                      <Check aria-hidden="true" className="button-icon" />
                    ) : (
                      <Copy aria-hidden="true" className="button-icon" />
                    )}
                  </button>
                ) : null}
                {slot.id === homeIconSlotId ? (
                  <button
                    type="button"
                    className="asset-inline-prompt-button editor-icon-button"
                    onClick={() => setEditorSlot(slot)}
                    aria-label="Editor icona Home"
                    title="Editor icona Home"
                  >
                    <span className="editor-icon-button__glyph" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {slot.fileName ? <span>{slot.fileName}</span> : null}
              {slot.sizeBytes ? <span>{formatFileSize(slot.sizeBytes)}</span> : null}
            </div>

            <div className="asset-item__actions">
              <label
                className="secondary-button icon-filter-button asset-side-action-button asset-file-button"
                aria-label={`Inserisci immagine per ${slot.name}`}
                title="Inserisci immagine"
              >
                <Upload aria-hidden="true" className="button-icon" />
                <input
                  accept="image/*"
                  type="file"
                  onChange={(event) => {
                    void handleImageChange(slot.id, event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              <button
                type="button"
                className="secondary-button icon-filter-button asset-side-action-button"
                disabled={!slot.dataUrl}
                onClick={() => downloadSlot(slot)}
                aria-label={`Scarica ${slot.name}`}
                title="Scarica immagine"
              >
                <Download aria-hidden="true" className="button-icon" />
              </button>
              {slot.dataUrl ? (
                <button
                  type="button"
                  className="secondary-button icon-filter-button asset-side-action-button trash-button"
                  onClick={() => clearSlot(slot.id)}
                  aria-label={`Rimuovi ${slot.name}`}
                  title={`Rimuovi ${slot.name}`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {previewSlot ? <ImagePreviewModal slot={previewSlot} onClose={() => setPreviewSlot(null)} /> : null}
      {editorSlot ? (
        <HomeIconEditorModal
          fallbackLogoDataUrl={primaryLogoDataUrl}
          slot={editorSlot}
          onClose={() => setEditorSlot(null)}
          onSave={(nextSlot) => {
            updateSlot(editorSlot.id, nextSlot)
            setEditorSlot(null)
          }}
        />
      ) : null}
    </section>
  )
}
