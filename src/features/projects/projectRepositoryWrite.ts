import { assertUniqueIdentifiers, normalizeFieldKey } from '../../lib/repositoryUtils'
import { requireSupabaseClient } from '../../lib/supabase'
import { inferScopeFromEnvKey } from './projectShared'
import { fetchProjectRelations, fetchProjectRowById } from './projectRepositoryRead'
import type {
  DataFieldRow,
  EnvVariableRow,
  ImageRow,
  ProjectBackup,
  ProjectImage,
  ProjectVariable,
} from './projectRepositoryTypes'

export async function saveDataFields(projectId: string, sheetFields: ProjectVariable[]) {
  const coreKeys = new Set(['nome progetto', 'mail github', 'password', 'deploy con'])
  const customFields = sheetFields.filter((field) => !coreKeys.has(field.key.trim().toLowerCase()))
  await replaceDataFields(
    projectId,
    customFields.map((field, index) => ({
      project_id: projectId,
      field_key: normalizeFieldKey(field.key),
      label: field.key,
      value_text: field.sensitive ? '' : field.value,
      value_ciphertext: field.sensitive ? field.value || null : null,
      is_secret: field.sensitive,
      sort_order: index,
    })),
  )
}

export async function saveEnvVariables(projectId: string, variables: ProjectVariable[]) {
  await replaceEnvVariables(
    projectId,
    variables.map((variable, index) => ({
      project_id: projectId,
      key: variable.key,
      value_text: variable.sensitive ? '' : variable.value,
      value_ciphertext: variable.sensitive ? variable.value || null : null,
      scope: inferScopeFromEnvKey(variable.key),
      is_sensitive: variable.sensitive,
      sort_order: index,
    })),
  )
}

export async function saveProjectImages(projectId: string, images: ProjectImage[]) {
  await replaceProjectImages(
    projectId,
    images
      .filter((image) => image.dataUrl)
      .map((image, index) => ({
        project_id: projectId,
        slot_id: image.id,
        name: image.name,
        file_name: image.fileName,
        mime_type: image.mimeType || getDataUrlMimeType(image.dataUrl),
        size_bytes: image.sizeBytes,
        original_size_bytes: image.originalSizeBytes,
        data_url: image.dataUrl,
        sort_order: index,
      })),
  )
}

async function replaceDataFields(projectId: string, rows: Array<Omit<DataFieldRow, 'id'>>) {
  const client = requireSupabaseClient()
  assertUniqueIdentifiers(rows, (row) => row.field_key, 'Campi progetto duplicati')

  const { data: existingRows, error: existingError } = await client
    .from('project_data_fields')
    .select('id, field_key')
    .eq('project_id', projectId)
  if (existingError) throw existingError

  const existingByKey = new Map(((existingRows as Array<Pick<DataFieldRow, 'id' | 'field_key'>> | null) ?? []).map((row) => [row.field_key, row]))
  const keptIds: string[] = []

  for (const row of rows) {
    const payload = {
      ...row,
      visible_by_default: true,
      field_kind: 'text',
    }
    const existingRow = existingByKey.get(row.field_key)

    if (existingRow) {
      const { error } = await client.from('project_data_fields').update(payload).eq('id', existingRow.id)
      if (error) throw error
      keptIds.push(existingRow.id)
      continue
    }

    const { data, error } = await client.from('project_data_fields').insert(payload).select('id').single()
    if (error) throw error
    keptIds.push((data as Pick<DataFieldRow, 'id'>).id)
  }

  await deleteObsoleteRows('project_data_fields', (existingRows as Array<Pick<DataFieldRow, 'id'>> | null) ?? [], keptIds)
}

async function replaceEnvVariables(projectId: string, rows: Array<EnvVariableRow & { sort_order: number }>) {
  const client = requireSupabaseClient()
  assertUniqueIdentifiers(rows, (row) => row.key, 'Variabili progetto duplicate')

  const { data: existingRows, error: existingError } = await client
    .from('project_env_variables')
    .select('id, key')
    .eq('project_id', projectId)
  if (existingError) throw existingError

  const existingByKey = new Map(((existingRows as Array<Pick<EnvVariableRow, 'id' | 'key'>> | null) ?? []).map((row) => [row.key, row]))
  const keptIds: string[] = []

  for (const row of rows) {
    const rowPayload = {
      project_id: row.project_id,
      key: row.key,
      value_text: row.value_text,
      value_ciphertext: row.value_ciphertext,
      scope: row.scope,
      is_sensitive: row.is_sensitive,
      sort_order: row.sort_order,
    }
    const existingRow = existingByKey.get(row.key)

    if (existingRow?.id) {
      const { error } = await client.from('project_env_variables').update(rowPayload).eq('id', existingRow.id)
      if (error) throw error
      keptIds.push(existingRow.id)
      continue
    }

    const { data, error } = await client.from('project_env_variables').insert(rowPayload).select('id').single()
    if (error) throw error
    keptIds.push((data as Required<Pick<EnvVariableRow, 'id'>>).id)
  }

  await deleteObsoleteRows('project_env_variables', (existingRows as Array<Required<Pick<EnvVariableRow, 'id'>>> | null) ?? [], keptIds)
}

async function replaceProjectImages(projectId: string, rows: ImageRow[]) {
  const client = requireSupabaseClient()
  assertUniqueIdentifiers(rows, (row) => row.slot_id, 'Slot immagine duplicati')

  const { data: existingRows, error: existingError } = await client
    .from('project_images')
    .select('id, slot_id')
    .eq('project_id', projectId)
  if (existingError) throw existingError

  const existingBySlotId = new Map(((existingRows as Array<Required<Pick<ImageRow, 'id'>> & Pick<ImageRow, 'slot_id'>> | null) ?? []).map((row) => [row.slot_id, row]))
  const keptIds: string[] = []

  for (const row of rows) {
    const payload = {
      project_id: row.project_id,
      slot_id: row.slot_id,
      name: row.name,
      file_name: row.file_name,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      original_size_bytes: row.original_size_bytes,
      data_url: row.data_url,
      sort_order: row.sort_order,
      type: row.slot_id.includes('icon') ? 'Icona' : 'Logo',
      path: '',
    }
    const existingRow = existingBySlotId.get(row.slot_id)

    if (existingRow) {
      const { error } = await client.from('project_images').update(payload).eq('id', existingRow.id)
      if (error) throw error
      keptIds.push(existingRow.id)
      continue
    }

    const { data, error } = await client.from('project_images').insert(payload).select('id').single()
    if (error) throw error
    keptIds.push((data as Required<Pick<ImageRow, 'id'>>).id)
  }

  await deleteObsoleteRows('project_images', (existingRows as Array<Required<Pick<ImageRow, 'id'>>> | null) ?? [], keptIds)
}

async function deleteObsoleteRows(tableName: string, existingRows: Array<{ id: string }>, keptIds: string[]) {
  const obsoleteIds = existingRows
    .map((row) => row.id)
    .filter((id) => !keptIds.includes(id))

  if (!obsoleteIds.length) return

  const client = requireSupabaseClient()
  const { error } = await client.from(tableName).delete().in('id', obsoleteIds)
  if (error) throw error
}

export async function fetchProjectBackup(projectId: string): Promise<ProjectBackup> {
  const projectRow = await fetchProjectRowById(projectId)
  const relations = await fetchProjectRelations([projectId])

  return {
    projectRow,
    envRows: relations.envRows.filter((row) => row.project_id === projectId),
    fieldRows: relations.fieldRows.filter((row) => row.project_id === projectId),
    imageRows: relations.imageRows.filter((row) => row.project_id === projectId),
  }
}

export async function restoreProjectBackup(backup: ProjectBackup) {
  const client = requireSupabaseClient()
  const { projectRow } = backup

  const { error } = await client
    .from('projects')
    .update({
      agent_project_id: projectRow.agent_project_id,
      name: projectRow.name,
      status: projectRow.status,
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

  await replaceDataFields(
    projectRow.id,
    backup.fieldRows.map((row, index) => ({
      project_id: row.project_id,
      field_key: row.field_key,
      label: row.label,
      value_text: row.value_text,
      value_ciphertext: row.value_ciphertext,
      is_secret: row.is_secret,
      sort_order: row.sort_order ?? index,
    })),
  )
  await replaceEnvVariables(
    projectRow.id,
    backup.envRows.map((row, index) => ({
      ...row,
      sort_order: index,
    })),
  )
  await replaceProjectImages(
    projectRow.id,
    backup.imageRows.map((row, index) => ({
      ...row,
      sort_order: row.sort_order ?? index,
    })),
  )
}

function getDataUrlMimeType(dataUrl: string) {
  return dataUrl.match(/^data:([^;]+);/)?.[1] ?? ''
}
