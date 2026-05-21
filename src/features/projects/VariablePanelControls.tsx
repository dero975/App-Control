import { Pencil } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import type { ProjectVariableTone } from '../../types/app'
import { variableTones } from './variableToneStorage'

export function VariableFieldTitle({
  canEdit,
  editable,
  onChange,
  value,
}: {
  canEdit: boolean
  editable: boolean
  onChange: (value: string) => void
  value: string
}) {
  if (editable && canEdit) {
    return (
      <span className="field-title-edit-row">
        <input
          className="field-title-input"
          value={value}
          placeholder="Titolo campo"
          aria-label="Titolo campo"
          onChange={(event) => onChange(event.target.value)}
        />
        <CopyButton value={value} iconOnly className="copy-button--field-title" label="Copia titolo" />
      </span>
    )
  }

  return (
    <span className="fixed-field-name fixed-field-name--with-inline-copy">
      <span>{value || 'Titolo campo'}</span>
      <CopyButton value={value} iconOnly className="copy-button--field-title" label="Copia titolo" />
    </span>
  )
}

export function VariableTonePalette({
  selectedTone,
  onChange,
}: {
  selectedTone: ProjectVariableTone
  onChange: (tone: ProjectVariableTone) => void
}) {
  return (
    <div className="variable-tone-palette" aria-label="Palette colore campo">
      {variableTones.map((tone) => (
        <button
          type="button"
          key={tone.value}
          className={[
            'variable-tone-swatch',
            `variable-tone-swatch--${tone.value}`,
            selectedTone === tone.value ? 'variable-tone-swatch--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={`Palette ${tone.label}`}
          aria-pressed={selectedTone === tone.value}
          title={tone.label}
          onClick={() => onChange(tone.value)}
        />
      ))}
    </div>
  )
}

export function VariableEditButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={active ? 'inline-icon-button variable-edit-button variable-edit-button--active' : 'inline-icon-button variable-edit-button'}
      onClick={onClick}
      aria-label={active ? 'Blocca modifica campo' : 'Modifica campo'}
      aria-pressed={active}
      title={active ? 'Blocca modifica campo' : 'Modifica campo'}
    >
      <Pencil aria-hidden="true" className="button-icon" />
    </button>
  )
}
