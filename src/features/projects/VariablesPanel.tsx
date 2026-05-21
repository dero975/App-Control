import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { FieldGroup } from '../../components/FieldGroup'
import { copyToClipboard } from '../../lib/clipboard'
import type { PlatformAccess, ProjectVariable, ProjectVariableTone } from '../../types/app'
import {
  isDeployPasswordField,
  isProjectNameField,
  normalizeProjectName,
} from './projectShared'
import { getSelectValue, selectableFieldConfigs } from './projectFieldOptions'
import { DeployCredentialsCard, DeployLinksCard, GitHubCredentialsCard } from './VariableGroupedCards'
import { VariableEditorCard } from './VariableEditorCard'
import { formatVariablesEnvForCopy, getNextDeployAdminLink, isDeployField, isLinkDeployAdminField, isLinkDeployField } from './variableEnvFormatting'
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
}: {
  addLabel: string
  toneStorageKey?: string
  variables: ProjectVariable[]
  onChange: (variables: ProjectVariable[]) => void
  title: string
  valueAriaLabel: string
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

  function isEditingVariableGroup(ids: string[]) {
    return ids.some((id) => draftVariableIds.has(id) || editingVariableIds.has(id))
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

    if (targetVariable && field === 'value' && isLinkDeployField(targetVariable.key)) {
      const currentAdminVariable = currentVariables.find((variable) => isLinkDeployAdminField(variable.key))
      const nextDeployValue = String(value)

      onChange(
        currentVariables.map((variable) => {
          if (variable.id === id) return { ...variable, value: nextDeployValue }
          if (!currentAdminVariable || variable.id !== currentAdminVariable.id) return variable
          return { ...variable, value: getNextDeployAdminLink(targetVariable.value, nextDeployValue, currentAdminVariable.value) }
        }),
      )
      return
    }

    const nextValue = field === 'value' && targetVariable && isProjectNameField(targetVariable.key) ? normalizeProjectName(String(value)) : value
    if (targetVariable && field === 'key') {
      removeStoredVariableTone(toneStorageKey, targetVariable)
      writeStoredVariableTone(toneStorageKey, { ...targetVariable, key: String(nextValue) }, getEffectiveVariableTone(targetVariable, toneStorageKey, toneOverrides[id]))
    }

    onChange(currentVariables.map((variable) => (variable.id === id ? { ...variable, [field]: nextValue } : variable)))
  }

  function updatePlatformAccess(variableId: string, accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) {
    onChange(
      variables.map((variable) =>
        variable.id === variableId
          ? {
              ...variable,
              accessAccounts: (variable.accessAccounts ?? []).map((access) =>
                access.id === accessId ? { ...access, [field]: value } : access,
              ),
            }
          : variable,
      ),
    )
  }

  function addPlatformAccess(variableId: string) {
    onChange(
      variables.map((variable) => {
        if (variable.id !== variableId) return variable

        return {
          ...variable,
          accessAccounts: [
            ...(variable.accessAccounts ?? []),
            {
              id: `access-${Date.now()}`,
              platform: getSelectValue(variable.value, selectableFieldConfigs['sviluppo in']),
              email: '',
              password: '',
            },
          ],
        }
      }),
    )
  }

  function deletePlatformAccess(variableId: string, accessId: string) {
    onChange(
      variables.map((variable) =>
        variable.id === variableId
          ? { ...variable, accessAccounts: (variable.accessAccounts ?? []).filter((access) => access.id !== accessId) }
          : variable,
      ),
    )
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
  const linkDeployIndex = variables.findIndex((variable) => isLinkDeployField(variable.key))
  const linkDeployAdminIndex =
    linkDeployIndex === -1 ? -1 : variables.findIndex((variable, index) => index > linkDeployIndex && isLinkDeployAdminField(variable.key))
  const hasGroupedDeployLinks = title === 'Variabili' && linkDeployIndex !== -1 && linkDeployAdminIndex !== -1
  const deployLinksStartIndex = hasGroupedDeployLinks ? Math.min(linkDeployIndex, linkDeployAdminIndex) : -1
  const deployLinksEndIndex = hasGroupedDeployLinks ? Math.max(linkDeployIndex, linkDeployAdminIndex) : -1

  return (
    <div className="tab-panel-stack">
      <FieldGroup
        className={isBarePanel ? 'field-group--bare' : ''}
        title={isBarePanel ? undefined : title}
        action={
          <div className="field-group-action-row">
            {isVariablesPanel ? (
              <button
                type="button"
                className="secondary-button secondary-button--compact"
                disabled={!envBlock}
                onClick={copyEnvBlock}
                title="Copia tutte le variabili in formato .env"
              >
                <FileText aria-hidden="true" className="button-icon" />
                {envBlockCopied ? 'Copiato' : '.env render'}
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={addVariable}>
              <Plus aria-hidden="true" className="button-icon" />
              {addLabel}
            </button>
          </div>
        }
      >
        <div className="editable-variable-list">
          {variables.map((variable, index) => {
            if (hasGroupedGithubCredentials && index === githubCredentialsStartIndex) {
              return (
                <GitHubCredentialsCard
                  key="github-credentials"
                  emailVariable={variables[githubEmailIndex]}
                  passwordVariable={variables[githubPasswordIndex]}
                  editable={isEditingVariableGroup([variables[githubEmailIndex].id, variables[githubPasswordIndex].id])}
                  onDelete={deleteVariable}
                  onEdit={() => toggleVariableEditing([variables[githubEmailIndex].id, variables[githubPasswordIndex].id])}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedDeployLinks && index === deployLinksStartIndex) {
              return (
                <DeployLinksCard
                  key="deploy-links"
                  deployLinkVariable={variables[linkDeployIndex]}
                  deployAdminLinkVariable={variables[linkDeployAdminIndex]}
                  editable={isEditingVariableGroup([variables[linkDeployIndex].id, variables[linkDeployAdminIndex].id])}
                  onDelete={deleteVariable}
                  onEdit={() => toggleVariableEditing([variables[linkDeployIndex].id, variables[linkDeployAdminIndex].id])}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedDeployCredentials && index === deployCredentialsStartIndex) {
              return (
                <DeployCredentialsCard
                  key="deploy-credentials"
                  deployVariable={variables[deployIndex]}
                  passwordVariable={variables[deployPasswordIndex]}
                  editable={isEditingVariableGroup([variables[deployIndex].id, variables[deployPasswordIndex].id])}
                  onDelete={deleteVariable}
                  onEdit={() => toggleVariableEditing([variables[deployIndex].id, variables[deployPasswordIndex].id])}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedGithubCredentials && index === githubCredentialsEndIndex) {
              return null
            }

            if (hasGroupedDeployLinks && index === deployLinksEndIndex) {
              return null
            }

            if (hasGroupedDeployCredentials && index === deployCredentialsEndIndex) {
              return null
            }

            return (
              <VariableEditorCard
                key={variable.id}
                variable={variable}
                editable={isEditingVariable(variable.id)}
                isDraft={isDraftVariable(variable.id)}
                onAddAccess={addPlatformAccess}
                onDelete={deleteVariable}
                onDeleteAccess={deletePlatformAccess}
                onDraftCommit={finalizeDraftVariable}
                onEdit={() => toggleVariableEditing([variable.id])}
                toneOverride={toneOverrides[variable.id]}
                toneStorageKey={toneStorageKey}
                onUpdateAccess={updatePlatformAccess}
                onUpdate={updateVariable}
                valueAriaLabel={valueAriaLabel}
              />
            )
          })}
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
