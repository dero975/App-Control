import type { ProjectImage } from '../../types/app'

export type ProjectImageSlot = {
  id: string
  name: string
  fileName: string
  mimeType: string
  dataUrl: string
  sizeBytes: number
  originalSizeBytes: number
}

export const defaultProjectImageSlots = [
  { id: 'logo-app', name: 'Logo app' },
  { id: 'logo-app-2', name: 'Logo app 2' },
  { id: 'logo-app-3', name: 'Logo app 3' },
  { id: 'home-icon', name: 'Icona Schermata Home' },
  { id: 'browser-tab-icon', name: 'Icona Tab Browser (favicon)' },
] as const

export const homeIconSlotId = 'home-icon'

export function getProjectImageSlotsSignature(imageSlots: ProjectImageSlot[]) {
  return JSON.stringify(
    imageSlots.map((slot) => ({
      id: slot.id,
      name: slot.name,
      fileName: slot.fileName,
      mimeType: slot.mimeType,
      dataUrl: slot.dataUrl,
      sizeBytes: slot.sizeBytes,
      originalSizeBytes: slot.originalSizeBytes,
    })),
  )
}

export function buildProjectImageSlots(images: ProjectImage[] = []): ProjectImageSlot[] {
  return defaultProjectImageSlots.map((slot) => {
    const image = images.find((currentImage) => currentImage.id === slot.id)

    return {
      ...slot,
      fileName: image?.fileName ?? '',
      mimeType: image?.mimeType ?? '',
      dataUrl: image?.dataUrl ?? '',
      originalSizeBytes: image?.originalSizeBytes ?? 0,
      sizeBytes: image?.sizeBytes ?? 0,
    }
  })
}
