import { normalizeFieldKey } from '../../lib/repositoryUtils'
import { requireSupabaseClient } from '../../lib/supabase'
import type { CustomerProject, EnvVariable, PlatformAccess, ProjectVariable } from '../../types/app'
import { normalizeProjectName } from '../projects/projectShared'
import { buildDefaultProjectEnv, mapCustomerProjectRow, sanitizeEnvVariables, sanitizeProjectVariables } from './customerRepositoryMappers'
import { fetchCustomerProjectById, fetchCustomerProjectRowById, fetchProjectRelations } from './customerRepositoryRead'
import { replaceProjectDataFields, replaceProjectEnvVariables, replaceProjectPlatformAccesses } from './customerRepositoryRelationsWrite'
import type {
  CustomerDataFieldRow,
  CustomerEnvVariableRow,
  CustomerProjectBackup,
  CustomerProjectRow,
  PlatformAccessRow,
} from './customerRepositoryTypes'

export async function createCustomerProjectRecord(customerId: string, index: number) {
  const client = requireSupabaseClient()
  const defaultEnv = buildDefaultProjectEnv()

  const { data: projectData, error: projectError } = await client
    .from('customer_projects')
    .insert({
      customer_id: customerId,
      name: normalizeProjectName(`Nuovo progetto ${index}`),
      status: 'Attivo',
      development_environment: 'Windsurf',
      github_repo_url: '',
      github_account_email: '',
      linked_secret_label_ciphertext: '',
      deploy_provider: 'Render',
      deploy_url: '',
      deploy_account_email: '',
      operational_notes: '',
    })
    .select(
      'id, customer_id, created_at, updated_at, name, status, development_environment, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .single()

  if (projectError) throw projectError

  const createdProject = projectData as CustomerProjectRow

  const { data: envRows, error: envError } = await client
    .from('customer_project_env_variables')
    .insert(defaultEnv.map((variable, indexPosition) => buildEnvVariableRow(createdProject.id, variable, indexPosition)))
    .select('customer_project_id, key, value_text, value_ciphertext, scope, is_sensitive, sort_order')

  if (envError) throw envError

  const { data: dataFieldRows, error: dataFieldError } = await client
    .from('customer_project_data_fields')
    .insert([
      {
        customer_project_id: createdProject.id,
        field_key: 'password_deploy',
        label: 'Password deploy',
        value_text: '',
        value_ciphertext: null,
        is_secret: true,
        visible_by_default: true,
        field_kind: 'text',
        sort_order: 0,
      },
    ])
    .select('id, customer_project_id, field_key, label, value_text, value_ciphertext, is_secret, sort_order')

  if (dataFieldError) throw dataFieldError

  return mapCustomerProjectRow(
    createdProject,
    (envRows as CustomerEnvVariableRow[] | null) ?? [],
    (dataFieldRows as CustomerDataFieldRow[] | null) ?? [],
    [],
  )
}

export async function saveCustomerProjectSnapshot(customerId: string, project: CustomerProject) {
  const client = requireSupabaseClient()
  const backup = await fetchCustomerProjectBackup(project.id)

  try {
    const { error: projectError } = await client
      .from('customer_projects')
      .update({
        customer_id: customerId,
        name: normalizeProjectName(project.name),
        status: project.status,
        development_environment: project.developmentEnvironment,
        github_repo_url: project.githubRepoUrl,
        github_account_email: project.githubAccountEmail,
        linked_secret_label_ciphertext: project.linkedSecretLabel || null,
        deploy_provider: project.deploy.provider,
        deploy_url: project.deploy.url,
        deploy_account_email: project.deploy.accountEmail,
        operational_notes: project.operationalNotes,
      })
      .eq('id', project.id)
    if (projectError) throw projectError

    await saveProjectEnvVariables(project.id, project.env)
    await saveProjectDataFields(project.id, project.dataFields)
    await saveProjectPlatformAccesses(project.id, project.platformAccesses)
  } catch (error) {
    await restoreCustomerProjectBackup(backup)
    throw error
  }

  return fetchCustomerProjectById(project.id)
}

export async function deleteCustomerProjectRecord(projectId: string) {
  const client = requireSupabaseClient()
  const { error } = await client.from('customer_projects').delete().eq('id', projectId)
  if (error) throw error
}

async function saveProjectEnvVariables(projectId: string, envVariables: EnvVariable[]) {
  const sanitizedVariables = sanitizeEnvVariables(envVariables)
  await replaceProjectEnvVariables(
    projectId,
    sanitizedVariables.map((variable, index) => buildEnvVariableRow(projectId, variable, index)),
  )
}

async function saveProjectDataFields(projectId: string, dataFields: ProjectVariable[]) {
  const sanitizedFields = sanitizeProjectVariables(dataFields)
  await replaceProjectDataFields(
    projectId,
    sanitizedFields.map((field, index) => ({
      customer_project_id: projectId,
      field_key: normalizeFieldKey(field.key),
      label: field.key,
      value_text: field.sensitive ? '' : field.value,
      value_ciphertext: field.sensitive ? field.value || null : null,
      is_secret: field.sensitive,
      sort_order: index,
    })),
  )
}

async function saveProjectPlatformAccesses(projectId: string, platformAccesses: PlatformAccess[]) {
  const sanitizedAccesses = platformAccesses.filter((access) => access.platform.trim() || access.email.trim() || access.password.trim())
  await replaceProjectPlatformAccesses(
    projectId,
    sanitizedAccesses.map((access, index) => ({
      id: access.id,
      customer_project_id: projectId,
      platform: access.platform.trim(),
      email: access.email.trim(),
      password_ciphertext: access.password || null,
      sort_order: index,
    })),
  )
}

async function fetchCustomerProjectBackup(projectId: string): Promise<CustomerProjectBackup> {
  const projectRow = await fetchCustomerProjectRowById(projectId)
  const relations = await fetchProjectRelations([projectId])

  return {
    projectRow,
    envRows: relations.envRowsByProjectId.get(projectId) ?? [],
    dataFieldRows: relations.dataFieldsByProjectId.get(projectId) ?? [],
    platformAccessRows: relations.platformAccessRowsByProjectId.get(projectId) ?? [],
  }
}

async function restoreCustomerProjectBackup(backup: CustomerProjectBackup) {
  const client = requireSupabaseClient()
  const { projectRow } = backup

  const { error } = await client
    .from('customer_projects')
    .update({
      customer_id: projectRow.customer_id,
      name: projectRow.name,
      status: projectRow.status,
      development_environment: projectRow.development_environment,
      github_repo_url: projectRow.github_repo_url,
      github_account_email: projectRow.github_account_email,
      linked_secret_label_ciphertext: projectRow.linked_secret_label_ciphertext,
      deploy_provider: projectRow.deploy_provider,
      deploy_url: projectRow.deploy_url,
      deploy_account_email: projectRow.deploy_account_email,
      operational_notes: projectRow.operational_notes,
    })
    .eq('id', projectRow.id)
  if (error) throw error

  await restoreProjectRelations(backup)
}

async function restoreProjectRelations({ projectRow, envRows, dataFieldRows, platformAccessRows }: CustomerProjectBackup) {
  await replaceProjectEnvVariables(
    projectRow.id,
    envRows.map((row, index) => ({
      ...row,
      sort_order: row.sort_order ?? index,
    })),
  )
  await replaceProjectDataFields(
    projectRow.id,
    dataFieldRows.map((row, index) => ({
      customer_project_id: row.customer_project_id,
      field_key: row.field_key,
      label: row.label,
      value_text: row.value_text,
      value_ciphertext: row.value_ciphertext,
      is_secret: row.is_secret,
      sort_order: row.sort_order ?? index,
    })),
  )
  await replaceProjectPlatformAccesses(
    projectRow.id,
    platformAccessRows.map((row: PlatformAccessRow, index) => ({
      id: row.id,
      customer_project_id: row.customer_project_id,
      platform: row.platform,
      email: row.email,
      password_ciphertext: row.password_ciphertext,
      sort_order: row.sort_order ?? index,
    })),
  )
}

function buildEnvVariableRow(projectId: string, variable: EnvVariable, sortOrder: number): CustomerEnvVariableRow {
  return {
    customer_project_id: projectId,
    key: variable.key,
    value_text: variable.sensitive ? '' : variable.value,
    value_ciphertext: variable.sensitive ? variable.value || null : null,
    scope: variable.scope,
    is_sensitive: variable.sensitive,
    sort_order: sortOrder,
  }
}
