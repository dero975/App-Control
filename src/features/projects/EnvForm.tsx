import { CopyButton } from '../../components/CopyButton'
import { FieldGroup } from '../../components/FieldGroup'
import { SensitiveField } from '../../components/SensitiveField'
import { formatEnvBlock } from '../../lib/clipboard'
import type { EnvVariable } from '../../types/app'

type EnvFormProps = {
  env: EnvVariable[]
}

export function EnvForm({ env }: EnvFormProps) {
  const fullBlock = formatEnvBlock(env)
  const renderBlock = formatEnvBlock(env.filter((item) => item.key !== 'SUPABASE_SERVICE_ROLE_KEY'))

  return (
    <FieldGroup title="ENV" description="Editor predisposto per variabili Supabase, GitHub e deploy senza loggare segreti.">
      <div className="env-actions">
        <CopyButton value={fullBlock} label="Copia blocco ENV" />
        <CopyButton value={renderBlock} label="Copia blocco Render" />
      </div>

      <div className="env-list">
        {env.map((item) => (
          <div className="env-row" key={item.key}>
            <div className="env-row__meta">
              <strong>{item.key}</strong>
              <span>{item.scope}</span>
            </div>
            <SensitiveField label="Valore" value={item.value} sensitive={item.sensitive} />
          </div>
        ))}
      </div>
    </FieldGroup>
  )
}
