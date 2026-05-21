import { useEffect, useRef, useState } from 'react'
import { Pipette, Upload } from 'lucide-react'
import type { ProjectImageSlot } from './projectImageModel'
import {
  defaultHomeIconBackgroundColor,
  defaultHomeIconGradientColor,
  gradientModeOptions,
  homeIconEditorSize,
  type GradientMode,
} from './projectImageConstants'
import { deriveBorderColor, drawHomeIcon, renderHomeIconBlob } from './homeIconRenderer'
import { HomeIconEditorFooter, HomeIconEditorHeader } from './HomeIconEditorChrome'
import { readBlobAsDataUrl } from './projectImageFileUtils'

export function HomeIconEditorModal({
  fallbackLogoDataUrl,
  slot,
  onClose,
  onSave,
}: {
  fallbackLogoDataUrl: string
  slot: ProjectImageSlot
  onClose: () => void
  onSave: (slot: Partial<ProjectImageSlot>) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [backgroundColor, setBackgroundColor] = useState(defaultHomeIconBackgroundColor)
  const [gradientColor, setGradientColor] = useState(defaultHomeIconGradientColor)
  const [gradientEnabled, setGradientEnabled] = useState(true)
  const [gradientMode, setGradientMode] = useState<GradientMode>('linear')
  const [borderEnabled, setBorderEnabled] = useState(false)
  const [borderColor, setBorderColor] = useState(() => deriveBorderColor(defaultHomeIconBackgroundColor))
  const [borderColorLocked, setBorderColorLocked] = useState(true)
  const [borderWidth, setBorderWidth] = useState(28)
  const [logoDataUrl, setLogoDataUrl] = useState(slot.dataUrl || fallbackLogoDataUrl)
  const [logoScale, setLogoScale] = useState(62)
  const [dragActive, setDragActive] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let isMounted = true

    async function renderPreview() {
      try {
        await drawHomeIcon(canvasRef.current, {
          backgroundColor,
          borderColor,
          borderEnabled,
          borderWidth,
          gradientColor,
          gradientEnabled,
          gradientMode,
          logoDataUrl,
          logoScale,
        })
      } catch {
        if (isMounted) setStatus('Immagine non leggibile')
      }
    }

    void renderPreview()

    return () => {
      isMounted = false
    }
  }, [
    backgroundColor,
    borderColor,
    borderEnabled,
    borderWidth,
    gradientColor,
    gradientEnabled,
    gradientMode,
    logoDataUrl,
    logoScale,
  ])

  async function importLogo(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('Seleziona un file immagine')
      return
    }

    setStatus('')
    setLogoDataUrl(await readBlobAsDataUrl(file))
  }

  async function saveIcon() {
    setStatus('Generazione icona')
    const blob = await renderHomeIconBlob({
      backgroundColor,
      borderColor,
      borderEnabled,
      borderWidth,
      gradientColor,
      gradientEnabled,
      gradientMode,
      logoDataUrl,
      logoScale,
    })
    const dataUrl = await readBlobAsDataUrl(blob)

    onSave({
      dataUrl,
      fileName: 'Icona Schermata Home.png',
      mimeType: 'image/png',
      originalSizeBytes: blob.size,
      sizeBytes: blob.size,
    })
  }

  function handleDrop(fileList: FileList) {
    setDragActive(false)
    void importLogo(Array.from(fileList).find((file) => file.type.startsWith('image/')))
  }

  function updateBackgroundColor(value: string) {
    setBackgroundColor(value)
    if (borderColorLocked) {
      setBorderColor(deriveBorderColor(value))
    }
  }

  function updateBorderColor(value: string) {
    setBorderColor(value)
    setBorderColorLocked(false)
  }

  async function sampleColor(onSample: (value: string) => void) {
    const EyeDropperConstructor = (
      window as Window & {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
      }
    ).EyeDropper

    if (!EyeDropperConstructor) {
      setStatus('Campione colore non supportato da questo browser')
      return
    }

    try {
      const result = await new EyeDropperConstructor().open()
      onSample(result.sRGBHex)
      setStatus('Colore campionato')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setStatus('Campione colore annullato')
    }
  }

  function resetEditor() {
    resetBackground()
    resetBorder()
    setLogoDataUrl('')
    setLogoScale(62)
    setStatus('Editor ripristinato')
  }

  function resetBackground() {
    setBackgroundColor(defaultHomeIconBackgroundColor)
    setGradientColor(defaultHomeIconGradientColor)
    setGradientEnabled(true)
    setGradientMode('linear')
    if (borderColorLocked) {
      setBorderColor(deriveBorderColor(defaultHomeIconBackgroundColor))
    }
    setStatus('Sfondo ripristinato')
  }

  function resetBorder() {
    setBorderEnabled(false)
    setBorderColor(deriveBorderColor(defaultHomeIconBackgroundColor))
    setBorderColorLocked(true)
    setBorderWidth(28)
    setStatus('Bordo ripristinato')
  }

  return (
    <div className="modal-backdrop image-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="home-icon-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Editor icona Home"
        onClick={(event) => event.stopPropagation()}
      >
        <HomeIconEditorHeader onClose={onClose} />

        <div className="home-icon-editor__content">
          <div
            className={dragActive ? 'home-icon-editor__preview home-icon-editor__preview--dragging' : 'home-icon-editor__preview'}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              handleDrop(event.dataTransfer.files)
            }}
          >
            <canvas ref={canvasRef} width={homeIconEditorSize} height={homeIconEditorSize} aria-label="Anteprima icona Home" />
            <span className="home-icon-editor__hint">Trascina il logo direttamente sull'icona.</span>
          </div>

          <div className="home-icon-editor__controls">
            <section className="editor-control-group">
              <div className="editor-control-group__header">
                <h3>Sfondo</h3>
                <button type="button" className="editor-reset-button" onClick={resetBackground}>
                  Reset
                </button>
              </div>
              <label>
                <span>Colore</span>
                <span className="color-sample-row">
                  <input type="color" value={backgroundColor} onChange={(event) => updateBackgroundColor(event.target.value)} />
                  <button
                    type="button"
                    className="inline-icon-button color-sample-button"
                    onClick={() => void sampleColor(updateBackgroundColor)}
                    aria-label="Campiona colore sfondo"
                    title="Campiona colore"
                  >
                    <Pipette aria-hidden="true" />
                  </button>
                </span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={gradientEnabled} onChange={(event) => setGradientEnabled(event.target.checked)} />
                Sfumatura
              </label>
              <label>
                <span>Colore sfumatura</span>
                <span className="color-sample-row">
                  <input type="color" value={gradientColor} onChange={(event) => setGradientColor(event.target.value)} />
                  <button
                    type="button"
                    className="inline-icon-button color-sample-button"
                    onClick={() => void sampleColor(setGradientColor)}
                    aria-label="Campiona colore sfumatura"
                    title="Campiona colore"
                  >
                    <Pipette aria-hidden="true" />
                  </button>
                </span>
              </label>
              {gradientEnabled ? (
                <div className="gradient-mode-grid" aria-label="Modalita sfumatura">
                  {gradientModeOptions.map((option) => (
                    <button
                      type="button"
                      className={
                        gradientMode === option.id ? 'gradient-mode-button gradient-mode-button--active' : 'gradient-mode-button'
                      }
                      key={option.id}
                      onClick={() => setGradientMode(option.id)}
                    >
                      <span className={`gradient-mode-button__preview gradient-mode-button__preview--${option.id}`} aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="editor-control-group">
              <div className="editor-control-group__header">
                <h3>Bordo</h3>
                <button type="button" className="editor-reset-button" onClick={resetBorder}>
                  Reset
                </button>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={borderEnabled} onChange={(event) => setBorderEnabled(event.target.checked)} />
                Attivo
              </label>
              <label>
                <span>Colore bordo</span>
                <span className="color-sample-row">
                  <input type="color" value={borderColor} onChange={(event) => updateBorderColor(event.target.value)} />
                  <button
                    type="button"
                    className="inline-icon-button color-sample-button"
                    onClick={() => void sampleColor(updateBorderColor)}
                    aria-label="Campiona colore bordo"
                    title="Campiona colore"
                  >
                    <Pipette aria-hidden="true" />
                  </button>
                </span>
              </label>
              <label>
                <span>Spessore</span>
                <input
                  type="range"
                  min="8"
                  max="80"
                  value={borderWidth}
                  onChange={(event) => setBorderWidth(Number(event.target.value))}
                />
              </label>
            </section>

            <section className="editor-control-group">
              <h3>Logo</h3>
              <div className="logo-action-row">
                <label className="secondary-button asset-file-button">
                  <Upload aria-hidden="true" className="button-icon" />
                  Inserisci logo
                  <input
                    accept="image/*"
                    type="file"
                    onChange={(event) => {
                      void importLogo(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                </label>
                {logoDataUrl ? (
                  <button type="button" className="secondary-button" onClick={() => setLogoDataUrl('')}>
                    Rimuovi logo
                  </button>
                ) : null}
              </div>
              <label>
                <span>Grandezza logo</span>
                <input
                  type="range"
                  min="24"
                  max="92"
                  value={logoScale}
                  onChange={(event) => setLogoScale(Number(event.target.value))}
                />
              </label>
            </section>
          </div>
        </div>

        <HomeIconEditorFooter status={status} onReset={resetEditor} onSave={() => void saveIcon()} />
      </div>
    </div>
  )
}
