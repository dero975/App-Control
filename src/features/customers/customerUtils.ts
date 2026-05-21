import type { Customer } from '../../types/app'
import { buildCustomerDisplayName } from './customerIdentity'

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallbackMessage
}

export function isReusableDraftCustomer(customer: Customer) {
  return /^Nuovo cliente \d+$/.test(buildCustomerDisplayName(customer)) &&
    !customer.company.trim() &&
    !customer.email.trim() &&
    !customer.developmentEmail.trim() &&
    !customer.password.trim() &&
    !customer.notes.trim() &&
    customer.projects.length === 0
}
