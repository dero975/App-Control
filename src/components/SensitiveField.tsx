import { useState } from 'react'
import { CopyButton } from './CopyButton'

type SensitiveFieldProps = {
  label: string
  value: string
  sensitive?: boolean
}

export function SensitiveField({ label, value, sensitive = true }: SensitiveFieldProps) {
  const [visible, setVisible] = useState(!sensitive)
  const displayValue = sensitive && !visible ? maskValue(value) : value

  return (
    <div className="sensitive-field">
      <div>
        <span className="field-label">{label}</span>
        <code>{displayValue}</code>
      </div>
      <div className="inline-actions">
        {sensitive ? (
          <button type="button" className="icon-button" onClick={() => setVisible((current) => !current)}>
            {visible ? 'Nascondi' : 'Mostra'}
          </button>
        ) : null}
        <CopyButton value={value} />
      </div>
    </div>
  )
}

function maskValue(value: string) {
  if (!value) return '********'
  return '********'
}
