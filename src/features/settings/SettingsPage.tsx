import { KeyRound } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { FieldGroup } from '../../components/FieldGroup'
import { SectionHeader } from '../../components/SectionHeader'
import { isValidPin, updateAppPin } from '../../lib/pinAccess'

export function SettingsPage() {
  const [currentPin, setCurrentPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [status, setStatus] = useState('')
  const pinReady = currentPin.length === 6 && nextPin.length === 6 && confirmPin.length === 6
  const statusClassName = useMemo(() => {
    if (!status) return ''
    if (status === 'Aggiornamento PIN') return 'status-message status-message--progress'
    if (status === 'PIN aggiornato') return 'status-message status-message--success'
    return 'status-message status-message--error'
  }, [status])

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
    <div className="page-stack settings-page">
      <SectionHeader
        title="Impostazioni"
      />

      <div className="settings-layout">
        <FieldGroup
          className="settings-panel settings-panel--primary"
          title="Modifica PIN"
          description="Aggiorna il PIN a 6 cifre mantenendo il flusso di accesso coerente su tutti i dispositivi."
        >
          <form className="settings-pin-form" onSubmit={changePin}>
            <div className="settings-pin-grid">
              <label className="settings-input">
                <span>PIN attuale</span>
                <input
                  value={currentPin}
                  inputMode="numeric"
                  maxLength={6}
                  type="password"
                  placeholder="••••••"
                  onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
              <label className="settings-input">
                <span>Nuovo PIN</span>
                <input
                  value={nextPin}
                  inputMode="numeric"
                  maxLength={6}
                  type="password"
                  placeholder="••••••"
                  onChange={(event) => setNextPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
              <label className="settings-input">
                <span>Conferma nuovo PIN</span>
                <input
                  value={confirmPin}
                  inputMode="numeric"
                  maxLength={6}
                  type="password"
                  placeholder="••••••"
                  onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" className="secondary-button settings-submit-button" disabled={!pinReady}>
                <KeyRound aria-hidden="true" className="button-icon" />
                Aggiorna PIN
              </button>
              {status ? <p className={statusClassName}>{status}</p> : <p className="status-message">PIN numerico a 6 cifre.</p>}
            </div>
          </form>
        </FieldGroup>

      </div>
    </div>
  )
}
