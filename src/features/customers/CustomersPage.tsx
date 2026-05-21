import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import type { Customer } from '../../types/app'
import { CustomerWorkspace } from './CustomerWorkspace'
import { useCustomersPageController } from './useCustomersPageController'

export function CustomersPage({
  customerSearchQuery,
  selectedCustomerId,
  onCustomersChange,
  onSelectCustomer,
}: {
  customerSearchQuery: string
  selectedCustomerId: string
  onCustomersChange: (customers: Customer[]) => void
  onSelectCustomer: (customerId: string) => void
}) {
  const controller = useCustomersPageController({
    customerSearchQuery,
    selectedCustomerId,
    onCustomersChange,
    onSelectCustomer,
  })

  return (
    <div className="page-stack customers-page">
      {controller.loadError ? <p className="status-message status-message--error">{controller.loadError}</p> : null}
      {controller.saveMessage ? <SaveStatusMessage message={controller.saveMessage} state={controller.saveState} /> : null}

      <section className="customers-page__detail-panel">
        {controller.saveState === 'loading' && !controller.customers.length ? (
          <EmptyState title="Caricamento clienti" message="Sto recuperando archivio clienti e progetti da Supabase." />
        ) : controller.selectedCustomer ? (
          <CustomerWorkspace
            key={controller.selectedCustomer.id}
            customer={controller.selectedCustomer}
            activeProjectTab={controller.activeProjectTab}
            selectedProject={controller.selectedProject}
            selectedProjectIsLoaded={controller.selectedProjectIsLoaded}
            selectedProjectId={controller.effectiveSelectedProjectId}
            loadedProjectIds={controller.loadedCustomerProjectIds}
            onChangeProjectTab={controller.setActiveProjectTab}
            onCreateProject={() => void controller.createCustomerProject(controller.selectedCustomer?.id ?? '')}
            onDeleteCustomer={() => controller.setDeleteCustomerCandidate(controller.selectedCustomer)}
            onDeleteProject={(project) => controller.setDeleteProjectCandidate({ customerId: controller.selectedCustomer?.id ?? '', project })}
            onSelectProject={controller.setSelectedProjectId}
            onUpdateCustomer={(updater) => controller.updateCustomer(controller.selectedCustomer?.id ?? '', updater)}
            onUpdateProject={(projectId, updater) => controller.updateCustomerProject(controller.selectedCustomer?.id ?? '', projectId, updater)}
          />
        ) : (
          <EmptyState title="Nessun cliente" message="Crea il primo cliente per aprire l'archivio dedicato." />
        )}
      </section>

      {controller.deleteCustomerCandidate ? (
        <ConfirmDialog
          title="Elimina cliente"
          description={`Stai eliminando ${controller.deleteCustomerCandidate.name}. Anche i suoi progetti cliente verranno rimossi dal database.`}
          confirmLabel="Elimina cliente"
          onCancel={() => controller.setDeleteCustomerCandidate(null)}
          onConfirm={() => void controller.deleteCustomer()}
        />
      ) : null}

      {controller.deleteProjectCandidate ? (
        <ConfirmDialog
          title="Elimina progetto cliente"
          description={`Stai eliminando ${controller.deleteProjectCandidate.project.name} dall'archivio cliente.`}
          confirmLabel="Elimina progetto"
          onCancel={() => controller.setDeleteProjectCandidate(null)}
          onConfirm={() => void controller.deleteCustomerProject()}
        />
      ) : null}
    </div>
  )
}

function SaveStatusMessage({ message, state }: { message: string; state: 'idle' | 'loading' | 'saving' | 'saved' | 'error' }) {
  return (
    <p
      className={[
        'status-message',
        state === 'saving' ? 'status-message--progress' : '',
        state === 'saved' ? 'status-message--success' : '',
        state === 'error' ? 'status-message--error' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {message}
    </p>
  )
}
