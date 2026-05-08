import type { AppSection } from '../types/app'

export type NavigationItem = {
  id: AppSection
  label: string
  description: string
}

export const navigationItems: NavigationItem[] = [
  { id: 'projects', label: 'Progetti', description: 'Dati, ENV, asset e note' },
  { id: 'prompts', label: 'Prompt', description: 'Libreria prompt per agent' },
  { id: 'dashboard', label: 'Dashboard', description: 'Riepilogo email e piattaforme' },
  { id: 'settings', label: 'Impostazioni', description: 'Preferenze e sicurezza futura' },
]
