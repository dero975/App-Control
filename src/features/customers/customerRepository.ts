const legacyCustomerStorageKey = 'app-control-customers'

export { createCustomerRecord, deleteCustomerRecord, saveCustomerRecord } from './customerRepositoryCustomerWrite'
export { fetchCustomerProjectById, fetchCustomers } from './customerRepositoryRead'
export {
  createCustomerProjectRecord,
  deleteCustomerProjectRecord,
  saveCustomerProjectSnapshot,
} from './customerRepositoryProjectWrite'

export function clearLegacyCustomerStorage() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(legacyCustomerStorageKey)
}
