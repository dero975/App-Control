import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { CopyButton } from '../../components/CopyButton'
import type { ProjectVariable } from '../../types/app'
import { addSelectOptionValue, getSelectableFieldConfig, getSelectOptions, getSelectValue } from './projectFieldOptions'
import { VariableEditButton } from './VariablePanelControls'
import type { VariableUpdateField } from './variablePanelTypes'

export function DeployCredentialsCard({
  deployVariable,
  editable,
  passwordVariable,
  onDelete,
  onEdit,
  onUpdate,
  valueAriaLabel,
}: {
  deployVariable: ProjectVariable
  editable: boolean
  passwordVariable: ProjectVariable
  onDelete: (id: string) => void
  onEdit: () => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  const selectFieldConfig = getSelectableFieldConfig(deployVariable.key)
  const selectValue = selectFieldConfig ? getSelectValue(deployVariable.value, selectFieldConfig) : deployVariable.value
  const selectOptions = selectFieldConfig ? getSelectOptions(selectValue, selectFieldConfig.options) : []

  function addSelectOption() {
    if (!selectFieldConfig) return

    const nextValue = window.prompt(selectFieldConfig.promptLabel)
    const normalizedValue = nextValue?.trim()
    if (!normalizedValue) return

    onUpdate(deployVariable.id, 'value', normalizedValue)
  }

  function handleSelectChange(value: string) {
    if (value === addSelectOptionValue) {
      addSelectOption()
      return
    }

    onUpdate(deployVariable.id, 'value', value)
  }

  return (
    <article className={editable ? 'editable-variable-card editable-variable-card--grouped editable-variable-card--deploy editable-variable-card--editing' : 'editable-variable-card editable-variable-card--grouped editable-variable-card--deploy'}>
      <div className="grouped-variable-stack">
        <div className="grouped-card-title grouped-card-title--deploy">Deploy con</div>
        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name fixed-field-name--hidden" aria-hidden="true">
              {deployVariable.key}
            </span>
            {selectFieldConfig ? (
              <div className="variable-select-row">
                <select value={selectValue} disabled={!editable} onChange={(event) => handleSelectChange(event.target.value)}>
                  {selectOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                  <option value={addSelectOptionValue}>+ Aggiungi</option>
                </select>
              </div>
            ) : null}
          </label>
          <div className="grouped-variable-row__actions">
            <VariableEditButton active={editable} onClick={onEdit} />
            <GroupedTrashButton label="Elimina deploy con" onClick={() => onDelete(deployVariable.id)} />
          </div>
        </div>

        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">Password</span>
            <input
              value={passwordVariable.value}
              type="text"
              readOnly={!editable}
              onChange={(event) => onUpdate(passwordVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={passwordVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <div className="grouped-variable-row__actions grouped-variable-row__actions--single">
            <GroupedTrashButton label="Elimina Password deploy" onClick={() => onDelete(passwordVariable.id)} />
          </div>
        </div>
      </div>
    </article>
  )
}

export function DeployLinksCard({
  deployLinkVariable,
  deployAdminLinkVariable,
  editable,
  onDelete,
  onEdit,
  onUpdate,
  valueAriaLabel,
}: {
  deployLinkVariable: ProjectVariable
  deployAdminLinkVariable: ProjectVariable
  editable: boolean
  onDelete: (id: string) => void
  onEdit: () => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  return (
    <article className={editable ? 'editable-variable-card editable-variable-card--grouped editable-variable-card--editing' : 'editable-variable-card editable-variable-card--grouped'}>
      <div className="grouped-variable-stack">
        <GroupedTextRow
          editable={editable}
          label={deployLinkVariable.key}
          value={deployLinkVariable.value}
          valueAriaLabel={valueAriaLabel}
          onChange={(value) => onUpdate(deployLinkVariable.id, 'value', value)}
          action={<><VariableEditButton active={editable} onClick={onEdit} /><GroupedTrashButton label="Elimina LINK_DEPLOY" onClick={() => onDelete(deployLinkVariable.id)} /></>}
        />
        <GroupedTextRow
          editable={editable}
          label={deployAdminLinkVariable.key}
          value={deployAdminLinkVariable.value}
          valueAriaLabel={valueAriaLabel}
          onChange={(value) => onUpdate(deployAdminLinkVariable.id, 'value', value)}
          action={<GroupedTrashButton label="Elimina LINK_DEPLOY ADMIN" onClick={() => onDelete(deployAdminLinkVariable.id)} />}
          singleAction
        />
      </div>
    </article>
  )
}

export function GitHubCredentialsCard({
  editable,
  emailVariable,
  passwordVariable,
  onDelete,
  onEdit,
  onUpdate,
  valueAriaLabel,
}: {
  editable: boolean
  emailVariable: ProjectVariable
  passwordVariable: ProjectVariable
  onDelete: (id: string) => void
  onEdit: () => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  return (
    <article className={editable ? 'editable-variable-card editable-variable-card--grouped editable-variable-card--github editable-variable-card--editing' : 'editable-variable-card editable-variable-card--grouped editable-variable-card--github'}>
      <div className="grouped-variable-stack">
        <div className="grouped-card-title">GitHub</div>
        <GroupedTextRow
          editable={editable}
          label="Mail accesso"
          value={emailVariable.value}
          valueAriaLabel={valueAriaLabel}
          onChange={(value) => onUpdate(emailVariable.id, 'value', value)}
          action={<><VariableEditButton active={editable} onClick={onEdit} /><GroupedTrashButton label="Elimina Mail accesso" onClick={() => onDelete(emailVariable.id)} /></>}
        />
        <GroupedTextRow
          editable={editable}
          label={passwordVariable.key}
          value={passwordVariable.value}
          valueAriaLabel={valueAriaLabel}
          onChange={(value) => onUpdate(passwordVariable.id, 'value', value)}
          action={<GroupedTrashButton label="Elimina Password" onClick={() => onDelete(passwordVariable.id)} />}
          singleAction
        />
      </div>
    </article>
  )
}

function GroupedTextRow({
  action,
  editable,
  label,
  singleAction = false,
  value,
  valueAriaLabel,
  onChange,
}: {
  action: ReactNode
  editable: boolean
  label: string
  singleAction?: boolean
  value: string
  valueAriaLabel: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grouped-variable-row">
      <label className="variable-value-input" aria-label={valueAriaLabel}>
        <span className="fixed-field-name">{label}</span>
        <input value={value} type="text" readOnly={!editable} onChange={(event) => onChange(event.target.value)} />
        <CopyButton value={value} iconOnly className="copy-button--inside-input" />
      </label>
      <div className={singleAction ? 'grouped-variable-row__actions grouped-variable-row__actions--single' : 'grouped-variable-row__actions'}>
        {action}
      </div>
    </div>
  )
}

function GroupedTrashButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="inline-icon-button trash-button" onClick={onClick} aria-label={label} title={label}>
      <Trash2 aria-hidden="true" />
    </button>
  )
}
