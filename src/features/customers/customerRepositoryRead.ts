import { requireSupabaseClient } from '../../lib/supabase'
import type { CustomerProject } from '../../types/app'
import { buildCustomerDisplayName } from './customerIdentity'
import { mapCustomerProjectListRow, mapCustomerProjectRow } from './customerRepositoryMappers'
import type {
  CustomerDataFieldRow,
  CustomerEnvVariableRow,
  CustomerProjectListRow,
  CustomerProjectRow,
  CustomerRow,
  PlatformAccessRow,
} from './customerRepositoryTypes'

export async function fetchCustomers() {
  const client = requireSupabaseClient()

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
    .select('id, customer_id, created_at, updated_at, name, status, development_environment, deploy_provider, deploy_url')
    .in('customer_id', customerIds)
    .order('updated_at', { ascending: false })

  if (projectsError) throw projectsError

  const projectsByCustomerId = groupCustomerProjectsByCustomerId((projectRows as CustomerProjectListRow[] | null) ?? [])

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

export async function fetchCustomerProjectById(projectId: string) {
  const projectRow = await fetchCustomerProjectRowById(projectId)
  const relations = await fetchProjectRelations([projectId])

  return mapCustomerProjectRow(
    projectRow,
    relations.envRowsByProjectId.get(projectId) ?? [],
    relations.dataFieldsByProjectId.get(projectId) ?? [],
    relations.platformAccessRowsByProjectId.get(projectId) ?? [],
  )
}

export async function fetchCustomerProjectRowById(projectId: string) {
  const client = requireSupabaseClient()
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

export async function fetchProjectRelations(projectIds: string[]) {
  const client = requireSupabaseClient()

  const [
    { data: envRows, error: envError },
    { data: dataFieldRows, error: dataFieldError },
    { data: platformAccessRows, error: platformAccessError },
  ] = await Promise.all([
    client
      .from('customer_project_env_variables')
      .select('id, customer_project_id, key, value_text, value_ciphertext, scope, is_sensitive, sort_order')
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

export function groupRowsByProjectId<T extends { customer_project_id: string }>(rows: T[]) {
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

function groupCustomerProjectsByCustomerId(projects: CustomerProjectListRow[]) {
  const projectsByCustomerId = new Map<string, CustomerProject[]>()

  for (const project of projects) {
    const mappedProject = mapCustomerProjectListRow(project)
    const currentProjects = projectsByCustomerId.get(project.customer_id)
    if (currentProjects) {
      currentProjects.push(mappedProject)
      continue
    }

    projectsByCustomerId.set(project.customer_id, [mappedProject])
  }

  return projectsByCustomerId
}
