import { assertUniqueIdentifiers } from '../../lib/repositoryUtils'
import { requireSupabaseClient } from '../../lib/supabase'
import type { CustomerDataFieldRow, CustomerEnvVariableRow, PlatformAccessRow, PlatformAccessWriteRow } from './customerRepositoryTypes'

export async function replaceProjectEnvVariables(projectId: string, rows: CustomerEnvVariableRow[]) {
  const client = requireSupabaseClient()
  assertUniqueIdentifiers(rows, (row) => row.key, 'Variabili progetto cliente duplicate')

  const { data: existingRows, error: existingError } = await client
    .from('customer_project_env_variables')
    .select('id, key')
    .eq('customer_project_id', projectId)
  if (existingError) throw existingError

  const existingByKey = new Map(
    ((existingRows as Array<Required<Pick<CustomerEnvVariableRow, 'id'>> & Pick<CustomerEnvVariableRow, 'key'>> | null) ?? []).map((row) => [
      row.key,
      row,
    ]),
  )
  const keptIds: string[] = []

  for (const row of rows) {
    const payload = {
      customer_project_id: row.customer_project_id,
      key: row.key,
      value_text: row.value_text,
      value_ciphertext: row.value_ciphertext,
      scope: row.scope,
      is_sensitive: row.is_sensitive,
      sort_order: row.sort_order,
    }
    const existingRow = existingByKey.get(row.key)

    if (existingRow) {
      const { error } = await client.from('customer_project_env_variables').update(payload).eq('id', existingRow.id)
      if (error) throw error
      keptIds.push(existingRow.id)
      continue
    }

    const { data, error } = await client.from('customer_project_env_variables').insert(payload).select('id').single()
    if (error) throw error
    keptIds.push((data as Required<Pick<CustomerEnvVariableRow, 'id'>>).id)
  }

  await deleteObsoleteRows('customer_project_env_variables', (existingRows as Array<Required<Pick<CustomerEnvVariableRow, 'id'>>> | null) ?? [], keptIds)
}

export async function replaceProjectDataFields(projectId: string, rows: Array<Omit<CustomerDataFieldRow, 'id'>>) {
  const client = requireSupabaseClient()
  assertUniqueIdentifiers(rows, (row) => row.field_key, 'Campi progetto cliente duplicati')

  const { data: existingRows, error: existingError } = await client
    .from('customer_project_data_fields')
    .select('id, field_key')
    .eq('customer_project_id', projectId)
  if (existingError) throw existingError

  const existingByKey = new Map(((existingRows as Array<Pick<CustomerDataFieldRow, 'id' | 'field_key'>> | null) ?? []).map((row) => [row.field_key, row]))
  const keptIds: string[] = []

  for (const row of rows) {
    const payload = {
      ...row,
      visible_by_default: true,
      field_kind: 'text',
    }
    const existingRow = existingByKey.get(row.field_key)

    if (existingRow) {
      const { error } = await client.from('customer_project_data_fields').update(payload).eq('id', existingRow.id)
      if (error) throw error
      keptIds.push(existingRow.id)
      continue
    }

    const { data, error } = await client.from('customer_project_data_fields').insert(payload).select('id').single()
    if (error) throw error
    keptIds.push((data as Pick<CustomerDataFieldRow, 'id'>).id)
  }

  await deleteObsoleteRows('customer_project_data_fields', (existingRows as Array<Pick<CustomerDataFieldRow, 'id'>> | null) ?? [], keptIds)
}

export async function replaceProjectPlatformAccesses(projectId: string, rows: PlatformAccessWriteRow[]) {
  const client = requireSupabaseClient()
  const { data: existingRows, error: existingError } = await client
    .from('customer_project_platform_accesses')
    .select('id')
    .eq('customer_project_id', projectId)
  if (existingError) throw existingError

  const existingIds = new Set(((existingRows as Array<Pick<PlatformAccessRow, 'id'>> | null) ?? []).map((row) => row.id))
  const keptIds: string[] = []

  for (const row of rows) {
    const { id, ...rowPayload } = row
    const payload = {
      ...rowPayload,
      password_visible_by_default: true,
    }

    if (id && existingIds.has(id)) {
      const { error } = await client.from('customer_project_platform_accesses').update(payload).eq('id', id)
      if (error) throw error
      keptIds.push(id)
      continue
    }

    const { data, error } = await client.from('customer_project_platform_accesses').insert(payload).select('id').single()
    if (error) throw error
    keptIds.push((data as Pick<PlatformAccessRow, 'id'>).id)
  }

  await deleteObsoleteRows('customer_project_platform_accesses', (existingRows as Array<Pick<PlatformAccessRow, 'id'>> | null) ?? [], keptIds)
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
