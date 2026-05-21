import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { EmptyState } from '../../components/EmptyState'
import { FieldGroup } from '../../components/FieldGroup'
import type { CustomerProject } from '../../types/app'
import { VariablesPanel } from '../projects/VariablesPanel'
import { formatProjectUpdatedAt, getDeployAdminLink, getDeployLink } from '../projects/projectShared'
import { customerProjectTabs, type CustomerProjectTab } from './customerPageConstants'
import {
  applySheetFieldsToCustomerProject,
  applyVariablesToCustomerProject,
  getCustomerProjectComputedData,
} from './customerProjectModel'

export function CustomerProjectDetail({
  activeTab,
  project,
  inlineMobile = false,
  onChangeTab,
  onDelete,
  onUpdate,
}: {
  activeTab: CustomerProjectTab
  project: CustomerProject
  inlineMobile?: boolean
  onChangeTab: (tab: CustomerProjectTab) => void
  onDelete: () => void
  onUpdate: (updater: (project: CustomerProject) => CustomerProject) => void
}) {
  const { adminLikeProject, sheetFields, variables } = useMemo(() => getCustomerProjectComputedData(project), [project])
  const deployLink = getDeployLink(sheetFields, adminLikeProject)
  const deployAdminLink = getDeployAdminLink(variables, deployLink)
  const createdAtLabel = formatProjectUpdatedAt(project.createdAt)
  const hasOperationalNotes = project.operationalNotes.trim().length > 0

  return (
    <div className={inlineMobile ? 'detail-stack customer-project-detail customer-project-detail--mobile' : 'detail-stack customer-project-detail'}>
      <div className="detail-heading">
        <div>
          <h2>{project.name}</h2>
          <ProjectLinkRow value={deployLink} />
          <ProjectLinkRow value={deployAdminLink} />
          <p className="project-created-at">{`Data creazione: ${createdAtLabel}`}</p>
        </div>
        <div className="detail-heading__actions">
          <button type="button" className="danger-button" onClick={onDelete}>
            <Trash2 aria-hidden="true" className="button-icon" />
            Elimina progetto
          </button>
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="Sezioni progetto cliente">
        {customerProjectTabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={['tab-button', activeTab === tab ? 'tab-button--active' : '', tab === 'Note' && hasOperationalNotes ? 'tab-button--has-content' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChangeTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="tab-scroll-area">
        {activeTab === 'Dati progetto' ? (
          <VariablesPanel
            addLabel="Aggiungi campo"
            onChange={(nextSheetFields) => onUpdate((current) => applySheetFieldsToCustomerProject(current, nextSheetFields))}
            title="Dati progetto"
            toneStorageKey={`app-control-variable-tones:customer-project:${project.id}:data`}
            valueAriaLabel="Valore campo foglio"
            variables={sheetFields}
          />
        ) : null}
        {activeTab === 'Variabili' ? (
          <VariablesPanel
            addLabel="Aggiungi variabile"
            onChange={(nextVariables) => onUpdate((current) => applyVariablesToCustomerProject(current, nextVariables))}
            title="Variabili"
            toneStorageKey={`app-control-variable-tones:customer-project:${project.id}:env`}
            valueAriaLabel="Valore variabile"
            variables={variables}
          />
        ) : null}
        {activeTab === 'Immagini' ? (
          <EmptyState title="Immagini" message="La gestione immagini per i progetti cliente non è ancora collegata al database." />
        ) : null}
        {activeTab === 'Note' ? (
          <div className="notes-panel">
            <FieldGroup title="Note operative" className="field-group--bare">
              <textarea
                className="notes-panel-textarea"
                rows={7}
                value={project.operationalNotes}
                onChange={(event) => onUpdate((current) => ({ ...current, operationalNotes: event.target.value }))}
              />
            </FieldGroup>
          </div>
        ) : null}
        {activeTab === 'Sync' ? (
          <EmptyState title="Sync" message="La sincronizzazione agent per i progetti cliente non è ancora collegata al database." />
        ) : null}
      </div>
    </div>
  )
}

function ProjectLinkRow({ value }: { value: string }) {
  if (!value) return null

  return (
    <div className="project-deploy-link">
      <a href={value} target="_blank" rel="noreferrer">
        {value}
      </a>
      <CopyButton value={value} iconOnly />
    </div>
  )
}
