import { ChevronDown, Trash2 } from 'lucide-react'
import { FieldGroup } from '../../components/FieldGroup'
import type { Customer } from '../../types/app'
import { buildCustomerDisplayName } from './customerIdentity'

export function CustomerDetailsCard({
  customer,
  isOpen,
  onDelete,
  onToggleOpen,
  onUpdateCustomer,
}: {
  customer: Customer
  isOpen: boolean
  onDelete: () => void
  onToggleOpen: () => void
  onUpdateCustomer: (updater: (customer: Customer) => Customer) => void
}) {
  return (
    <FieldGroup
      className="customer-details-card"
      title={buildCustomerDisplayName(customer)}
      description={isOpen ? [customer.email.trim(), customer.developmentEmail.trim()].filter(Boolean).join(' · ') || undefined : undefined}
      action={<CustomerDetailsActions isOpen={isOpen} onDelete={onDelete} onToggleOpen={onToggleOpen} />}
    >
      {isOpen ? <CustomerDetailsForm customer={customer} onUpdateCustomer={onUpdateCustomer} /> : null}
    </FieldGroup>
  )
}

function CustomerDetailsActions({
  isOpen,
  onDelete,
  onToggleOpen,
}: {
  isOpen: boolean
  onDelete: () => void
  onToggleOpen: () => void
}) {
  return (
    <div className="customer-details-card__actions">
      {isOpen ? (
        <button type="button" className="danger-button" onClick={onDelete}>
          <Trash2 aria-hidden="true" className="button-icon" />
          Elimina cliente
        </button>
      ) : null}
      <button
        type="button"
        className={isOpen ? 'customer-section-toggle customer-section-toggle--open' : 'customer-section-toggle'}
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-controls="customer-details-panel"
      >
        <span>{isOpen ? 'Chiudi' : 'Apri'}</span>
        <ChevronDown aria-hidden="true" className="customer-section-toggle__icon" />
      </button>
    </div>
  )
}

function CustomerDetailsForm({
  customer,
  onUpdateCustomer,
}: {
  customer: Customer
  onUpdateCustomer: (updater: (customer: Customer) => Customer) => void
}) {
  return (
    <div id="customer-details-panel" className="customer-details-panel">
      <div className="customer-form-grid customer-form-grid--customer">
        <CustomerTextField label="Nome" value={customer.firstName} onChange={(firstName) => onUpdateCustomer((current) => updateCustomerName(current, { firstName }))} />
        <CustomerTextField label="Cognome" value={customer.lastName} onChange={(lastName) => onUpdateCustomer((current) => updateCustomerName(current, { lastName }))} />
        <CustomerTextField label="Azienda" value={customer.company} onChange={(company) => onUpdateCustomer((current) => updateCustomerName(current, { company }))} />
        <CustomerTextField label="Email" type="email" value={customer.email} onChange={(email) => onUpdateCustomer((current) => ({ ...current, email }))} />
        <CustomerTextField label="Email sviluppo" type="email" value={customer.developmentEmail} onChange={(developmentEmail) => onUpdateCustomer((current) => ({ ...current, developmentEmail }))} />
        <CustomerTextField label="Password" value={customer.password} onChange={(password) => onUpdateCustomer((current) => ({ ...current, password }))} />
      </div>

      <label className="settings-input">
        <span>Note cliente</span>
        <textarea
          className="customer-notes-textarea"
          rows={6}
          value={customer.notes}
          onChange={(event) => onUpdateCustomer((current) => ({ ...current, notes: event.target.value }))}
        />
      </label>
    </div>
  )
}

function CustomerTextField({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="settings-input">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function updateCustomerName(customer: Customer, patch: Partial<Pick<Customer, 'firstName' | 'lastName' | 'company'>>) {
  const nextCustomer = { ...customer, ...patch }
  return { ...nextCustomer, name: buildCustomerDisplayName(nextCustomer) }
}
