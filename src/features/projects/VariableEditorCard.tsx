import { type FocusEvent, useState } from 'react'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import type { ProjectVariable, ProjectVariableTone } from '../../types/app'
import { renderApiKey, supabaseServiceKeyAliases } from './projectShared'
import { VariableEditButton, VariableFieldTitle } from './VariablePanelControls'
import type { VariableUpdateField } from './variablePanelTypes'
import { getEffectiveVariableTone, isProtectedVariableTitle } from './variableToneStorage'

export function VariableEditorCard({
  editable,
  isDraft,
  singleEnvCopy = false,
  maskable = true,
  deletable = true,
  readOnly = false,
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
  maskable?: boolean
  deletable?: boolean
  readOnly?: boolean
  toneOverride?: ProjectVariableTone
  toneStorageKey?: string
  variable: ProjectVariable
  onDelete: (id: string) => void
  onDraftCommit: (id: string) => void
  onEdit: () => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  // Sicurezza: i valori sensibili sono nascosti di default; l'occhio li rivela on-demand.
  const [revealed, setRevealed] = useState(false)
  // Maschera il valore quando e mascherabile, non e in modifica e non e stato rivelato.
  // Il valore reale (variable.value) NON viene mai alterato: la maschera e solo visiva.
  const isMasked = maskable && !editable && !revealed && variable.value.length > 0
  const displayedValue = isMasked ? '•'.repeat(Math.min(variable.value.length, 32)) : variable.value
  const canChooseTone = isDraft || !isProtectedVariableTitle(variable)
  const effectiveTone = getEffectiveVariableTone(variable, toneStorageKey, toneOverride)
  const cardTone = variable.key.trim().toUpperCase() === renderApiKey ? 'red' : canChooseTone ? effectiveTone : ''

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
            hideCopy
            onChange={(value) => onUpdate(variable.id, 'key', value)}
            value={variable.key}
          />
          <input
            value={displayedValue}
            type="text"
            readOnly={!editable}
            onChange={(event) => onUpdate(variable.id, 'value', event.target.value)}
          />
          {/* Copia inline (dentro il campo) solo in modifica, per copiare mentre editi. */}
          {editable ? <CopyButton value={variable.value} iconOnly className="copy-button--inside-input" /> : null}
        </label>
      </div>
      <div className="editable-variable-card__actions">
        {editable || !maskable ? null : (
          <button
            type="button"
            className="inline-icon-button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? 'Nascondi valore' : 'Mostra valore'}
            aria-pressed={revealed}
            title={revealed ? 'Nascondi valore' : 'Mostra valore'}
          >
            {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        )}
        {/* Copia uniforme tra le azioni (fuori modifica), coerente in tutti i tab.
            readOnly (es. variabili gestite dall'Agent): solo occhio, niente copia/matita. */}
        {editable || readOnly ? null : (
          <CopyButton
            value={singleEnvCopy ? `${variable.key.trim()}=${variable.value}` : variable.value}
            iconOnly
            label="Copia valore"
          />
        )}
        {isDraft || readOnly ? null : <VariableEditButton active={editable} onClick={onEdit} />}
        {deletable ? (
          <button type="button" className="inline-icon-button trash-button" onClick={() => onDelete(variable.id)} aria-label="Elimina variabile" title="Elimina variabile">
            <Trash2 aria-hidden="true" />
          </button>
        ) : null}
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
