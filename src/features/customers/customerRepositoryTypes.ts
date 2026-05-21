import type { CustomerProject, EnvVariable, PlatformAccess, ProjectStatus } from '../../types/app'

export type CustomerRow = {
  id: string
  created_at: string
  updated_at: string
  name: string
  first_name: string
  last_name: string
  company: string
  email: string
  development_email: string
  password_ciphertext: string | null
  notes: string
}

export type CustomerProjectRow = {
  id: string
  customer_id: string
  created_at: string
  updated_at: string
  name: string
  status: ProjectStatus
  development_environment: string
  github_repo_url: string
  github_account_email: string
  linked_secret_label_ciphertext: string | null
  deploy_provider: string
  deploy_url: string
  deploy_account_email: string
  operational_notes: string
}

export type CustomerProjectListRow = Pick<
  CustomerProjectRow,
  'id' | 'customer_id' | 'created_at' | 'updated_at' | 'name' | 'status' | 'development_environment' | 'deploy_provider' | 'deploy_url'
>

export type PlatformAccessRow = {
  id: string
  customer_project_id: string
  platform: string
  email: string
  password_ciphertext: string | null
  sort_order: number
}

export type CustomerEnvVariableRow = {
  id?: string
  customer_project_id: string
  key: string
  value_text: string
  value_ciphertext: string | null
  scope: EnvVariable['scope']
  is_sensitive: boolean
  sort_order: number
}

export type CustomerDataFieldRow = {
  id: string
  customer_project_id: string
  field_key: string
  label: string
  value_text: string
  value_ciphertext: string | null
  is_secret: boolean
  sort_order: number
}

export type CustomerProjectBackup = {
  projectRow: CustomerProjectRow
  envRows: CustomerEnvVariableRow[]
  dataFieldRows: CustomerDataFieldRow[]
  platformAccessRows: PlatformAccessRow[]
}

export type PlatformAccessWriteRow = Omit<PlatformAccessRow, 'id'> & { id?: string }
export type { CustomerProject, EnvVariable, PlatformAccess }
