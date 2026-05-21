import type { Customer, CustomerProject } from '../../types/app'
import { buildCustomerDisplayName } from './customerIdentity'
import type { CustomerProjectTab } from './customerPageConstants'

export function getNextSelectedProjectId(customers: Customer[], currentProjectId: string) {
  const allProjects = customers.flatMap((customer) => customer.projects)
  if (currentProjectId && allProjects.some((project) => project.id === currentProjectId)) return currentProjectId
  return customers[0]?.projects[0]?.id ?? ''
}

export function mergeLoadedCustomerProject(customers: Customer[], project: CustomerProject) {
  return customers.map((customer) => ({
    ...customer,
    projects: customer.projects.map((currentProject) => (currentProject.id === project.id ? project : currentProject)),
  }))
}

export function getFirstMatchingCustomer(customers: Customer[], query: string, selectedCustomerId: string) {
  if (!customers.length) return null
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return null

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)
  if (selectedCustomer && customerMatchesQuery(selectedCustomer, normalizedQuery)) return null
  return customers.find((customer) => customerMatchesQuery(customer, normalizedQuery)) ?? null
}

export function selectCustomerProject(
  customer: Customer,
  onSelectCustomer: (customerId: string) => void,
  setSelectedProjectId: (projectId: string) => void,
  setActiveProjectTab: (tab: CustomerProjectTab) => void,
) {
  onSelectCustomer(customer.id)
  setSelectedProjectId(customer.projects[0]?.id ?? '')
  setActiveProjectTab('Dati progetto')
}

export function prependCustomerProject(customers: Customer[], customerId: string, project: CustomerProject) {
  return customers.map((customer) => (customer.id === customerId ? { ...customer, projects: [project, ...customer.projects] } : customer))
}

export function removeCustomerProject(customers: Customer[], customerId: string, projectId: string) {
  return customers.map((customer) => (
    customer.id === customerId
      ? { ...customer, projects: customer.projects.filter((currentProject) => currentProject.id !== projectId) }
      : customer
  ))
}

export function mergeSavedCustomer(customers: Customer[], savedCustomer: Customer) {
  return customers.map((currentCustomer) => (
    currentCustomer.id === savedCustomer.id
      ? { ...currentCustomer, createdAt: savedCustomer.createdAt, updatedAt: savedCustomer.updatedAt }
      : currentCustomer
  ))
}

export function replaceCustomerProject(customers: Customer[], customerId: string, savedProject: CustomerProject) {
  return customers.map((currentCustomer) => {
    if (currentCustomer.id !== customerId) return currentCustomer
    return {
      ...currentCustomer,
      projects: currentCustomer.projects.map((currentProject) => (currentProject.id === savedProject.id ? savedProject : currentProject)),
    }
  })
}

function customerMatchesQuery(customer: Customer, normalizedQuery: string) {
  return [buildCustomerDisplayName(customer), customer.company, customer.email, customer.developmentEmail]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}
