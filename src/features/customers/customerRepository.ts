import { supabase } from '../../lib/supabase'
import type { Customer, CustomerProject, EnvVariable, PlatformAccess, ProjectStatus, ProjectVariable } from '../../types/app'
import { supabaseServiceKey } from '../projects/projectShared'
import { buildCustomerDisplayName, buildCustomerDraftIdentity } from './customerIdentity'

const legacyCustomerStorageKey = 'app-control-customers'

type CustomerRow = {
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

type CustomerProjectRow = {
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

type PlatformAccessRow = {
  id: string
  customer_project_id: string
  platform: string
  email: string
  password_ciphertext: string | null
  sort_order: number
}

type CustomerEnvVariableRow = {
  id?: string
  customer_project_id: string
  key: string
  value_text: string
  value_ciphertext: string | null
  scope: EnvVariable['scope']
  is_sensitive: boolean
  sort_order: number
}

type CustomerDataFieldRow = {
  id: string
  customer_project_id: string
  field_key: string
  label: string
  value_text: string
  value_ciphertext: string | null
  is_secret: boolean
  sort_order: number
}

type CustomerProjectBackup = {
  projectRow: CustomerProjectRow
  envRows: CustomerEnvVariableRow[]
  dataFieldRows: CustomerDataFieldRow[]
  platformAccessRows: PlatformAccessRow[]
}

export async function fetchCustomers() {
  const client = requireSupabase()

  const { data: customerRows, error: customersError } = await client
    .from('customers')
    .select('id, created_at, updated_at, name, first_name, last_name, company, email, development_email, password_ciphertext, notes')
    .order('updated_at', { ascending: false })

  if (customersError) throw customersError

  const customers = (customerRows as CustomerRow[] | null) ?? []
  if (!customers.length) return []

  const customerIds = customers.map((customer) => customer.id)
  const { data: projectRows, error: projectsError } = await client
    .from('customer_projects')
    .select(
      'id, customer_id, created_at, updated_at, name, status, development_environment, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .in('customer_id', customerIds)
    .order('updated_at', { ascending: false })

  if (projectsError) throw projectsError

  const projects = (projectRows as CustomerProjectRow[] | null) ?? []
  const projectIds = projects.map((project) => project.id)
  const relations = projectIds.length ? await fetchProjectRelations(projectIds) : emptyProjectRelations()

  const projectsByCustomerId = new Map<string, CustomerProject[]>()

  for (const project of projects) {
    const mappedProject = mapCustomerProjectRow(
      project,
      relations.envRowsByProjectId.get(project.id) ?? [],
      relations.dataFieldsByProjectId.get(project.id) ?? [],
      relations.platformAccessRowsByProjectId.get(project.id) ?? [],
    )
    const currentProjects = projectsByCustomerId.get(project.customer_id)
    if (currentProjects) {
      currentProjects.push(mappedProject)
      continue
    }

    projectsByCustomerId.set(project.customer_id, [mappedProject])
  }

  return customers.map((customer) => ({
    id: customer.id,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    name: buildCustomerDisplayName({
      name: customer.name,
      firstName: customer.first_name,
      lastName: customer.last_name,
      company: customer.company,
    }),
    firstName: customer.first_name,
    lastName: customer.last_name,
    company: customer.company,
    email: customer.email,
    developmentEmail: customer.development_email,
    password: customer.password_ciphertext ?? '',
    notes: customer.notes,
    projects: projectsByCustomerId.get(customer.id) ?? [],
  }))
}

export async function createCustomerRecord(index: number) {
  const client = requireSupabase()
  const draftIdentity = buildCustomerDraftIdentity(index)

  const { data, error } = await client
    .from('customers')
    .insert({
      name: draftIdentity.name,
      first_name: draftIdentity.firstName,
      last_name: draftIdentity.lastName,
      company: draftIdentity.company,
      email: '',
      development_email: '',
      password_ciphertext: '',
      notes: '',
    })
    .select('id, created_at, updated_at, name, first_name, last_name, company, email, development_email, password_ciphertext, notes')
    .single()

  if (error) throw error

  const customer = data as CustomerRow

  return {
    id: customer.id,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    name: customer.name,
    firstName: customer.first_name,
    lastName: customer.last_name,
    company: customer.company,
    email: customer.email,
    developmentEmail: customer.development_email,
    password: customer.password_ciphertext ?? '',
    notes: customer.notes,
    projects: [],
  } satisfies Customer
}

export async function saveCustomerRecord(customer: Customer) {
  const client = requireSupabase()
  const canonicalName = buildCustomerDisplayName(customer)

  const { data, error } = await client
    .from('customers')
    .update({
      name: canonicalName,
      first_name: customer.firstName,
      last_name: customer.lastName,
      company: customer.company,
      email: customer.email,
      development_email: customer.developmentEmail,
      password_ciphertext: customer.password || null,
      notes: customer.notes,
    })
    .eq('id', customer.id)
    .select('id, created_at, updated_at, name, first_name, last_name, company, email, development_email, password_ciphertext, notes')
    .single()

  if (error) throw error

  const row = data as CustomerRow

  return {
    ...customer,
    name: canonicalName,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function deleteCustomerRecord(customerId: string) {
  const client = requireSupabase()
  const { error } = await client.from('customers').delete().eq('id', customerId)
  if (error) throw error
}

export async function createCustomerProjectRecord(customerId: string, index: number) {
  const client = requireSupabase()
  const defaultEnv = buildDefaultProjectEnv()

  const { data: projectData, error: projectError } = await client
    .from('customer_projects')
    .insert({
      customer_id: customerId,
      name: `Nuovo progetto ${index}`,
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
    .insert(
      defaultEnv.map((variable, indexPosition) => ({
        customer_project_id: createdProject.id,
        key: variable.key,
        value_text: '',
        value_ciphertext: null,
        scope: variable.scope,
        is_sensitive: variable.sensitive,
        sort_order: indexPosition,
      })),
    )
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
  const client = requireSupabase()
  const backup = await fetchCustomerProjectBackup(project.id)

  try {
    const { error: projectError } = await client
      .from('customer_projects')
      .update({
        customer_id: customerId,
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
  const client = requireSupabase()
  const { error } = await client.from('customer_projects').delete().eq('id', projectId)
  if (error) throw error
}

export function clearLegacyCustomerStorage() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(legacyCustomerStorageKey)
}

async function fetchProjectRelations(projectIds: string[]) {
  const client = requireSupabase()

  const [
    { data: envRows, error: envError },
    { data: dataFieldRows, error: dataFieldError },
    { data: platformAccessRows, error: platformAccessError },
  ] = await Promise.all([
    client
      .from('customer_project_env_variables')
      .select('customer_project_id, key, value_text, value_ciphertext, scope, is_sensitive, sort_order')
      .in('customer_project_id', projectIds)
      .order('sort_order', { ascending: true }),
    client
      .from('customer_project_data_fields')
      .select('id, customer_project_id, field_key, label, value_text, value_ciphertext, is_secret, sort_order')
      .in('customer_project_id', projectIds)
      .order('sort_order', { ascending: true }),
    client
      .from('customer_project_platform_accesses')
      .select('id, customer_project_id, platform, email, password_ciphertext, sort_order')
      .in('customer_project_id', projectIds)
      .order('sort_order', { ascending: true }),
  ])

  if (envError) throw envError
  if (dataFieldError) throw dataFieldError
  if (platformAccessError) throw platformAccessError

  return {
    envRowsByProjectId: groupRowsByProjectId((envRows as CustomerEnvVariableRow[] | null) ?? []),
    dataFieldsByProjectId: groupRowsByProjectId((dataFieldRows as CustomerDataFieldRow[] | null) ?? []),
    platformAccessRowsByProjectId: groupRowsByProjectId((platformAccessRows as PlatformAccessRow[] | null) ?? []),
  }
}

async function saveProjectEnvVariables(projectId: string, envVariables: EnvVariable[]) {
  const sanitizedVariables = sanitizeEnvVariables(envVariables)
  await replaceProjectEnvVariables(
    projectId,
    sanitizedVariables.map((variable, index) => ({
      customer_project_id: projectId,
      key: variable.key,
      value_text: variable.sensitive ? '' : variable.value,
      value_ciphertext: variable.sensitive ? variable.value || null : null,
      scope: variable.scope,
      is_sensitive: variable.sensitive,
      sort_order: index,
    })),
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
      customer_project_id: projectId,
      platform: access.platform.trim(),
      email: access.email.trim(),
      password_ciphertext: access.password || null,
      sort_order: index,
    })),
  )
}

async function replaceProjectEnvVariables(projectId: string, rows: CustomerEnvVariableRow[]) {
  const client = requireSupabase()
  const { error: deleteError } = await client.from('customer_project_env_variables').delete().eq('customer_project_id', projectId)
  if (deleteError) throw deleteError
  if (!rows.length) return

  const { error } = await client.from('customer_project_env_variables').insert(rows)
  if (error) throw error
}

async function replaceProjectDataFields(projectId: string, rows: Array<Omit<CustomerDataFieldRow, 'id'>>) {
  const client = requireSupabase()
  const { error: deleteError } = await client.from('customer_project_data_fields').delete().eq('customer_project_id', projectId)
  if (deleteError) throw deleteError
  if (!rows.length) return

  const { error } = await client.from('customer_project_data_fields').insert(
    rows.map((row) => ({
      ...row,
      visible_by_default: true,
      field_kind: 'text',
    })),
  )
  if (error) throw error
}

async function replaceProjectPlatformAccesses(projectId: string, rows: Array<Omit<PlatformAccessRow, 'id'>>) {
  const client = requireSupabase()
  const { error: deleteError } = await client.from('customer_project_platform_accesses').delete().eq('customer_project_id', projectId)
  if (deleteError) throw deleteError
  if (!rows.length) return

  const { error } = await client.from('customer_project_platform_accesses').insert(
    rows.map((row) => ({
      ...row,
      password_visible_by_default: true,
    })),
  )
  if (error) throw error
}

function emptyProjectRelations() {
  return {
    envRowsByProjectId: new Map<string, CustomerEnvVariableRow[]>(),
    dataFieldsByProjectId: new Map<string, CustomerDataFieldRow[]>(),
    platformAccessRowsByProjectId: new Map<string, PlatformAccessRow[]>(),
  }
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
  const client = requireSupabase()
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

  await replaceProjectEnvVariables(
    projectRow.id,
    backup.envRows.map((row, index) => ({
      ...row,
      sort_order: row.sort_order ?? index,
    })),
  )
  await replaceProjectDataFields(
    projectRow.id,
    backup.dataFieldRows.map((row, index) => ({
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
    backup.platformAccessRows.map((row, index) => ({
      customer_project_id: row.customer_project_id,
      platform: row.platform,
      email: row.email,
      password_ciphertext: row.password_ciphertext,
      sort_order: row.sort_order ?? index,
    })),
  )
}

function groupRowsByProjectId<T extends { customer_project_id: string }>(rows: T[]) {
  const groupedRows = new Map<string, T[]>()

  for (const row of rows) {
    const currentRows = groupedRows.get(row.customer_project_id)
    if (currentRows) {
      currentRows.push(row)
      continue
    }

    groupedRows.set(row.customer_project_id, [row])
  }

  return groupedRows
}

function mapCustomerProjectRow(
  project: CustomerProjectRow,
  envRows: CustomerEnvVariableRow[],
  dataFieldRows: CustomerDataFieldRow[],
  platformAccessRows: PlatformAccessRow[],
): CustomerProject {
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

async function fetchCustomerProjectById(projectId: string) {
  const projectRow = await fetchCustomerProjectRowById(projectId)
  const relations = await fetchProjectRelations([projectId])

  return mapCustomerProjectRow(
    projectRow,
    relations.envRowsByProjectId.get(projectId) ?? [],
    relations.dataFieldsByProjectId.get(projectId) ?? [],
    relations.platformAccessRowsByProjectId.get(projectId) ?? [],
  )
}

async function fetchCustomerProjectRowById(projectId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('customer_projects')
    .select(
      'id, customer_id, created_at, updated_at, name, status, development_environment, github_repo_url, github_account_email, linked_secret_label_ciphertext, deploy_provider, deploy_url, deploy_account_email, operational_notes',
    )
    .eq('id', projectId)
    .single()
  if (error) throw error
  return data as CustomerProjectRow
}

function buildDefaultProjectEnv(): EnvVariable[] {
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

function sanitizeEnvVariables(envVariables: EnvVariable[]) {
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

function sanitizeProjectVariables(dataFields: ProjectVariable[]) {
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

function normalizeFieldKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}
