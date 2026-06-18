import type { MouseEvent } from 'react'

// In modalita PWA standalone un semplice <a target="_blank"> resta dentro la finestra
// dell'app: forziamo l'apertura in una nuova finestra/scheda del browser di sistema.
export function openExternalUrl(url: string) {
  const target = url.trim()
  if (!target) return
  const opened = window.open(target, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}

export function handleExternalLinkClick(event: MouseEvent<HTMLAnchorElement>, url: string) {
  event.preventDefault()
  openExternalUrl(url)
}
