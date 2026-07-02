import type { Project, ProjectImage, ProjectVariable } from '../../types/app'

export type ProjectRow = {
  id: string
  agent_project_id: string
  name: string
  created_at: string
  updated_at: string
  status: Project['status']
  github_repo_url: string
  github_account_email: string
  linked_secret_label_ciphertext: string | null
  deploy_provider: string
  deploy_url: string
  deploy_account_email: string
  operational_notes: string
}

export type ProjectListRow = Pick<
  ProjectRow,
  'id' | 'agent_project_id' | 'name' | 'created_at' | 'updated_at' | 'status' | 'deploy_provider' | 'deploy_url'
>

export type ProjectDashboardRow = ProjectListRow & Pick<ProjectRow, 'github_account_email'>

export type EnvVariableRow = {
  id?: string
  project_id: string
  key: string
  value_text: string
  value_ciphertext: string | null
  scope: Project['env'][number]['scope']
  is_sensitive: boolean
}

export type AgentKeyRow = {
  project_id: string
  key_prefix: string
  key_ciphertext: string | null
  sync_prompt: string
}

export type DataFieldRow = {
  id: string
  project_id: string
  field_key: string
  label: string
  value_text: string
  value_ciphertext: string | null
  is_secret: boolean
  sort_order: number
}

export type ImageRow = {
  id?: string
  project_id: string
  slot_id: string
  name: string
  file_name: string
  mime_type: string
  size_bytes: number
  original_size_bytes: number
  data_url: string
  sort_order: number
}

export type ProjectSnapshot = {
  project: Project
  sheetFields: ProjectVariable[]
  variables: ProjectVariable[]
  images: ProjectImage[]
}

export type ProjectBackup = {
  projectRow: ProjectRow
  envRows: EnvVariableRow[]
  fieldRows: DataFieldRow[]
  imageRows: ImageRow[]
}

export type { Project, ProjectImage, ProjectVariable }
