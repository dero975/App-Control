import { CopyButton } from '../../components/CopyButton'
import { FieldGroup } from '../../components/FieldGroup'
import type { Project } from '../../types/app'

// Config di collegamento del progetto (.agent/app-control.json): le 4 chiavi che
// l'agent usa per collegarsi ad App Control. Mostrata in fondo a "Dati progetto".
export function ProjectAgentConfig({ project }: { project: Project }) {
  const agentConfig = formatAgentConfig(project)

  return (
    <div className="agent-sync-panel">
      <FieldGroup title="Collegamento agent" className="field-group--bare">
        <div className="agent-sync-block">
          <div className="agent-sync-block__header">
            <CopyButton value={agentConfig} label="Copia JSON" className="copy-button--labeled" />
            <span>.agent/app-control.json</span>
          </div>
          <div className="agent-sync-box">
            <pre>{agentConfig}</pre>
          </div>
        </div>
      </FieldGroup>
    </div>
  )
}

function formatAgentConfig(project: Project) {
  return JSON.stringify(
    {
      projectId: project.agent.projectId,
      agentKey: project.agent.agentKey,
      appControlSupabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
      appControlSupabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
    },
    null,
    2,
  )
}
