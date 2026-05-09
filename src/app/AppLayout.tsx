import type { ReactNode } from 'react'
import type { AppEnvironment, AppSection, Customer } from '../types/app'
import { getNavigationItems } from './navigation'
import { Sidebar } from './Sidebar'
import { buildCustomerDisplayName } from '../features/customers/customerIdentity'

type AppLayoutProps = {
  activeEnvironment: AppEnvironment
  activeSection: AppSection
  customerDirectory: Customer[]
  activeCustomerId: string
  customerSearchQuery: string
  children: ReactNode
  onChangeEnvironment: (environment: AppEnvironment) => void
  onChangeCustomer: (customerId: string) => void
  onChangeCustomerSearchQuery: (query: string) => void
  onLock: () => void
  onNavigate: (section: AppSection) => void
}

export function AppLayout({
  activeEnvironment,
  activeSection,
  customerDirectory,
  activeCustomerId,
  customerSearchQuery,
  children,
  onChangeEnvironment,
  onChangeCustomer,
  onChangeCustomerSearchQuery,
  onLock,
  onNavigate,
}: AppLayoutProps) {
  const navigationItems = getNavigationItems(activeEnvironment)

  return (
    <div className="app-shell" data-environment={activeEnvironment}>
      <Sidebar
        activeEnvironment={activeEnvironment}
        activeSection={activeSection}
        customerDirectory={customerDirectory}
        activeCustomerId={activeCustomerId}
        customerSearchQuery={customerSearchQuery}
        onChangeEnvironment={onChangeEnvironment}
        onChangeCustomer={onChangeCustomer}
        onChangeCustomerSearchQuery={onChangeCustomerSearchQuery}
        onLock={onLock}
        onNavigate={onNavigate}
      />

      <div className="mobile-nav" aria-label="Navigazione mobile">
        <div className="mobile-nav__brand">
          <img
            src="/icons/nav-logo.png"
            srcSet="/icons/nav-logo.png 1x, /icons/nav-logo@2x.png 2x"
            alt="App Control"
            className="brand-logo"
          />
        </div>
        <div className="mobile-nav__controls">
          <div className="workspace-switch workspace-switch--mobile" aria-label="Ambiente applicativo mobile">
            <button
              type="button"
              className={activeEnvironment === 'admin' ? 'workspace-switch__button workspace-switch__button--active' : 'workspace-switch__button'}
              onClick={() => onChangeEnvironment('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              className={activeEnvironment === 'customers' ? 'workspace-switch__button workspace-switch__button--active' : 'workspace-switch__button'}
              onClick={() => onChangeEnvironment('customers')}
            >
              Clienti
            </button>
          </div>
          {activeEnvironment === 'customers' ? (
            <select value={resolveCustomerSelectValue(customerDirectory, activeCustomerId)} onChange={(event) => onChangeCustomer(event.target.value)}>
              {customerDirectory.length ? (
                customerDirectory.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {buildCustomerDisplayName(customer)}
                  </option>
                ))
              ) : (
                <option value="">Nessun cliente</option>
              )}
            </select>
          ) : (
            <select value={activeSection} onChange={(event) => onNavigate(event.target.value as AppSection)}>
              {navigationItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <main className="main-content">{children}</main>
    </div>
  )
}

function resolveCustomerSelectValue(customers: Customer[], activeCustomerId: string) {
  if (activeCustomerId && customers.some((customer) => customer.id === activeCustomerId)) {
    return activeCustomerId
  }

  return customers[0]?.id ?? ''
}
