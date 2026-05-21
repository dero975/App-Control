import { maxImageBytes, maxImageEdge } from './projectImageConstants'
import type { ProjectImageSlot } from './projectImageModel'

export async function optimizeImageFile(
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

export function loadDataUrlImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Logo non leggibile')))
    image.src = dataUrl
  })
}

export function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })
}

export function createDownloadFileName(slot: ProjectImageSlot) {
  const extension = getDataUrlExtension(slot.dataUrl) || getFileExtension(slot.fileName) || 'png'
  return `${slot.name}.${extension}`
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  return `${Math.round(sizeBytes / 1024)} KB`
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

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '') || 'immagine'
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
