import { type FocusEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import type { PlatformAccess, ProjectVariable, ProjectVariableTone } from '../../types/app'
import { addSelectOptionValue, getSelectableFieldConfig, getSelectOptions } from './projectFieldOptions'
import { renderApiKey, supabaseServiceKeyAliases } from './projectShared'
import { VariableEditButton, VariableFieldTitle, VariableTonePalette } from './VariablePanelControls'
import type { VariableUpdateField } from './variablePanelTypes'
import { getEffectiveVariableTone, isProtectedVariableTitle } from './variableToneStorage'

export function VariableEditorCard({
  editable,
  isDraft,
  singleEnvCopy = false,
  toneOverride,
  toneStorageKey,
  variable,
  onAddAccess,
  onDelete,
  onDeleteAccess,
  onDraftCommit,
  onEdit,
  onUpdateAccess,
  onUpdate,
  valueAriaLabel,
}: {
  editable: boolean
  isDraft: boolean
  singleEnvCopy?: boolean
  toneOverride?: ProjectVariableTone
  toneStorageKey?: string
  variable: ProjectVariable
  onAddAccess: (variableId: string) => void
  onDelete: (id: string) => void
  onDeleteAccess: (variableId: string, accessId: string) => void
  onDraftCommit: (id: string) => void
  onEdit: () => void
  onUpdateAccess: (variableId: string, accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  const selectFieldConfig = getSelectableFieldConfig(variable.key)
  const isDevelopmentField = variable.key.trim().toLowerCase() === 'sviluppo in'
  const selectOptions = selectFieldConfig ? getSelectOptions(variable.value, selectFieldConfig.options) : []
  const canChooseTone = isDraft || !isProtectedVariableTitle(variable)
  const effectiveTone = getEffectiveVariableTone(variable, toneStorageKey, toneOverride)
  const cardTone = variable.key.trim().toUpperCase() === renderApiKey ? 'red' : canChooseTone ? effectiveTone : ''

  function addSelectOption() {
    if (!selectFieldConfig) return

    const nextValue = window.prompt(selectFieldConfig.promptLabel)
    const normalizedValue = nextValue?.trim()
    if (!normalizedValue) return

    onUpdate(variable.id, 'value', normalizedValue)
  }

  function handleSelectChange(value: string) {
    if (value === addSelectOptionValue) {
      addSelectOption()
      return
    }

    onUpdate(variable.id, 'value', value)
  }

  function handleCardBlur(event: FocusEvent<HTMLElement>) {
    if (!isDraft) return
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    if (!variable.key.trim() && !variable.value.trim() && !(variable.accessAccounts ?? []).length) return

    onDraftCommit(variable.id)
  }

  return (
    <article className={getVariableCardClassName(variable, cardTone, editable)} onBlur={handleCardBlur}>
      <div className="variable-field-stack">
        <label className="variable-value-input" aria-label={valueAriaLabel}>
          <VariableFieldTitle
            canEdit
            editable={editable}
            hideCopy={singleEnvCopy}
            onChange={(value) => onUpdate(variable.id, 'key', value)}
            value={variable.key}
          />
          {selectFieldConfig ? (
            <div className="variable-select-row">
              <select value={variable.value} disabled={!editable} onChange={(event) => handleSelectChange(event.target.value)}>
                {selectOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                <option value={addSelectOptionValue}>+ Aggiungi</option>
              </select>
            </div>
          ) : (
            <>
              <input
                value={variable.value}
                type="text"
                readOnly={!editable}
                onChange={(event) => onUpdate(variable.id, 'value', event.target.value)}
              />
              {singleEnvCopy ? null : <CopyButton value={variable.value} iconOnly className="copy-button--inside-input" />}
            </>
          )}
          {editable && canChooseTone ? (
            <VariableTonePalette selectedTone={effectiveTone} onChange={(tone) => onUpdate(variable.id, 'tone', tone)} />
          ) : null}
        </label>
        {isDevelopmentField ? (
          <PlatformAccessList
            accounts={variable.accessAccounts ?? []}
            editable={editable}
            platformOptions={selectFieldConfig?.options ?? []}
            onAdd={() => onAddAccess(variable.id)}
            onDelete={(accessId) => onDeleteAccess(variable.id, accessId)}
            onUpdate={(accessId, field, value) => onUpdateAccess(variable.id, accessId, field, value)}
          />
        ) : null}
      </div>
      <div className="editable-variable-card__actions">
        {singleEnvCopy ? (
          <CopyButton value={`${variable.key.trim()}=${variable.value}`} iconOnly label="Copia variabile" />
        ) : null}
        {isDraft ? null : <VariableEditButton active={editable} onClick={onEdit} />}
        <button type="button" className="inline-icon-button trash-button" onClick={() => onDelete(variable.id)} aria-label="Elimina variabile" title="Elimina variabile">
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}

function PlatformAccessList({
  accounts,
  editable,
  platformOptions,
  onAdd,
  onDelete,
  onUpdate,
}: {
  accounts: PlatformAccess[]
  editable: boolean
  platformOptions: readonly string[]
  onAdd: () => void
  onDelete: (accessId: string) => void
  onUpdate: (accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) => void
}) {
  function handlePlatformChange(accessId: string, value: string) {
    if (value === addSelectOptionValue) {
      const nextValue = window.prompt('Nuova piattaforma')
      const normalizedValue = nextValue?.trim()
      if (!normalizedValue) return

      onUpdate(accessId, 'platform', normalizedValue)
      return
    }

    onUpdate(accessId, 'platform', value)
  }

  return (
    <div className="platform-access-list">
      <div className="platform-access-list__header">
        <span>Accessi piattaforme</span>
        <button type="button" className="secondary-button platform-access-add-button" disabled={!editable} onClick={onAdd}>
          <Plus aria-hidden="true" className="button-icon" />
          Aggiungi accesso
        </button>
      </div>
      {accounts.map((access) => (
        <div className="platform-access-row" key={access.id}>
          <select value={access.platform} disabled={!editable} onChange={(event) => handlePlatformChange(access.id, event.target.value)}>
            {getSelectOptions(access.platform, platformOptions).map((option) => <option value={option} key={option}>{option}</option>)}
            <option value={addSelectOptionValue}>+ Aggiungi</option>
          </select>
          <input value={access.email} type="email" placeholder="Mail accesso" aria-label={`Mail accesso ${access.platform}`} readOnly={!editable} onChange={(event) => onUpdate(access.id, 'email', event.target.value)} />
          <input value={access.password} type="text" placeholder="Password" aria-label={`Password ${access.platform}`} readOnly={!editable} onChange={(event) => onUpdate(access.id, 'password', event.target.value)} />
          <button type="button" className="inline-icon-button trash-button" disabled={!editable} onClick={() => onDelete(access.id)} aria-label={`Elimina accesso ${access.platform}`} title={`Elimina accesso ${access.platform}`}>
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

function getVariableCardClassName(variable: ProjectVariable, cardTone: ProjectVariableTone | '', editable: boolean) {
  const normalizedKey = variable.key.trim().toUpperCase()
  const isGitHubVariable = ['GITHUB_URL', 'GITHUB_TOKEN'].includes(normalizedKey)
  const isSupabaseVariable = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', ...supabaseServiceKeyAliases, 'DATABASE_URL'].includes(normalizedKey)

  return [
    'editable-variable-card',
    isGitHubVariable ? 'editable-variable-card--github' : '',
    isSupabaseVariable ? 'editable-variable-card--deploy' : '',
    cardTone ? `editable-variable-card--tone-${cardTone}` : '',
    editable ? 'editable-variable-card--editing' : '',
  ].filter(Boolean).join(' ')
}
