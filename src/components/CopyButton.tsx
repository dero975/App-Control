import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyToClipboard } from '../lib/clipboard'

type CopyButtonProps = {
  value: string
  label?: string
  className?: string
  iconOnly?: boolean
}

export function CopyButton({ value, label = 'Copia', className = '', iconOnly = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timeout = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [copied])

  async function handleCopy() {
    await copyToClipboard(value)
    setCopied(true)
  }

  const buttonLabel = copied ? 'Copiato' : label

  return (
    <button
      type="button"
      className={`copy-button ${iconOnly ? 'copy-button--icon-only' : ''} ${className}`}
      onClick={handleCopy}
      aria-label={buttonLabel}
      title={buttonLabel}
    >
      {copied ? <Check aria-hidden="true" className="copy-button__icon" /> : <Copy aria-hidden="true" className="copy-button__icon" />}
    </button>
  )
}
