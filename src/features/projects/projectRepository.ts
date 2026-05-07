import type { PlatformAccess, Project, ProjectImage, ProjectVariable } from '../../types/app'
import { supabase } from '../../lib/supabase'

type ProjectRow = {
  id: string
  agent_project_id: string
  name: string
  created_at: string
  updated_at: string
  status: Project['status']
  development_environment: string
  github_repo_url: string
  github_account_email: string
  linked_secret_label_ciphertext: string | null
  deploy_provider: string
  deploy_url: string
  deploy_account_email: string
  operational_notes: string
}

type EnvVariableRow = {
  project_id: string
  key: string
  value_text: string
  value_ciphertext: string | null
  scope: Project['env'][number]['scope']
  is_sensitive: boolean
}

type AgentKeyRow = {
  project_id: string
  key_prefix: string
  key_ciphertext: string | null
  sync_prompt: string
}

type PlatformAccessRow = {
  id: string
  project_id: string
  platform: string
  email: string
  password_ciphertext: string | null
  sort_order: number
}

type DataFieldRow = {
  id: string
  project_id: string
  field_key: string
  label: string
  value_text: string
  value_ciphertext: string | null
  is_secret: boolean
  sort_order: number
}

type ImageRow = {
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

export async function fetchProjects() {
  const client = requireSupabase()

  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select(
      'id, agent_project_id, name, created_at, updated_at, status, development_environment, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .order('updated_at', { ascending: false })
  if (projectsError) throw projectsError

  return mapProjects((projects as ProjectRow[] | null) ?? [])
}

export async function fetchProjectById(projectId: string) {
  const client = requireSupabase()

  const { data, error } = await client
    .from('projects')
    .select(
      'id, agent_project_id, name, created_at, updated_at, status, development_environment, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .eq('id', projectId)
    .single()

  if (error) throw error

  const projects = await mapProjects([data as ProjectRow])
  return projects[0]
}

export async function createProjectRecord(project: Project) {
  const client = requireSupabase()
  const agentKeyHash = await hashSecret(project.agent.agentKey)

  const { data: createdProject, error: projectError } = await client
    .from('projects')
    .insert({
      agent_project_id: project.agent.projectId,
      name: project.name,
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
    .select(
      'id, agent_project_id, name, created_at, updated_at, status, development_environment, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
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
    [],
  )
}

export async function deleteProjectRecord(projectId: string) {
  const client = requireSupabase()
  const { error } = await client.from('projects').delete().eq('id', projectId)
  if (error) throw error
}

export async function saveProjectSnapshot({ project, sheetFields, variables, images }: ProjectSnapshot) {
  const client = requireSupabase()
  const name = getFieldValue(sheetFields, 'nome progetto') || project.name
  const githubEmail = getFieldValue(sheetFields, 'mail github')
  const password = getFieldValue(sheetFields, 'Password')
  const developmentEnvironment = getFieldValue(sheetFields, 'sviluppo in') || project.developmentEnvironment
  const deployProvider = getFieldValue(sheetFields, 'deploy con') || project.deploy.provider
  const linkDeploy = getFieldValue(variables, 'LINK_DEPLOY')
  const githubUrl = getFieldValue(variables, 'GITHUB_URL')

  const { error: projectError } = await client
    .from('projects')
    .update({
      name,
      development_environment: developmentEnvironment,
      github_repo_url: githubUrl,
      github_account_email: githubEmail,
      linked_secret_label_ciphertext: password || null,
      deploy_provider: deployProvider,
      deploy_url: linkDeploy,
    })
    .eq('id', project.id)
  if (projectError) throw projectError

  await saveDataFields(project.id, sheetFields)
  await savePlatformAccesses(project.id, sheetFields)
  await saveEnvVariables(project.id, variables)
  await saveProjectImages(project.id, images)
}

async function saveDataFields(projectId: string, sheetFields: ProjectVariable[]) {
  const client = requireSupabase()
  const coreKeys = new Set(['nome progetto', 'mail github', 'password', 'sviluppo in', 'deploy con'])
  const customFields = sheetFields.filter((field) => !coreKeys.has(field.key.trim().toLowerCase()))
  if (!customFields.length) return

  const { error } = await client.from('project_data_fields').upsert(
    customFields.map((field, index) => ({
      project_id: projectId,
      field_key: normalizeFieldKey(field.key),
      label: field.key,
      value_text: field.sensitive ? '' : field.value,
      value_ciphertext: field.sensitive ? field.value || null : null,
      is_secret: field.sensitive,
      visible_by_default: true,
      field_kind: 'text',
      sort_order: index,
    })),
    { onConflict: 'project_id,field_key' },
  )
  if (error) throw error
}

async function savePlatformAccesses(projectId: string, sheetFields: ProjectVariable[]) {
  const client = requireSupabase()
  const developmentField = sheetFields.find((field) => field.key.trim().toLowerCase() === 'sviluppo in')
  const accounts = developmentField?.accessAccounts ?? []

  const { error: deleteError } = await client.from('project_platform_accesses').delete().eq('project_id', projectId)
  if (deleteError) throw deleteError
  if (!accounts.length) return

  const { error: insertError } = await client.from('project_platform_accesses').insert(
    accounts.map((account, index) => ({
      project_id: projectId,
      platform: account.platform,
      email: account.email,
      password_ciphertext: account.password || null,
      password_visible_by_default: true,
      sort_order: index,
    })),
  )
  if (insertError) throw insertError
}

async function saveEnvVariables(projectId: string, variables: ProjectVariable[]) {
  const client = requireSupabase()
  const { error } = await client.from('project_env_variables').upsert(
    variables.map((variable, index) => ({
      project_id: projectId,
      key: variable.key,
      value_text: variable.sensitive ? '' : variable.value,
      value_ciphertext: variable.sensitive ? variable.value || null : null,
      scope: getVariableScope(variable.key),
      is_sensitive: variable.sensitive,
      sort_order: index,
    })),
    { onConflict: 'project_id,key' },
  )
  if (error) throw error
}

async function saveProjectImages(projectId: string, images: ProjectImage[]) {
  const client = requireSupabase()
  const emptySlotIds = images.filter((image) => !image.dataUrl).map((image) => image.id)
  const imageRows = images
    .filter((image) => image.dataUrl)
    .map((image, index) => ({
      project_id: projectId,
      slot_id: image.id,
      name: image.name,
      type: image.id.includes('icon') ? 'Icona' : 'Logo',
      file_name: image.fileName,
      mime_type: image.mimeType || getDataUrlMimeType(image.dataUrl),
      size_bytes: image.sizeBytes,
      original_size_bytes: image.originalSizeBytes,
      path: '',
      data_url: image.dataUrl,
      sort_order: index,
    }))

  if (!imageRows.length) {
    const { error: deleteError } = await client.from('project_images').delete().eq('project_id', projectId)
    if (deleteError) throw deleteError
    return
  }

  const { error: upsertError } = await client.from('project_images').upsert(imageRows, { onConflict: 'project_id,slot_id' })
  if (upsertError) throw upsertError

  if (emptySlotIds.length) {
    const { error: deleteError } = await client.from('project_images').delete().eq('project_id', projectId).in('slot_id', emptySlotIds)
    if (deleteError) throw deleteError
  }
}

async function mapProjects(projects: ProjectRow[]) {
  const projectIds = projects.map((project) => project.id)
  if (!projectIds.length) return []

  const { envRows, agentRows, accessRows, fieldRows, imageRows } = await fetchProjectRelations(projectIds)
  const envByProjectId = groupRowsByProjectId(envRows)
  const accessByProjectId = groupRowsByProjectId(accessRows)
  const fieldByProjectId = groupRowsByProjectId(fieldRows)
  const imageByProjectId = groupRowsByProjectId(imageRows)
  const agentByProjectId = new Map(agentRows.map((row) => [row.project_id, row]))

  return projects.map((project) =>
    mapProjectRow(
      project,
      envByProjectId.get(project.id) ?? [],
      agentByProjectId.get(project.id),
      accessByProjectId.get(project.id) ?? [],
      fieldByProjectId.get(project.id) ?? [],
      imageByProjectId.get(project.id) ?? [],
    ),
  )
}

async function fetchProjectRelations(projectIds: string[]) {
  const client = requireSupabase()

  const [
    { data: envRows, error: envError },
    { data: agentRows, error: agentError },
    { data: accessRows, error: accessError },
    { data: fieldRows, error: fieldError },
    imageRows,
  ] = await Promise.all([
    client
      .from('project_env_variables')
      .select('project_id, key, value_text, value_ciphertext, scope, is_sensitive')
      .in('project_id', projectIds)
      .order('sort_order', { ascending: true }),
    client.from('project_agent_keys').select('project_id, key_prefix, key_ciphertext, sync_prompt').in('project_id', projectIds),
    client
      .from('project_platform_accesses')
      .select('id, project_id, platform, email, password_ciphertext, sort_order')
      .in('project_id', projectIds)
      .order('sort_order', { ascending: true }),
    client
      .from('project_data_fields')
      .select('id, project_id, field_key, label, value_text, value_ciphertext, is_secret, sort_order')
      .in('project_id', projectIds)
      .order('sort_order', { ascending: true }),
    fetchImageRows(projectIds),
  ])

  if (envError) throw envError
  if (agentError) throw agentError
  if (accessError) throw accessError
  if (fieldError) throw fieldError

  return {
    envRows: (envRows as EnvVariableRow[] | null) ?? [],
    agentRows: (agentRows as AgentKeyRow[] | null) ?? [],
    accessRows: (accessRows as PlatformAccessRow[] | null) ?? [],
    fieldRows: (fieldRows as DataFieldRow[] | null) ?? [],
    imageRows,
  }
}

function groupRowsByProjectId<T extends { project_id: string }>(rows: T[]) {
  const groupedRows = new Map<string, T[]>()

  for (const row of rows) {
    const currentRows = groupedRows.get(row.project_id)
    if (currentRows) {
      currentRows.push(row)
      continue
    }

    groupedRows.set(row.project_id, [row])
  }

  return groupedRows
}

function mapProjectRow(
  project: ProjectRow,
  envRows: EnvVariableRow[],
  agentRow?: AgentKeyRow,
  platformAccessRows: PlatformAccessRow[] = [],
  dataFieldRows: DataFieldRow[] = [],
  imageRows: ImageRow[] = [],
): Project {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    status: project.status,
    developmentEnvironment: project.development_environment,
    githubRepoUrl: project.github_repo_url,
    githubAccountEmail: project.github_account_email,
    linkedSecretLabel: project.linked_secret_label_ciphertext ?? '',
    supabase: {
      projectUrl: envRows.find((row) => row.key === 'SUPABASE_URL')?.value_text ?? '',
      anonKeyLabel: envRows.find((row) => row.key === 'SUPABASE_ANON_KEY')?.value_ciphertext ?? '',
      serviceRoleLabel: envRows.find((row) => row.key === 'SUPABASE_SERVICE_ROLE_KEY')?.value_ciphertext ?? '',
      databaseUrlLabel: envRows.find((row) => row.key === 'SUPABASE_DB_URL')?.value_ciphertext ?? '',
    },
    deploy: {
      provider: project.deploy_provider,
      url: project.deploy_url,
      accountEmail: project.deploy_account_email,
    },
    operationalNotes: project.operational_notes,
    agent: {
      projectId: project.agent_project_id,
      agentKey: agentRow?.key_ciphertext ?? agentRow?.key_prefix ?? '',
      syncPrompt: agentRow?.sync_prompt ?? '',
    },
    promptIds: [],
    assetIds: [],
    env: envRows.map((row) => ({
      key: row.key,
      value: row.is_sensitive ? row.value_ciphertext ?? '' : row.value_text,
      scope: row.scope,
      sensitive: row.is_sensitive,
    })),
    dataFields: dataFieldRows.map((field) => ({
      id: field.id,
      key: field.label || field.field_key,
      value: field.is_secret ? field.value_ciphertext ?? '' : field.value_text,
      sensitive: field.is_secret,
    })),
    platformAccesses: platformAccessRows.map(mapPlatformAccess),
    images: imageRows.map(mapProjectImage),
  }
}

async function fetchImageRows(projectIds: string[]) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('project_images')
    .select('project_id, slot_id, name, file_name, mime_type, size_bytes, original_size_bytes, data_url, sort_order')
    .in('project_id', projectIds)
    .order('sort_order', { ascending: true })

  if (!error) return (data as ImageRow[] | null) ?? []
  if (error.code === '42703' || error.code === 'PGRST204') return []
  throw error
}

function mapProjectImage(row: ImageRow): ProjectImage {
  return {
    id: row.slot_id,
    name: row.name,
    fileName: row.file_name,
    mimeType: row.mime_type,
    dataUrl: row.data_url,
    sizeBytes: row.size_bytes,
    originalSizeBytes: row.original_size_bytes,
  }
}

function mapPlatformAccess(row: PlatformAccessRow): PlatformAccess {
  return {
    id: row.id,
    platform: row.platform,
    email: row.email,
    password: row.password_ciphertext ?? '',
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

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}

function getFieldValue(fields: ProjectVariable[], key: string) {
  return fields.find((field) => field.key.trim().toLowerCase() === key.toLowerCase())?.value.trim() ?? ''
}

function getDataUrlMimeType(dataUrl: string) {
  return dataUrl.match(/^data:([^;]+);/)?.[1] ?? ''
}

function normalizeFieldKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function getVariableScope(key: string): Project['env'][number]['scope'] {
  if (key.startsWith('SUPABASE_')) return 'Supabase'
  if (key.startsWith('GITHUB_')) return 'GitHub'
  if (key.includes('RENDER') || key.includes('CLOUDFLARE') || key === 'LINK_DEPLOY') return 'Deploy'
  return 'Custom'
}

async function hashSecret(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
