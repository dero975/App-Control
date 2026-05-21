import { homeIconSlotId } from './projectImageModel'

export const browserTabIconSlotId = 'browser-tab-icon'
export const homeIconEditorSize = 512
export const homeIconCornerRadius = 110
export const gradientModeOptions = [
  { id: 'linear', label: 'Lineare' },
  { id: 'radial', label: 'Radiale' },
  { id: 'soft', label: 'Morbida' },
] as const
export const defaultHomeIconBackgroundColor = '#ffffff'
export const defaultHomeIconGradientColor = '#ffffff'
export const maxImageBytes = 500 * 1024
export const maxImageEdge = 1200
export const imageIntegrationPromptBySlotId: Record<string, string> = {
  [homeIconSlotId]: "Cerca nel progetto il file con nome esatto `icona schermata home.webp`. Usalo come sorgente da ottimizzare e integrare correttamente come icona schermata Home/PWA dell’app. Se per una corretta integrazione servono formati o dimensioni diverse, genera gli asset finali appropriati partendo da questo file, aggiorna i riferimenti necessari nel progetto, assicurati che il risultato finale sia leggero, ottimizzato e adatto a mantenere l’app fluida e veloce anche su dispositivi poco potenti, poi elimina il file originario non ottimizzato lasciando nel progetto solo gli asset finali effettivamente usati.",
  [browserTabIconSlotId]: "Cerca nel progetto il file con nome esatto `icona Tab Browser.webp`. Usalo come sorgente da ottimizzare e integrare correttamente come icona della tab del browser/favicons dell’app. Se per compatibilita browser servono formati o dimensioni diverse, genera gli asset finali appropriati partendo da questo file, aggiorna i riferimenti necessari nel progetto, assicurati che il risultato finale sia leggero, ottimizzato e adatto a mantenere l’app fluida e veloce anche su dispositivi poco potenti, poi elimina il file originario non ottimizzato lasciando nel progetto solo gli asset finali effettivamente usati.",
}

export type GradientMode = (typeof gradientModeOptions)[number]['id']
