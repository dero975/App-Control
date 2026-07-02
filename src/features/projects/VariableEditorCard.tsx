import { type FocusEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import type { ProjectVariable, ProjectVariableTone } from '../../types/app'
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
  onDelete,
  onDraftCommit,
  onEdit,
  onUpdate,
  valueAriaLabel,
}: {
  editable: boolean
  isDraft: boolean
  singleEnvCopy?: boolean
  toneOverride?: ProjectVariableTone
  toneStorageKey?: string
  variable: ProjectVariable
  onDelete: (id: string) => void
  onDraftCommit: (id: string) => void
  onEdit: () => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  const selectFieldConfig = getSelectableFieldConfig(variable.key)
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
    if (!variable.key.trim() && !variable.value.trim()) return

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
