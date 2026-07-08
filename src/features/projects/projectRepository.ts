import type {
  EnvVariableRow,
  Project,
  ProjectDashboardRow,
  ProjectRow,
  ProjectSnapshot,
  ProjectVariable,
} from './projectRepositoryTypes'
import {
  mapProjectListRow,
  mapProjectRow,
  mapProjects,
} from './projectRepositoryRead'

export { fetchProjectImages } from './projectRepositoryRead'
import {
  fetchProjectBackup,
  restoreProjectBackup,
  saveDataFields,
  saveEnvVariables,
  saveProjectImages,
} from './projectRepositoryWrite'

export type { ProjectSnapshot } from './projectRepositoryTypes'
import { requireSupabaseClient } from '../../lib/supabase'
import { normalizeProjectName } from './projectShared'

// Prefetch di tutti i progetti gia con i dettagli (variabili, campi, note) in un
// unico batch, ESCLUSE le immagini (base64 pesanti, caricate on-demand). Cosi la
// navigazione tra progetti e istantanea, senza schermata di caricamento.
export async function fetchAllProjectsWithDetails() {
  const client = requireSupabaseClient()

  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select(
      'id, agent_project_id, name, created_at, updated_at, status, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .order('updated_at', { ascending: false })
  if (projectsError) throw projectsError

  return mapProjects((projects as ProjectRow[] | null) ?? [], false)
}

export async function fetchDashboardProjects() {
  const client = requireSupabaseClient()

  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select('id, agent_project_id, name, created_at, updated_at, status, github_account_email, deploy_provider, deploy_url')
    .order('name', { ascending: true })
  if (projectsError) throw projectsError

  const projectRows = (projects as ProjectDashboardRow[] | null) ?? []

  return projectRows.map((project) => ({
    ...mapProjectListRow(project),
    githubAccountEmail: project.github_account_email,
  }))
}

export async function fetchProjectById(projectId: string) {
  const client = requireSupabaseClient()

  const { data, error } = await client
    .from('projects')
    .select(
      'id, agent_project_id, name, created_at, updated_at, status, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .eq('id', projectId)
    .single()

  if (error) throw error

  const projects = await mapProjects([data as ProjectRow])
  return projects[0]
}

export async function createProjectRecord(project: Project) {
  const client = requireSupabaseClient()
  const agentKeyHash = await hashSecret(project.agent.agentKey)

  const { data: createdProject, error: projectError } = await client
    .from('projects')
    .insert({
      agent_project_id: project.agent.projectId,
      name: normalizeProjectName(project.name),
      status: project.status,
      github_repo_url: project.githubRepoUrl,
      github_account_email: project.githubAccountEmail,
      linked_secret_label_ciphertext: project.linkedSecretLabel || null,
      deploy_provider: project.deploy.provider,
      deploy_url: project.deploy.url,
      deploy_account_email: project.deploy.accountEmail,
      operational_notes: project.operationalNotes,
    })
    .select(
      'id, agent_project_id, name, created_at, updated_at, status, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .single()
  if (projectError) throw projectError

  const { error: agentError } = await client.from('project_agent_keys').insert({
    project_id: createdProject.id,
    key_prefix: project.agent.agentKey.split('-')[0],
    key_hash: agentKeyHash,
    key_ciphertext: project.agent.agentKey,
    sync_prompt: project.agent.syncPrompt,
  })
  if (agentError) throw agentError

  if (project.env.length) {
    const { error: envError } = await client.from('project_env_variables').insert(
      project.env.map((variable, index) => ({
        project_id: createdProject.id,
        key: variable.key,
        value_text: variable.sensitive ? '' : variable.value,
        value_ciphertext: variable.sensitive ? variable.value || null : null,
        scope: variable.scope,
        is_sensitive: variable.sensitive,
        sort_order: index,
      })),
    )
    if (envError) throw envError
  }

  return mapProjectRow(
    createdProject as ProjectRow,
    project.env.map(envToRow(createdProject.id)),
    {
      project_id: createdProject.id,
      key_prefix: project.agent.agentKey.split('-')[0],
      key_ciphertext: project.agent.agentKey,
      sync_prompt: project.agent.syncPrompt,
    },
    [],
    [],
  )
}

export async function deleteProjectRecord(projectId: string) {
  const client = requireSupabaseClient()
  const { error } = await client.from('projects').delete().eq('id', projectId)
  if (error) throw error
}

export async function saveProjectSnapshot({ project, sheetFields, variables, images }: ProjectSnapshot) {
  const client = requireSupabaseClient()
  const backup = await fetchProjectBackup(project.id)
  const name = normalizeProjectName(getFieldValue(sheetFields, 'nome progetto') || project.name)
  const githubEmail = getFieldValue(sheetFields, 'mail github')
  const password = getFieldValue(sheetFields, 'Password')
  const deployProvider = getFieldValue(sheetFields, 'deploy con') || project.deploy.provider
  const linkDeploy = getFieldValue(variables, 'LINK_DEPLOY')
  const githubUrl = getFieldValue(variables, 'GITHUB_URL')

  try {
    const { error: projectError } = await client
      .from('projects')
      .update({
        name,
        github_repo_url: githubUrl,
        github_account_email: githubEmail,
        linked_secret_label_ciphertext: password || null,
        deploy_provider: deployProvider,
        deploy_url: linkDeploy,
        operational_notes: project.operationalNotes,
      })
      .eq('id', project.id)
    if (projectError) throw projectError

    await saveDataFields(project.id, sheetFields)
    await saveEnvVariables(project.id, variables)
    await saveProjectImages(project.id, images)
  } catch (error) {
    await restoreProjectBackup(backup)
    throw error
  }
}

function envToRow(projectId: string) {
  return (variable: Project['env'][number]): EnvVariableRow => ({
    project_id: projectId,
    key: variable.key,
    value_text: variable.sensitive ? '' : variable.value,
    value_ciphertext: variable.sensitive ? variable.value || null : null,
    scope: variable.scope,
    is_sensitive: variable.sensitive,
  })
}

function getFieldValue(fields: ProjectVariable[], key: string) {
  return fields.find((field) => field.key.trim().toLowerCase() === key.toLowerCase())?.value.trim() ?? ''
}


async function hashSecret(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
