import type { Customer } from '../../types/app'

export function buildCustomerDisplayName(customer: Pick<Customer, 'firstName' | 'lastName' | 'company' | 'name'>) {
  const fullName = [customer.firstName, customer.lastName].map((value) => value.trim()).filter(Boolean).join(' ').trim()
  if (fullName) return fullName

  const company = customer.company.trim()
  if (company) return company

  return customer.name.trim() || 'Cliente senza nome'
}

export function buildCustomerDraftIdentity(index: number) {
  return {
    name: `Nuovo cliente ${index}`,
    firstName: 'Nuovo',
    lastName: `cliente ${index}`,
    company: '',
  }
}
