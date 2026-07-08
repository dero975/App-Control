import { requireSupabaseClient } from '../../lib/supabase'
import { normalizeProjectName, supabaseServiceKeyAliases } from './projectShared'
import type {
  AgentKeyRow,
  DataFieldRow,
  EnvVariableRow,
  ImageRow,
  Project,
  ProjectImage,
  ProjectListRow,
  ProjectRow,
} from './projectRepositoryTypes'

export async function mapProjects(projects: ProjectRow[], includeImages = true) {
  const projectIds = projects.map((project) => project.id)
  if (!projectIds.length) return []

  const { envRows, agentRows, fieldRows, imageRows } = await fetchProjectRelations(projectIds, includeImages)
  const envByProjectId = groupRowsByProjectId(envRows)
  const fieldByProjectId = groupRowsByProjectId(fieldRows)
  const imageByProjectId = groupRowsByProjectId(imageRows)
  const agentByProjectId = new Map(agentRows.map((row) => [row.project_id, row]))

  return projects.map((project) =>
    mapProjectRow(
      project,
      envByProjectId.get(project.id) ?? [],
      agentByProjectId.get(project.id),
      fieldByProjectId.get(project.id) ?? [],
      imageByProjectId.get(project.id) ?? [],
    ),
  )
}

export function mapProjectListRow(project: ProjectListRow): Project {
  return {
    id: project.id,
    name: normalizeProjectName(project.name),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    status: project.status,
    githubRepoUrl: '',
    githubAccountEmail: '',
    linkedSecretLabel: '',
    supabase: {
      projectUrl: '',
      anonKeyLabel: '',
      serviceRoleLabel: '',
      databaseUrlLabel: '',
    },
    deploy: {
      provider: project.deploy_provider,
      url: project.deploy_url,
      accountEmail: '',
    },
    operationalNotes: '',
    agent: {
      projectId: project.agent_project_id,
      agentKey: '',
      syncPrompt: '',
    },
    promptIds: [],
    assetIds: [],
    env: [],
    dataFields: [],
    images: [],
  }
}

export async function fetchProjectRelations(projectIds: string[], includeImages = true) {
  const client = requireSupabaseClient()

  const [
    { data: envRows, error: envError },
    { data: agentRows, error: agentError },
    { data: fieldRows, error: fieldError },
    // Le immagini (data_url base64) sono pesanti: si caricano solo su richiesta,
    // non nel prefetch iniziale di tutti i progetti.
    imageRows,
  ] = await Promise.all([
    client
      .from('project_env_variables')
      .select('id, project_id, key, value_text, value_ciphertext, scope, is_sensitive')
      .in('project_id', projectIds)
      .order('sort_order', { ascending: true }),
    client.from('project_agent_keys').select('project_id, key_prefix, key_ciphertext, sync_prompt').in('project_id', projectIds),
    client
      .from('project_data_fields')
      .select('id, project_id, field_key, label, value_text, value_ciphertext, is_secret, sort_order')
      .in('project_id', projectIds)
      .order('sort_order', { ascending: true }),
    includeImages ? fetchImageRows(projectIds) : Promise.resolve([] as ImageRow[]),
  ])

  if (envError) throw envError
  if (agentError) throw agentError
  if (fieldError) throw fieldError

  return {
    envRows: (envRows as EnvVariableRow[] | null) ?? [],
    agentRows: (agentRows as AgentKeyRow[] | null) ?? [],
    fieldRows: (fieldRows as DataFieldRow[] | null) ?? [],
    imageRows,
  }
}

export async function fetchProjectRowById(projectId: string) {
  const client = requireSupabaseClient()
  const { data, error } = await client
    .from('projects')
    .select(
      'id, agent_project_id, name, created_at, updated_at, status, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .eq('id', projectId)
    .single()
  if (error) throw error
  return data as ProjectRow
}

export function groupRowsByProjectId<T extends { project_id: string }>(rows: T[]) {
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

export function mapProjectRow(
  project: ProjectRow,
  envRows: EnvVariableRow[],
  agentRow?: AgentKeyRow,
  dataFieldRows: DataFieldRow[] = [],
  imageRows: ImageRow[] = [],
): Project {
  return {
    id: project.id,
    name: normalizeProjectName(project.name),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    status: project.status,
    githubRepoUrl: project.github_repo_url,
    githubAccountEmail: project.github_account_email,
    linkedSecretLabel: project.linked_secret_label_ciphertext ?? '',
    supabase: {
      projectUrl: envRows.find((row) => row.key === 'SUPABASE_URL')?.value_text ?? '',
      anonKeyLabel: envRows.find((row) => row.key === 'SUPABASE_ANON_KEY')?.value_ciphertext ?? '',
      serviceRoleLabel: supabaseServiceKeyAliases.map((key) => envRows.find((row) => row.key === key)?.value_ciphertext).find(Boolean) ?? '',
      databaseUrlLabel:
        envRows.find((row) => row.key === 'DATABASE_URL')?.value_ciphertext ??
        envRows.find((row) => row.key === 'SUPABASE_DB_URL')?.value_ciphertext ??
        '',
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
    images: imageRows.map(mapProjectImage),
  }
}

async function fetchImageRows(projectIds: string[]) {
  const client = requireSupabaseClient()
  const { data, error } = await client
    .from('project_images')
    .select('id, project_id, slot_id, name, file_name, mime_type, size_bytes, original_size_bytes, data_url, sort_order')
    .in('project_id', projectIds)
    .order('sort_order', { ascending: true })

  if (!error) return (data as ImageRow[] | null) ?? []
  if (error.code === '42703' || error.code === 'PGRST204') return []
  throw error
}

// Immagini (data_url base64) di un singolo progetto, caricate on-demand quando
// si apre il progetto: escluse dal prefetch iniziale per non appesantirlo.
export async function fetchProjectImages(projectId: string): Promise<ProjectImage[]> {
  const rows = await fetchImageRows([projectId])
  return rows.map(mapProjectImage)
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

