import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Pipette, Trash2, Upload } from 'lucide-react'
import { copyToClipboard } from '../../lib/clipboard'
import { homeIconSlotId, type ProjectImageSlot } from './projectImageModel'

const browserTabIconSlotId = 'browser-tab-icon'
const homeIconEditorSize = 512
const homeIconCornerRadius = 110
const gradientModeOptions = [
  { id: 'linear', label: 'Lineare' },
  { id: 'radial', label: 'Radiale' },
  { id: 'soft', label: 'Morbida' },
] as const
const defaultHomeIconBackgroundColor = '#ffffff'
const defaultHomeIconGradientColor = '#ffffff'
const maxImageBytes = 500 * 1024
const maxImageEdge = 1200
const imageIntegrationPromptBySlotId: Record<string, string> = {
  [homeIconSlotId]: "Cerca nel progetto il file con nome esatto `icona schermata home.webp`. Usalo come sorgente da ottimizzare e integrare correttamente come icona schermata Home/PWA dell’app. Se per una corretta integrazione servono formati o dimensioni diverse, genera gli asset finali appropriati partendo da questo file, aggiorna i riferimenti necessari nel progetto, assicurati che il risultato finale sia leggero, ottimizzato e adatto a mantenere l’app fluida e veloce anche su dispositivi poco potenti, poi elimina il file originario non ottimizzato lasciando nel progetto solo gli asset finali effettivamente usati.",
  [browserTabIconSlotId]: "Cerca nel progetto il file con nome esatto `icona Tab Browser.webp`. Usalo come sorgente da ottimizzare e integrare correttamente come icona della tab del browser/favicons dell’app. Se per compatibilita browser servono formati o dimensioni diverse, genera gli asset finali appropriati partendo da questo file, aggiorna i riferimenti necessari nel progetto, assicurati che il risultato finale sia leggero, ottimizzato e adatto a mantenere l’app fluida e veloce anche su dispositivi poco potenti, poi elimina il file originario non ottimizzato lasciando nel progetto solo gli asset finali effettivamente usati.",
}

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

function HomeIconEditorModal({
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

        <footer className="home-icon-editor__footer">
          <span>{status || 'Formato finale 512x512 PNG leggero e pronto per schermata Home.'}</span>
          <div className="home-icon-editor__footer-actions">
            <button type="button" className="secondary-button" onClick={resetEditor}>
              Reset
            </button>
            <button type="button" className="secondary-button" onClick={() => void saveIcon()}>
              Salva icona
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function ImagePreviewModal({ slot, onClose }: { slot: ProjectImageSlot; onClose: () => void }) {
  return (
    <div className="modal-backdrop image-preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="image-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="image-preview-modal__header">
          <img
            src="/icons/nav-logo.png"
            srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
            alt="App Control"
            className="image-preview-modal__logo"
          />
          <button type="button" className="secondary-button" onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="image-preview-modal__body">
          <img src={slot.dataUrl} alt={slot.name} />
        </div>
        <footer className="image-preview-modal__footer">
          <strong id="image-preview-title">{slot.name}</strong>
          {slot.fileName ? <span>{slot.fileName}</span> : null}
          {slot.sizeBytes ? <span>{formatFileSize(slot.sizeBytes)}</span> : null}
        </footer>
      </div>
    </div>
  )
}

type HomeIconRenderOptions = {
  backgroundColor: string
  borderColor: string
  borderEnabled: boolean
  borderWidth: number
  gradientColor: string
  gradientEnabled: boolean
  gradientMode: GradientMode
  logoDataUrl: string
  logoScale: number
}

type GradientMode = (typeof gradientModeOptions)[number]['id']

function deriveBorderColor(hexColor: string) {
  const normalizedColor = hexColor.trim().replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalizedColor)) return '#2f6f42'

  const red = Number.parseInt(normalizedColor.slice(0, 2), 16)
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16)
  const darkened = [red, green, blue].map((channel) => Math.max(0, Math.round(channel * 0.46)))

  return `#${darkened.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

async function renderHomeIconBlob(options: HomeIconRenderOptions) {
  const canvas = document.createElement('canvas')
  canvas.width = homeIconEditorSize
  canvas.height = homeIconEditorSize
  await drawHomeIcon(canvas, options)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('Esportazione icona non riuscita'))
    }, 'image/png')
  })
}

async function drawHomeIcon(canvas: HTMLCanvasElement | null, options: HomeIconRenderOptions) {
  if (!canvas) return

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas non disponibile')

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  createRoundedRectPath(context, 0, 0, canvas.width, canvas.height, homeIconCornerRadius)
  context.clip()

  context.fillStyle = options.gradientEnabled
    ? createHomeIconGradient(context, canvas.width, canvas.height, options)
    : options.backgroundColor

  context.fillRect(0, 0, canvas.width, canvas.height)

  if (options.logoDataUrl) {
    const logo = await loadDataUrlImage(options.logoDataUrl)
    const maxLogoSize = canvas.width * (options.logoScale / 100)
    const scale = Math.min(maxLogoSize / logo.naturalWidth, maxLogoSize / logo.naturalHeight)
    const logoWidth = logo.naturalWidth * scale
    const logoHeight = logo.naturalHeight * scale
    context.drawImage(logo, (canvas.width - logoWidth) / 2, (canvas.height - logoHeight) / 2, logoWidth, logoHeight)
  }

  context.restore()

  if (options.borderEnabled) {
    drawRoundedBorderRing(context, canvas.width, canvas.height, options.borderWidth, homeIconCornerRadius, options.borderColor)
  }
}

function createHomeIconGradient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: Pick<HomeIconRenderOptions, 'backgroundColor' | 'gradientColor' | 'gradientMode'>,
) {
  if (options.gradientMode === 'radial') {
    const radialGradient = context.createRadialGradient(width * 0.35, height * 0.25, 0, width * 0.5, height * 0.58, width * 0.82)
    radialGradient.addColorStop(0, options.backgroundColor)
    radialGradient.addColorStop(1, options.gradientColor)
    return radialGradient
  }

  if (options.gradientMode === 'soft') {
    const softGradient = context.createLinearGradient(width * 0.18, height * 0.08, width * 0.86, height * 0.94)
    softGradient.addColorStop(0, mixHexColors(options.backgroundColor, '#ffffff', 0.35))
    softGradient.addColorStop(0.48, options.backgroundColor)
    softGradient.addColorStop(1, options.gradientColor)
    return softGradient
  }

  const linearGradient = context.createLinearGradient(0, 0, width, height)
  linearGradient.addColorStop(0, options.backgroundColor)
  linearGradient.addColorStop(1, options.gradientColor)
  return linearGradient
}

function mixHexColors(firstColor: string, secondColor: string, amount: number) {
  const first = parseHexColor(firstColor)
  const second = parseHexColor(secondColor)
  if (!first || !second) return firstColor

  const mixed = first.map((channel, index) => Math.round(channel * (1 - amount) + second[index] * amount))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function parseHexColor(hexColor: string) {
  const normalizedColor = hexColor.trim().replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalizedColor)) return null

  return [
    Number.parseInt(normalizedColor.slice(0, 2), 16),
    Number.parseInt(normalizedColor.slice(2, 4), 16),
    Number.parseInt(normalizedColor.slice(4, 6), 16),
  ]
}

function createRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  addRoundedRectPath(context, x, y, width, height, radius)
}

function addRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.arcTo(x + width, y, x + width, y + safeRadius, safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius)
  context.lineTo(x + safeRadius, y + height)
  context.arcTo(x, y + height, x, y + height - safeRadius, safeRadius)
  context.lineTo(x, y + safeRadius)
  context.arcTo(x, y, x + safeRadius, y, safeRadius)
  context.closePath()
}

function drawRoundedBorderRing(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  borderWidth: number,
  radius: number,
  color: string,
) {
  const safeBorderWidth = Math.max(1, Math.min(borderWidth, width / 2, height / 2))
  const innerWidth = Math.max(1, width - safeBorderWidth * 2)
  const innerHeight = Math.max(1, height - safeBorderWidth * 2)

  context.save()
  context.beginPath()
  addRoundedRectPath(context, 0, 0, width, height, radius)
  addRoundedRectPath(
    context,
    safeBorderWidth,
    safeBorderWidth,
    innerWidth,
    innerHeight,
    Math.max(0, radius - safeBorderWidth),
  )
  context.fillStyle = color
  context.fill('evenodd')
  context.restore()
}

function loadDataUrlImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Logo non leggibile')))
    image.src = dataUrl
  })
}

function AssetName({ name }: { name: string }) {
  const match = name.match(/^(.*?)(\s*\(.+\))$/)
  if (!match) return <strong>{name}</strong>

  return (
    <strong>
      {match[1]}
      <span className="asset-name-note">{match[2]}</span>
    </strong>
  )
}

async function optimizeImageFile(
  file: File,
): Promise<Pick<ProjectImageSlot, 'dataUrl' | 'fileName' | 'mimeType' | 'originalSizeBytes' | 'sizeBytes'>> {
  if (file.type === 'image/svg+xml') {
    const dataUrl = await readBlobAsDataUrl(file)
    return {
      dataUrl,
      fileName: file.name,
      mimeType: file.type,
      originalSizeBytes: file.size,
      sizeBytes: file.size,
    }
  }

  const image = await loadImage(file)
  const scale = Math.min(1, maxImageEdge / Math.max(image.naturalWidth, image.naturalHeight))
  let width = Math.max(1, Math.round(image.naturalWidth * scale))
  let height = Math.max(1, Math.round(image.naturalHeight * scale))
  let quality = 0.9
  let optimizedBlob = await renderImageToBlob(image, width, height, quality)

  while (optimizedBlob.size > maxImageBytes && (quality > 0.68 || width > 720 || height > 720)) {
    if (quality > 0.68) {
      quality = Math.max(0.68, quality - 0.08)
    } else {
      width = Math.max(720, Math.round(width * 0.85))
      height = Math.max(720, Math.round(height * 0.85))
    }

    optimizedBlob = await renderImageToBlob(image, width, height, quality)
  }

  const sourceBlob = file.size <= maxImageBytes && file.size <= optimizedBlob.size ? file : optimizedBlob
  const dataUrl = await readBlobAsDataUrl(sourceBlob)

  return {
    dataUrl,
    fileName: sourceBlob === file ? file.name : `${stripFileExtension(file.name)}.webp`,
    mimeType: sourceBlob.type || file.type,
    originalSizeBytes: file.size,
    sizeBytes: sourceBlob.size,
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.addEventListener('load', () => {
      URL.revokeObjectURL(url)
      resolve(image)
    })
    image.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Immagine non leggibile'))
    })

    image.src = url
  })
}

function renderImageToBlob(image: HTMLImageElement, width: number, height: number, quality: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas non disponibile')

  context.drawImage(image, 0, 0, width, height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('Ottimizzazione immagine non riuscita'))
      },
      'image/webp',
      quality,
    )
  })
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '') || 'immagine'
}

function createDownloadFileName(slot: ProjectImageSlot) {
  const extension = getDataUrlExtension(slot.dataUrl) || getFileExtension(slot.fileName) || 'png'
  return `${slot.name}.${extension}`
}

function getDataUrlExtension(dataUrl: string) {
  const mimeType = dataUrl.match(/^data:([^;]+);/)?.[1]
  if (!mimeType) return ''

  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }

  return extensionMap[mimeType] ?? mimeType.split('/')[1] ?? ''
}

function getFileExtension(fileName: string) {
  return fileName.match(/\.([^.]+)$/)?.[1] ?? ''
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  return `${Math.round(sizeBytes / 1024)} KB`
}
