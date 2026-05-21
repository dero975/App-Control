import { normalizeFieldKey } from '../../lib/repositoryUtils'
import type { EnvVariable, ProjectVariable } from '../../types/app'
import { normalizeProjectName, supabaseServiceKey } from '../projects/projectShared'
import type {
  CustomerDataFieldRow,
  CustomerEnvVariableRow,
  CustomerProject,
  CustomerProjectListRow,
  CustomerProjectRow,
  PlatformAccessRow,
} from './customerRepositoryTypes'

export function mapCustomerProjectListRow(project: CustomerProjectListRow): CustomerProject {
  return {
    id: project.id,
    name: normalizeProjectName(project.name),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    status: project.status,
    developmentEnvironment: project.development_environment,
    githubRepoUrl: '',
    githubAccountEmail: '',
    linkedSecretLabel: '',
    deploy: {
      provider: project.deploy_provider,
      url: project.deploy_url,
      accountEmail: '',
    },
    operationalNotes: '',
    env: [],
    dataFields: [],
    platformAccesses: [],
  }
}

export function mapCustomerProjectRow(
  project: CustomerProjectRow,
  envRows: CustomerEnvVariableRow[],
  dataFieldRows: CustomerDataFieldRow[],
  platformAccessRows: PlatformAccessRow[],
): CustomerProject {
  return {
    id: project.id,
    name: normalizeProjectName(project.name),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    status: project.status,
    developmentEnvironment: project.development_environment,
    githubRepoUrl: project.github_repo_url,
    githubAccountEmail: project.github_account_email,
    linkedSecretLabel: project.linked_secret_label_ciphertext ?? '',
    deploy: {
      provider: project.deploy_provider,
      url: project.deploy_url,
      accountEmail: project.deploy_account_email,
    },
    operationalNotes: project.operational_notes,
    env: envRows.map((row) => ({
      key: row.key,
      value: row.is_sensitive ? row.value_ciphertext ?? '' : row.value_text,
      scope: row.scope,
      sensitive: row.is_sensitive,
    })),
    dataFields: dataFieldRows.map((row) => ({
      id: row.id,
      key: row.label || row.field_key,
      value: row.is_secret ? row.value_ciphertext ?? '' : row.value_text,
      sensitive: row.is_secret,
    })),
    platformAccesses: platformAccessRows.map((row) => ({
      id: row.id,
      platform: row.platform,
      email: row.email,
      password: row.password_ciphertext ?? '',
    })),
  }
}

export function buildDefaultProjectEnv(): EnvVariable[] {
  return [
    { key: 'LINK_DEPLOY', value: '', scope: 'Deploy', sensitive: false },
    { key: 'GITHUB_URL', value: '', scope: 'GitHub', sensitive: false },
    { key: 'GITHUB_TOKEN', value: '', scope: 'GitHub', sensitive: true },
    { key: 'SUPABASE_URL', value: '', scope: 'Supabase', sensitive: false },
    { key: 'SUPABASE_ANON_KEY', value: '', scope: 'Supabase', sensitive: true },
    { key: supabaseServiceKey, value: '', scope: 'Supabase', sensitive: true },
    { key: 'DATABASE_URL', value: '', scope: 'Supabase', sensitive: true },
  ]
}

export function sanitizeEnvVariables(envVariables: EnvVariable[]) {
  const sanitizedVariables = new Map<string, EnvVariable>()

  for (const variable of envVariables) {
    const key = variable.key.trim()
    if (!key) continue

    sanitizedVariables.set(key, {
      key,
      value: variable.value,
      scope: variable.scope,
      sensitive: variable.sensitive,
    })
  }

  return [...sanitizedVariables.values()]
}

export function sanitizeProjectVariables(dataFields: ProjectVariable[]) {
  const sanitizedFields = new Map<string, ProjectVariable>()

  for (const field of dataFields) {
    const label = field.key.trim()
    if (!label) continue

    const normalizedKey = normalizeFieldKey(label)
    if (!normalizedKey) continue

    sanitizedFields.set(normalizedKey, {
      ...field,
      key: label,
    })
  }

  return [...sanitizedFields.values()]
}
