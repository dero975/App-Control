import { useState, type FormEvent } from 'react'
import { FieldGroup } from '../../components/FieldGroup'
import { SectionHeader } from '../../components/SectionHeader'
import { isValidPin, updateAppPin } from '../../lib/pinAccess'

type SettingsPageProps = {
  onLock: () => void
}

export function SettingsPage({ onLock }: SettingsPageProps) {
  const [currentPin, setCurrentPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [status, setStatus] = useState('')

  async function changePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isValidPin(nextPin)) {
      setStatus('Il nuovo PIN deve avere 6 cifre')
      return
    }

    if (nextPin !== confirmPin) {
      setStatus('I PIN non coincidono')
      return
    }

    setStatus('Aggiornamento PIN')
    try {
      await updateAppPin(currentPin, nextPin)
      setCurrentPin('')
      setNextPin('')
      setConfirmPin('')
      setStatus('PIN aggiornato')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Errore modifica PIN')
    }
  }

  return (
    <div className="page-stack">
      <SectionHeader title="Impostazioni" />
      <FieldGroup title="Modifica PIN" description="Il PIN viene sincronizzato su Supabase e resta valido tra dispositivi.">
        <form className="auth-form" onSubmit={changePin}>
          <label>
            <span>PIN attuale</span>
            <input
              value={currentPin}
              inputMode="numeric"
              maxLength={6}
              type="password"
              onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <label>
            <span>Nuovo PIN</span>
            <input
              value={nextPin}
              inputMode="numeric"
              maxLength={6}
              type="password"
              onChange={(event) => setNextPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <label>
            <span>Conferma nuovo PIN</span>
            <input
              value={confirmPin}
              inputMode="numeric"
              maxLength={6}
              type="password"
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <button type="submit" className="secondary-button">
            Aggiorna PIN
          </button>
        </form>
        {status ? <p className="status-message">{status}</p> : null}
      </FieldGroup>
      <FieldGroup title="Sessione">
        <button type="button" className="danger-button" onClick={onLock}>
          Esci dall'app
        </button>
      </FieldGroup>
    </div>
  )
}
