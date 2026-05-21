import { requireSupabaseClient } from '../../lib/supabase'
import type { Customer } from '../../types/app'
import { buildCustomerDisplayName, buildCustomerDraftIdentity } from './customerIdentity'
import type { CustomerRow } from './customerRepositoryTypes'

export async function createCustomerRecord(index: number) {
  const client = requireSupabaseClient()
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
  const client = requireSupabaseClient()
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
  const client = requireSupabaseClient()
  const { error } = await client.from('customers').delete().eq('id', customerId)
  if (error) throw error
}
