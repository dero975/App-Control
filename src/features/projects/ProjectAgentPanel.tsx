import { CopyButton } from '../../components/CopyButton'
import { FieldGroup } from '../../components/FieldGroup'
import type { Project } from '../../types/app'
import { resolveSyncPrompt } from './projectPageModel'

export function ProjectAgentPanel({ project }: { project: Project }) {
  const agentConfig = formatAgentConfig(project)
  const syncPrompt = resolveSyncPrompt(project.agent.syncPrompt)

  return (
    <div className="agent-sync-panel">
      <FieldGroup title="Agent sync" className="field-group--bare">
        <div className="agent-sync-block">
          <div className="agent-sync-block__header">
            <span>Prompt sincronizzazione</span>
            <CopyButton value={syncPrompt} label="Copia prompt" className="copy-button--labeled" />
          </div>
          <div className="agent-sync-box">
            <div className="agent-sync-readonly" aria-label="Prompt sincronizzazione">
              {syncPrompt}
            </div>
          </div>
        </div>

        <div className="agent-sync-block">
          <div className="agent-sync-block__header">
            <span>.agent/app-control.json</span>
            <CopyButton value={agentConfig} label="Copia JSON" className="copy-button--labeled" />
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
