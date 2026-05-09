import { Plus } from 'lucide-react'
import { getNavigationItems } from './navigation'
import type { AppEnvironment, AppSection, Customer } from '../types/app'
import { buildCustomerDisplayName } from '../features/customers/customerIdentity'

const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/1bmNXfzFZpisko8M6MpN7gOnw8U3ibQGXXbEmXRBvOmA/edit?gid=832828269#gid=832828269'
const createCustomerEventName = 'app-control:create-customer'

type SidebarProps = {
  activeEnvironment: AppEnvironment
  activeSection: AppSection
  customerDirectory: Customer[]
  activeCustomerId: string
  customerSearchQuery: string
  onChangeEnvironment: (environment: AppEnvironment) => void
  onChangeCustomer: (customerId: string) => void
  onChangeCustomerSearchQuery: (query: string) => void
  onLock: () => void
  onNavigate: (section: AppSection) => void
}

const environmentOptions: Array<{ id: AppEnvironment; label: string }> = [
  { id: 'admin', label: 'Admin' },
  { id: 'customers', label: 'Clienti' },
]

export function Sidebar({
  activeEnvironment,
  activeSection,
  customerDirectory,
  activeCustomerId,
  customerSearchQuery,
  onChangeEnvironment,
  onChangeCustomer,
  onChangeCustomerSearchQuery,
  onLock,
  onNavigate,
}: SidebarProps) {
  const navigationItems = getNavigationItems(activeEnvironment)
  const filteredCustomers = activeEnvironment === 'customers'
    ? customerDirectory.filter((customer) =>
        [buildCustomerDisplayName(customer), customer.company, customer.email, customer.developmentEmail]
          .join(' ')
          .toLowerCase()
          .includes(customerSearchQuery.trim().toLowerCase()),
      )
    : customerDirectory

  return (
    <aside className="sidebar" aria-label="Navigazione principale">
      <div className="sidebar__brand">
        <img
          src="/icons/nav-logo.png"
          srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
          alt="App Control"
          className="brand-logo"
        />
      </div>

      <div className="workspace-switch" aria-label="Ambiente applicativo">
        {environmentOptions.map((option) => (
          <button
            type="button"
            key={option.id}
            className={option.id === activeEnvironment ? 'workspace-switch__button workspace-switch__button--active' : 'workspace-switch__button'}
            onClick={() => onChangeEnvironment(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {activeEnvironment === 'customers' ? (
        <nav className="sidebar__nav sidebar__nav--customers" aria-label="Clienti">
          <div className="sidebar-customer-tools">
            <input
              type="search"
              value={customerSearchQuery}
              onChange={(event) => onChangeCustomerSearchQuery(event.target.value)}
              placeholder="Cerca cliente"
              aria-label="Cerca cliente"
              className="sidebar-customer-search"
            />
            <button
              type="button"
              className="sidebar-customer-create"
              onClick={() => window.dispatchEvent(new CustomEvent(createCustomerEventName))}
            >
              <Plus aria-hidden="true" className="button-icon" />
              Nuovo cliente
            </button>
          </div>
          <div className="sidebar__section-label">Clienti</div>
          <div className="sidebar-customer-list">
            {filteredCustomers.length ? (
              filteredCustomers.map((customer) => {
                const isActive = customer.id === resolveActiveCustomerId(filteredCustomers, activeCustomerId)

                return (
                  <button
                    type="button"
                    key={customer.id}
                  className={isActive ? 'sidebar-customer-card sidebar-customer-card--active' : 'sidebar-customer-card'}
                  onClick={() => onChangeCustomer(customer.id)}
                >
                    <strong>{buildCustomerDisplayName(customer)}</strong>
                  </button>
                )
              })
            ) : (
              <div className="sidebar-customer-empty">
                {customerDirectory.length ? 'Nessun cliente trovato con questo filtro' : 'Nessun cliente disponibile'}
              </div>
            )}
          </div>
        </nav>
      ) : (
        <nav className="sidebar__nav">
          {navigationItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === activeSection ? 'nav-item nav-item--active' : 'nav-item'}
              onClick={() => onNavigate(item.id)}
            >
              <span>
                <strong>{item.label}</strong>
              </span>
            </button>
          ))}
        </nav>
      )}

      <div className="sidebar__footer-actions">
        {activeEnvironment === 'admin' ? (
          <a
            className="sidebar-utility-button"
            href={googleSheetUrl}
            target="_blank"
            rel="noreferrer"
          >
            Foglio Google
          </a>
        ) : null}

        <button type="button" className="sidebar-lock-button" onClick={onLock}>
          Esci
        </button>
      </div>
    </aside>
  )
}

function resolveActiveCustomerId(customers: Customer[], activeCustomerId: string) {
  if (activeCustomerId && customers.some((customer) => customer.id === activeCustomerId)) {
    return activeCustomerId
  }

  return customers[0]?.id ?? ''
}
