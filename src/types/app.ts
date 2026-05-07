export type AppSection = 'projects' | 'prompts' | 'settings' | 'dashboard'

export type DevelopmentEnvironment = string

export type ProjectStatus = 'Attivo' | 'In pausa' | 'Archivio' | 'Idea'

export type PromptCategory = 'Prompt iniziali' | 'Prompt manutenzione' | 'Prompt vari'

export type Prompt = {
  id: string
  title: string
  category: PromptCategory
  fullText: string
}

export type EnvVariable = {
  key: string
  value: string
  scope: 'Supabase' | 'GitHub' | 'Deploy' | 'Custom'
  sensitive: boolean
}

export type PlatformAccess = {
  id: string
  platform: string
  email: string
  password: string
}

export type ProjectVariable = {
  id: string
  key: string
  value: string
  sensitive: boolean
  accessAccounts?: PlatformAccess[]
}

export type ProjectImage = {
  id: string
  name: string
  fileName: string
  mimeType: string
  dataUrl: string
  sizeBytes: number
  originalSizeBytes: number
}

export type ProjectAgentAccess = {
  projectId: string
  agentKey: string
  syncPrompt: string
}

export type Project = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  status: ProjectStatus
  developmentEnvironment: DevelopmentEnvironment
  githubRepoUrl: string
  githubAccountEmail: string
  linkedSecretLabel: string
  supabase: {
    projectUrl: string
    anonKeyLabel: string
    serviceRoleLabel: string
    databaseUrlLabel: string
  }
  deploy: {
    provider: string
    url: string
    accountEmail: string
  }
  operationalNotes: string
  agent: ProjectAgentAccess
  promptIds: string[]
  assetIds: string[]
  env: EnvVariable[]
  dataFields?: ProjectVariable[]
  platformAccesses?: PlatformAccess[]
  images?: ProjectImage[]
}

export type VisualAsset = {
  id: string
  projectId: string
  name: string
  type: 'Logo' | 'Icona' | 'Grafica' | 'Immagine pubblica' | 'Altro asset visivo'
  path: string
  notes: string
}
