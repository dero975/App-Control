import { useState, type FormEvent } from 'react'
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
    <div className="lock-screen app-entry">
      <div className="lock-screen__glow" aria-hidden="true" />
      <div className="lock-screen__panel">
        <div className="lock-screen__brand">
          <img src="/icons/splash-logo.png" alt="App Control" className="lock-screen__logo" />
          <h1>Insert PIN</h1>
        </div>

        <form className="lock-screen__form" onSubmit={submitPin}>
          <label className="lock-screen__field">
            <input
              value={pin}
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              autoFocus
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>

          <button type="submit" className="secondary-button lock-screen__submit">
            Accedi
          </button>
        </form>

        <div className="lock-screen__footer">
          <span>Sessione locale protetta con PIN sincronizzato.</span>
          {status ? <p className="status-message lock-screen__status">{status}</p> : null}
        </div>
      </div>
    </div>
  )
}
