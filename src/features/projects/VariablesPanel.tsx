import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Plus } from 'lucide-react'
import { FieldGroup } from '../../components/FieldGroup'
import { copyToClipboard } from '../../lib/clipboard'
import type { ProjectVariable, ProjectVariableTone } from '../../types/app'
import {
  isDeployPasswordField,
  isProjectNameField,
  normalizeProjectName,
} from './projectShared'
import { VariableEditorCard } from './VariableEditorCard'
import { formatVariablesEnvForCopy, isDeployField } from './variableEnvFormatting'
import type { VariableUpdateField } from './variablePanelTypes'
import {
  getEffectiveVariableTone,
  normalizeVariableTone,
  removeStoredVariableTone,
  writeStoredVariableTone,
} from './variableToneStorage'

export function VariablesPanel({
  addLabel,
  toneStorageKey,
  variables,
  onChange,
  title,
  valueAriaLabel,
  actionsSlot,
}: {
  addLabel: string
  toneStorageKey?: string
  variables: ProjectVariable[]
  onChange: (variables: ProjectVariable[]) => void
  title: string
  valueAriaLabel: string
  actionsSlot?: HTMLElement | null
}) {
  const [envBlockCopied, setEnvBlockCopied] = useState(false)
  const [editingVariableIds, setEditingVariableIds] = useState<Set<string>>(() => new Set())
  const [draftVariableIds, setDraftVariableIds] = useState<Set<string>>(() => new Set())
  const [toneOverrides, setToneOverrides] = useState<Record<string, ProjectVariableTone>>({})

  useEffect(() => {
    if (!envBlockCopied) return

    const timeout = window.setTimeout(() => setEnvBlockCopied(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [envBlockCopied])

  function isDraftVariable(id: string) {
    return draftVariableIds.has(id)
  }

  function isEditingVariable(id: string) {
    return draftVariableIds.has(id) || editingVariableIds.has(id)
  }

  function toggleVariableEditing(ids: string[]) {
    setEditingVariableIds((currentIds) => {
      const isEditing = ids.some((id) => currentIds.has(id))
      return isEditing ? new Set() : new Set(ids)
    })
  }

  function updateVariable(id: string, field: VariableUpdateField, value: string | boolean) {
    const currentVariables = variables
    const targetVariable = currentVariables.find((variable) => variable.id === id)

    if (targetVariable && field === 'tone') {
      const tone = normalizeVariableTone(String(value))
      writeStoredVariableTone(toneStorageKey, targetVariable, tone)
      setToneOverrides((currentTones) => ({ ...currentTones, [id]: tone }))
      return
    }

    const nextValue = field === 'value' && targetVariable && isProjectNameField(targetVariable.key) ? normalizeProjectName(String(value)) : value
    if (targetVariable && field === 'key') {
      removeStoredVariableTone(toneStorageKey, targetVariable)
      writeStoredVariableTone(toneStorageKey, { ...targetVariable, key: String(nextValue) }, getEffectiveVariableTone(targetVariable, toneStorageKey, toneOverrides[id]))
    }

    onChange(currentVariables.map((variable) => (variable.id === id ? { ...variable, [field]: nextValue } : variable)))
  }

  function deleteVariable(id: string) {
    const deletedVariable = variables.find((variable) => variable.id === id)
    if (deletedVariable) removeStoredVariableTone(toneStorageKey, deletedVariable)
    setToneOverrides((currentTones) => {
      const nextTones = { ...currentTones }
      delete nextTones[id]
      return nextTones
    })

    setEditingVariableIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.delete(id)
      return nextIds
    })
    setDraftVariableIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.delete(id)
      return nextIds
    })
    onChange(variables.filter((variable) => variable.id !== id))
  }

  function finalizeDraftVariable(id: string) {
    setDraftVariableIds((currentIds) => {
      if (!currentIds.has(id)) return currentIds

      const nextIds = new Set(currentIds)
      nextIds.delete(id)
      return nextIds
    })
  }

  function addVariable() {
    const variableId = `variable-${Date.now()}`
    setDraftVariableIds((currentIds) => new Set(currentIds).add(variableId))
    onChange([
      ...variables,
      {
        id: variableId,
        key: '',
        value: '',
        sensitive: true,
        tone: 'green',
      },
    ])
  }

  async function copyEnvBlock() {
    const envBlock = formatVariablesEnvForCopy(variables)
    if (!envBlock) return

    await copyToClipboard(envBlock)
    setEnvBlockCopied(true)
  }

  const envBlock = formatVariablesEnvForCopy(variables)
  const isVariablesPanel = title === 'Variabili'
  const isBarePanel = title === 'Dati progetto' || title === 'Variabili'
  const githubEmailIndex = variables.findIndex((variable) => isGithubEmailField(variable.key))
  const githubPasswordIndex = variables.findIndex((variable) => isGithubPasswordField(variable.key))
  const hasGroupedGithubCredentials = title === 'Dati progetto' && githubEmailIndex !== -1 && githubPasswordIndex !== -1
  const githubCredentialsStartIndex = hasGroupedGithubCredentials ? Math.min(githubEmailIndex, githubPasswordIndex) : -1
  const githubCredentialsEndIndex = hasGroupedGithubCredentials ? Math.max(githubEmailIndex, githubPasswordIndex) : -1
  const deployIndex = variables.findIndex((variable) => isDeployField(variable.key))
  const deployPasswordIndex =
    deployIndex === -1 ? -1 : variables.findIndex((variable, index) => index > deployIndex && isDeployPasswordField(variable.key))
  const hasGroupedDeployCredentials = title === 'Dati progetto' && deployIndex !== -1 && deployPasswordIndex !== -1
  const deployCredentialsStartIndex = hasGroupedDeployCredentials ? Math.min(deployIndex, deployPasswordIndex) : -1
  const deployCredentialsEndIndex = hasGroupedDeployCredentials ? Math.max(deployIndex, deployPasswordIndex) : -1
  const userVariableKeys = ['LINK_DEPLOY', 'LINK_DEPLOY ADMIN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'RENDER_API_KEY', 'GITHUB_URL', 'GITHUB_TOKEN']
  const userVariables = variables.filter((variable) => userVariableKeys.includes(variable.key))
  const managedVariables = variables.filter((variable) => !userVariableKeys.includes(variable.key))

  function renderVariableCard(variable: ProjectVariable, maskableOverride?: boolean) {
    const maskable = maskableOverride ?? isVariablesPanel
    return (
      <VariableEditorCard
        key={variable.id}
        variable={variable}
        editable={isEditingVariable(variable.id)}
        isDraft={isDraftVariable(variable.id)}
        singleEnvCopy={isVariablesPanel}
        maskable={maskable}
        onDelete={deleteVariable}
        onDraftCommit={finalizeDraftVariable}
        onEdit={() => toggleVariableEditing([variable.id])}
        toneOverride={toneOverrides[variable.id]}
        toneStorageKey={toneStorageKey}
        onUpdate={updateVariable}
        valueAriaLabel={valueAriaLabel}
      />
    )
  }

  const actionRow = (
    <div className="field-group-action-row">
      {isVariablesPanel ? (
        <button
          type="button"
          className="secondary-button secondary-button--compact"
          disabled={!envBlock}
          onClick={copyEnvBlock}
          title="Copia tutte le variabili in formato .env"
        >
          <Copy aria-hidden="true" className="button-icon" />
          {envBlockCopied ? 'Copiato' : '.env'}
        </button>
      ) : null}
      <button type="button" className="secondary-button" onClick={addVariable}>
        <Plus aria-hidden="true" className="button-icon" />
        {addLabel}
      </button>
    </div>
  )

  return (
    <div className="tab-panel-stack">
      {actionsSlot ? createPortal(actionRow, actionsSlot) : null}
      <FieldGroup
        className={isBarePanel ? 'field-group--bare' : ''}
        title={isBarePanel ? undefined : title}
        action={actionsSlot ? undefined : actionRow}
      >
        <div className="editable-variable-list">
          {isVariablesPanel ? (
            <>
              <div className="variable-user-box">
                <span className="variable-user-box__title">Da inserire manualmente</span>
                {userVariables.map((variable) => renderVariableCard(variable))}
              </div>
              {managedVariables.length > 0 ? (
                <div className="variable-managed-group">
                  <span className="variable-managed-group__title">Gestite da Agent</span>
                  {managedVariables.map((variable) => renderVariableCard(variable))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="variable-flat-group">
              {(() => {
                const soloFields = variables.filter((_variable, index) => {
                  if (hasGroupedGithubCredentials && (index === githubCredentialsStartIndex || index === githubCredentialsEndIndex)) return false
                  if (hasGroupedDeployCredentials && (index === deployCredentialsStartIndex || index === deployCredentialsEndIndex)) return false
                  return true
                })

                return (
                  <>
                    {soloFields.length > 0 ? (
                      <div className="variable-solo-box">{soloFields.map((variable) => renderVariableCard(variable))}</div>
                    ) : null}
                    {hasGroupedGithubCredentials ? (
                      <div className="variable-group-box variable-group-box--github">
                        {renderVariableCard(variables[githubEmailIndex], false)}
                        {renderVariableCard(variables[githubPasswordIndex], true)}
                      </div>
                    ) : null}
                    {hasGroupedDeployCredentials ? (
                      <div className="variable-group-box variable-group-box--deploy">
                        {renderVariableCard(variables[deployIndex], false)}
                      </div>
                    ) : null}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </FieldGroup>
    </div>
  )
}

function isGithubEmailField(key: string) {
  return key.trim().toLowerCase() === 'mail github'
}

function isGithubPasswordField(key: string) {
  return key.trim().toLowerCase() === 'password'
}
