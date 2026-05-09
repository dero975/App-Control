import type { AdminSection, AppEnvironment, CustomerSection } from '../types/app'

export type NavigationItem = {
  id: AdminSection | CustomerSection
  label: string
  description: string
}

export const adminNavigationItems: NavigationItem[] = [
  { id: 'projects', label: 'Progetti', description: 'Dati, ENV, asset e note' },
  { id: 'prompts', label: 'Prompt', description: 'Libreria prompt per agent' },
  { id: 'dashboard', label: 'Dashboard', description: 'Riepilogo email e piattaforme' },
  { id: 'settings', label: 'Impostazioni', description: 'Preferenze e sicurezza futura' },
]

export const customerNavigationItems: NavigationItem[] = [
  { id: 'customers', label: 'Archivio clienti', description: 'Clienti, progetti e dati consegnati' },
]

export function getNavigationItems(environment: AppEnvironment) {
  return environment === 'customers' ? customerNavigationItems : adminNavigationItems
}
