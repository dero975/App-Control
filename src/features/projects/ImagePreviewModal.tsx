import type { ProjectImageSlot } from './projectImageModel'
import { formatFileSize } from './projectImageFileUtils'

export function ImagePreviewModal({ slot, onClose }: { slot: ProjectImageSlot; onClose: () => void }) {
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
