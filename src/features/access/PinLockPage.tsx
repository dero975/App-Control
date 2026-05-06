import { useState, type FormEvent } from 'react'
import { FieldGroup } from '../../components/FieldGroup'
import { SectionHeader } from '../../components/SectionHeader'
import { appUnlockedStorageKey, isValidPin, verifyAppPin } from '../../lib/pinAccess'

type PinLockPageProps = {
  onUnlock: () => void
}

export function PinLockPage({ onUnlock }: PinLockPageProps) {
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState('')

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isValidPin(pin)) {
      setStatus('Inserisci un PIN di 6 cifre')
      return
    }

    setStatus('Verifica PIN')
    try {
      const isValid = await verifyAppPin(pin)
      if (!isValid) {
        setStatus('PIN non corretto')
        return
      }

      sessionStorage.setItem(appUnlockedStorageKey, '1')
      onUnlock()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Errore accesso')
    }
  }

  return (
    <div className="page-stack page-stack--narrow">
      <SectionHeader title="App Control" />
      <FieldGroup title="Accesso app" description="Inserisci il PIN a 6 cifre per aprire l'applicazione.">
        <form className="auth-form" onSubmit={submitPin}>
          <label>
            <span>PIN</span>
            <input
              value={pin}
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              type="password"
              autoComplete="current-password"
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <button type="submit" className="secondary-button">
            Accedi
          </button>
        </form>
        {status ? <p className="status-message">{status}</p> : null}
      </FieldGroup>
    </div>
  )
}
