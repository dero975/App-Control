export const customerProjectTabs = ['Dati progetto', 'Variabili', 'Immagini', 'Note', 'Sync'] as const
export const developmentOptions = ['Windsurf', 'Replit']
export const deployOptions = ['Render', 'CloudeFlare']

export type CustomerProjectTab = (typeof customerProjectTabs)[number]
export type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'
export type CustomerProjectListSortMode = 'recent-desc' | 'name-asc' | 'name-desc'

export const saveDebounceMs = 420
export const createCustomerEventName = 'app-control:create-customer'
export const customerPinnedProjectIdsStoragePrefix = 'app-control-customer-pinned-project-ids:'
